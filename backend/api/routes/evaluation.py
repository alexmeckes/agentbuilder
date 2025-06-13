"""
Evaluation and testing routes.
"""
import json
import os
import uuid
from typing import Dict, List, Any
from datetime import datetime
from fastapi import APIRouter, HTTPException, Request

from models import EvaluationCaseRequest
from lightweight_evaluation import evaluate_workflow_output
from enhanced_workflow_evaluation import evaluate_end_to_end_workflow, WorkflowEvaluationResult

router = APIRouter(prefix="/api/evaluations", tags=["evaluation"])

# Storage paths
EVALUATION_CASES_FILE = "evaluation_cases.json"
EVALUATION_RUNS_FILE = "evaluation_runs.json"

# These will be injected from main.py
executor = None


def set_executor(exec_instance):
    """Set the executor instance - called from main.py"""
    global executor
    executor = exec_instance


def _load_evaluation_cases():
    """Load evaluation cases from storage"""
    if os.path.exists(EVALUATION_CASES_FILE):
        with open(EVALUATION_CASES_FILE, 'r') as f:
            return json.load(f)
    return []


def _save_evaluation_cases(cases):
    """Save evaluation cases to storage"""
    with open(EVALUATION_CASES_FILE, 'w') as f:
        json.dump(cases, f, indent=2)


def _load_evaluation_runs():
    """Load evaluation runs from storage"""
    if os.path.exists(EVALUATION_RUNS_FILE):
        with open(EVALUATION_RUNS_FILE, 'r') as f:
            return json.load(f)
    return []


def _save_evaluation_runs(runs):
    """Save evaluation runs to storage"""
    with open(EVALUATION_RUNS_FILE, 'w') as f:
        json.dump(runs, f, indent=2)


@router.get("/cases")
async def get_evaluation_cases():
    """Get all saved evaluation cases"""
    try:
        cases = _load_evaluation_cases()
        return {"cases": cases}
    except Exception as e:
        print(f"Error loading evaluation cases: {e}")
        return {"cases": []}


@router.post("/cases")
async def save_evaluation_case(evaluation_case: EvaluationCaseRequest):
    """Save a new evaluation case"""
    try:
        cases = _load_evaluation_cases()
        
        # Create case object with timestamp and ID
        case = {
            "id": str(uuid.uuid4()),
            "created_at": datetime.now().isoformat(),
            "llm_judge": evaluation_case.llm_judge,
            "checkpoints": [cp.dict() for cp in evaluation_case.checkpoints],
            "ground_truth": [gt.dict() for gt in evaluation_case.ground_truth],
            "final_output_criteria": [fc.dict() for fc in evaluation_case.final_output_criteria],
            "node_criteria": [nc.dict() for nc in evaluation_case.node_criteria]
        }
        
        cases.append(case)
        _save_evaluation_cases(cases)
        
        return {"success": True, "case_id": case["id"]}
    except Exception as e:
        print(f"Error saving evaluation case: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/runs")
async def get_evaluation_runs():
    """Get all evaluation runs"""
    try:
        runs = _load_evaluation_runs()
        return {"runs": runs}
    except Exception as e:
        print(f"Error loading evaluation runs: {e}")
        return {"runs": []}


@router.get("/runs/{run_id}/progress")
async def get_evaluation_progress(run_id: str):
    """Get progress for a specific evaluation run"""
    try:
        runs = _load_evaluation_runs()
        run = next((r for r in runs if r.get("id") == run_id), None)
        
        if not run:
            raise HTTPException(status_code=404, detail="Evaluation run not found")
        
        return {
            "run_id": run_id,
            "status": run.get("status", "unknown"),
            "progress": run.get("progress", 0),
            "current_step": run.get("current_step", ""),
            "results": run.get("results", {})
        }
    except Exception as e:
        print(f"Error getting evaluation progress: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/metrics")
async def get_evaluation_metrics():
    """Get aggregated evaluation metrics"""
    try:
        runs = _load_evaluation_runs()
        
        # Calculate metrics
        total_runs = len(runs)
        completed_runs = len([r for r in runs if r.get("status") == "completed"])
        failed_runs = len([r for r in runs if r.get("status") == "failed"])
        
        # Calculate average scores for completed runs
        scores = []
        for run in runs:
            if run.get("status") == "completed" and "results" in run:
                if "total_score" in run["results"]:
                    scores.append(run["results"]["total_score"])
        
        avg_score = sum(scores) / len(scores) if scores else 0
        
        return {
            "total_runs": total_runs,
            "completed_runs": completed_runs,
            "failed_runs": failed_runs,
            "average_score": avg_score,
            "success_rate": completed_runs / total_runs if total_runs > 0 else 0
        }
    except Exception as e:
        print(f"Error calculating evaluation metrics: {e}")
        return {
            "total_runs": 0,
            "completed_runs": 0,
            "failed_runs": 0,
            "average_score": 0,
            "success_rate": 0
        }


@router.post("/run-enhanced")
async def run_enhanced_workflow_evaluation(request: dict):
    """Run enhanced end-to-end workflow evaluation"""
    workflow = request.get("workflow", {})
    test_cases = request.get("test_cases", [])
    evaluation_config = request.get("evaluation_config", {})
    
    try:
        # Create evaluation run record
        run_id = str(uuid.uuid4())
        run = {
            "id": run_id,
            "created_at": datetime.now().isoformat(),
            "status": "running",
            "progress": 0,
            "workflow_id": workflow.get("id", "unknown"),
            "test_case_count": len(test_cases)
        }
        
        runs = _load_evaluation_runs()
        runs.append(run)
        _save_evaluation_runs(runs)
        
        # Run the evaluation
        result = await evaluate_end_to_end_workflow(
            workflow=workflow,
            test_cases=test_cases,
            evaluation_config=evaluation_config
        )
        
        # Update run with results
        run["status"] = "completed"
        run["progress"] = 100
        run["completed_at"] = datetime.now().isoformat()
        run["results"] = result.dict() if hasattr(result, 'dict') else result
        
        _save_evaluation_runs(runs)
        
        return {
            "run_id": run_id,
            "status": "completed",
            "result": result
        }
        
    except Exception as e:
        print(f"Error in enhanced workflow evaluation: {e}")
        
        # Update run as failed
        if 'run' in locals():
            run["status"] = "failed"
            run["error"] = str(e)
            _save_evaluation_runs(runs)
        
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/run")
async def run_evaluation(request: dict):
    """Run lightweight workflow evaluation"""
    execution_id = request.get("execution_id")
    evaluation_criteria = request.get("evaluation_criteria", {})
    
    if not execution_id:
        raise HTTPException(status_code=400, detail="execution_id is required")
    
    # Get execution from executor
    if not executor:
        raise HTTPException(status_code=500, detail="Executor not initialized")
    
    execution = executor._get_execution_by_id(execution_id)
    if not execution:
        raise HTTPException(status_code=404, detail="Execution not found")
    
    # Get the output to evaluate
    output = execution.get("result", "")
    trace = execution.get("trace", {})
    
    try:
        # Run evaluation
        evaluation_result = await evaluate_workflow_output(
            output=output,
            trace=trace,
            evaluation_criteria=evaluation_criteria
        )
        
        return {
            "execution_id": execution_id,
            "evaluation": evaluation_result
        }
    except Exception as e:
        print(f"Error running evaluation: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/path-comparison")
async def compare_execution_paths(request: dict):
    """Compare execution paths between different workflow runs"""
    execution_ids = request.get("execution_ids", [])
    
    if len(execution_ids) < 2:
        raise HTTPException(status_code=400, detail="At least 2 execution IDs required")
    
    if not executor:
        raise HTTPException(status_code=500, detail="Executor not initialized")
    
    try:
        comparisons = []
        
        for exec_id in execution_ids:
            execution = executor._get_execution_by_id(exec_id)
            if not execution:
                continue
                
            trace = execution.get("trace", {})
            
            comparisons.append({
                "execution_id": exec_id,
                "workflow_name": execution.get("workflow_name", "Unknown"),
                "status": execution.get("status"),
                "execution_time": execution.get("execution_time"),
                "cost": trace.get("cost_info", {}).get("total_cost", 0),
                "steps": len(trace.get("steps", [])),
                "final_output": trace.get("final_output", execution.get("result"))
            })
        
        return {
            "comparisons": comparisons,
            "execution_count": len(comparisons)
        }
        
    except Exception as e:
        print(f"Error comparing execution paths: {e}")
        raise HTTPException(status_code=500, detail=str(e))