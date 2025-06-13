"""
A/B testing and experiment routes.
"""
import json
import os
import uuid
from datetime import datetime
from typing import Dict, List, Any
from fastapi import APIRouter, HTTPException

router = APIRouter(prefix="/api/experiments", tags=["experiments"])

# Storage for experiments
EXPERIMENTS_FILE = "experiments.json"

# Dependencies
executor = None


def set_executor(exec_instance):
    """Set the executor instance - called from main.py"""
    global executor
    executor = exec_instance


def _load_experiments():
    """Load experiments from storage"""
    if os.path.exists(EXPERIMENTS_FILE):
        with open(EXPERIMENTS_FILE, 'r') as f:
            return json.load(f)
    return []


def _save_experiments(experiments):
    """Save experiments to storage"""
    with open(EXPERIMENTS_FILE, 'w') as f:
        json.dump(experiments, f, indent=2)


@router.get("")
async def get_experiments():
    """Get all experiments"""
    try:
        experiments = _load_experiments()
        return {"experiments": experiments}
    except Exception as e:
        print(f"Error loading experiments: {e}")
        return {"experiments": []}


@router.post("")
async def create_experiment(request: dict):
    """Create a new A/B test experiment"""
    try:
        experiments = _load_experiments()
        
        experiment = {
            "id": str(uuid.uuid4()),
            "created_at": datetime.now().isoformat(),
            "name": request.get("name", "Untitled Experiment"),
            "description": request.get("description", ""),
            "status": "draft",
            "variants": request.get("variants", []),
            "metrics": request.get("metrics", []),
            "traffic_split": request.get("traffic_split", {}),
            "results": {}
        }
        
        experiments.append(experiment)
        _save_experiments(experiments)
        
        return {"success": True, "experiment": experiment}
    except Exception as e:
        print(f"Error creating experiment: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{experiment_id}")
async def get_experiment(experiment_id: str):
    """Get a specific experiment"""
    try:
        experiments = _load_experiments()
        experiment = next((e for e in experiments if e["id"] == experiment_id), None)
        
        if not experiment:
            raise HTTPException(status_code=404, detail="Experiment not found")
        
        return experiment
    except Exception as e:
        print(f"Error getting experiment: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{experiment_id}/run")
async def run_experiment(experiment_id: str, request: dict = None):
    """Start running an experiment"""
    if not executor:
        raise HTTPException(status_code=500, detail="Executor not initialized")
    
    try:
        experiments = _load_experiments()
        experiment = next((e for e in experiments if e["id"] == experiment_id), None)
        
        if not experiment:
            raise HTTPException(status_code=404, detail="Experiment not found")
        
        # Update experiment status
        experiment["status"] = "running"
        experiment["started_at"] = datetime.now().isoformat()
        
        _save_experiments(experiments)
        
        # TODO: Implement actual experiment execution logic
        # This would involve running variants and collecting metrics
        
        return {"success": True, "message": "Experiment started"}
    except Exception as e:
        print(f"Error running experiment: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{experiment_id}/status")
async def get_experiment_status(experiment_id: str):
    """Get the current status of an experiment"""
    try:
        experiments = _load_experiments()
        experiment = next((e for e in experiments if e["id"] == experiment_id), None)
        
        if not experiment:
            raise HTTPException(status_code=404, detail="Experiment not found")
        
        return {
            "experiment_id": experiment_id,
            "status": experiment.get("status", "unknown"),
            "started_at": experiment.get("started_at"),
            "completed_at": experiment.get("completed_at"),
            "progress": experiment.get("progress", 0)
        }
    except Exception as e:
        print(f"Error getting experiment status: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{experiment_id}/results")
async def get_experiment_results(experiment_id: str):
    """Get results of a completed experiment"""
    try:
        experiments = _load_experiments()
        experiment = next((e for e in experiments if e["id"] == experiment_id), None)
        
        if not experiment:
            raise HTTPException(status_code=404, detail="Experiment not found")
        
        if experiment.get("status") != "completed":
            return {
                "experiment_id": experiment_id,
                "status": experiment.get("status"),
                "message": "Experiment not yet completed"
            }
        
        return {
            "experiment_id": experiment_id,
            "results": experiment.get("results", {}),
            "winner": experiment.get("winner"),
            "confidence_level": experiment.get("confidence_level", 0)
        }
    except Exception as e:
        print(f"Error getting experiment results: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{experiment_id}")
async def delete_experiment(experiment_id: str):
    """Delete an experiment"""
    try:
        experiments = _load_experiments()
        experiments = [e for e in experiments if e["id"] != experiment_id]
        _save_experiments(experiments)
        
        return {"success": True, "message": "Experiment deleted"}
    except Exception as e:
        print(f"Error deleting experiment: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{experiment_id}/cancel")
async def cancel_experiment(experiment_id: str):
    """Cancel a running experiment"""
    try:
        experiments = _load_experiments()
        experiment = next((e for e in experiments if e["id"] == experiment_id), None)
        
        if not experiment:
            raise HTTPException(status_code=404, detail="Experiment not found")
        
        experiment["status"] = "cancelled"
        experiment["cancelled_at"] = datetime.now().isoformat()
        
        _save_experiments(experiments)
        
        return {"success": True, "message": "Experiment cancelled"}
    except Exception as e:
        print(f"Error cancelling experiment: {e}")
        raise HTTPException(status_code=500, detail=str(e))