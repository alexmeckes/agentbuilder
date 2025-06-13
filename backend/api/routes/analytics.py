"""
Analytics and metrics routes.
"""
from typing import Dict, List, Any
from datetime import datetime, timedelta
from fastapi import APIRouter, HTTPException, Request

router = APIRouter(prefix="/api/analytics", tags=["analytics"])

# These will be injected from main.py
executor = None
workflow_store = None


def set_dependencies(exec_instance, store_instance):
    """Set dependencies - called from main.py"""
    global executor, workflow_store
    executor = exec_instance
    workflow_store = store_instance


@router.get("/workflows")
async def get_workflow_analytics(request: Request):
    """Get analytics for workflows with optional filtering"""
    if not workflow_store:
        raise HTTPException(status_code=500, detail="Workflow store not initialized")
    
    # Get query parameters
    user_id = request.query_params.get("userId")
    days = int(request.query_params.get("days", 7))
    workflow_id = request.query_params.get("workflowId")
    
    # Also check headers for user_id (frontend sends it there)
    if not user_id:
        user_id = request.headers.get('x-user-id')
        print(f"📊 Analytics: Got user_id from header: {user_id}")
    
    # Calculate date range
    end_date = datetime.now()
    start_date = end_date - timedelta(days=days)
    
    try:
        # Get analytics from workflow store
        analytics = workflow_store.get_workflow_analytics(
            user_id=user_id,
            start_date=start_date,
            end_date=end_date,
            workflow_id=workflow_id
        )
        
        return analytics
    except Exception as e:
        print(f"Error fetching workflow analytics: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/workflow-topology/{execution_id}")
async def get_workflow_topology(execution_id: str):
    """Get the topology/structure of an executed workflow"""
    if not executor:
        raise HTTPException(status_code=500, detail="Executor not initialized")
    
    execution = executor._get_execution_by_id(execution_id)
    if not execution:
        raise HTTPException(status_code=404, detail="Execution not found")
    
    trace = execution.get("trace", {})
    workflow = execution.get("workflow", {})
    
    return {
        "execution_id": execution_id,
        "nodes": workflow.get("nodes", []),
        "edges": workflow.get("edges", []),
        "execution_path": trace.get("execution_path", []),
        "node_executions": trace.get("node_executions", {})
    }


@router.get("/workflow-steps")
async def get_workflow_steps_analytics(request: Request):
    """Get step-by-step analytics for workflow executions"""
    if not workflow_store:
        raise HTTPException(status_code=500, detail="Workflow store not initialized")
    
    workflow_id = request.query_params.get("workflowId")
    user_id = request.query_params.get("userId")
    limit = int(request.query_params.get("limit", 10))
    
    try:
        # Get recent executions for the workflow
        executions = workflow_store.get_recent_executions(
            workflow_id=workflow_id,
            user_id=user_id,
            limit=limit
        )
        
        step_analytics = []
        for execution in executions:
            trace = execution.get("trace", {})
            steps = trace.get("steps", [])
            
            step_analytics.append({
                "execution_id": execution.get("id"),
                "timestamp": execution.get("created_at"),
                "total_steps": len(steps),
                "total_duration": trace.get("performance", {}).get("total_execution_time", 0),
                "steps": steps
            })
        
        return {
            "workflow_id": workflow_id,
            "executions": step_analytics
        }
        
    except Exception as e:
        print(f"Error fetching workflow step analytics: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/decision-paths")
async def get_decision_path_analytics(request: Request):
    """Analyze decision paths taken in conditional workflows"""
    if not workflow_store:
        raise HTTPException(status_code=500, detail="Workflow store not initialized")
    
    workflow_id = request.query_params.get("workflowId")
    user_id = request.query_params.get("userId")
    days = int(request.query_params.get("days", 30))
    
    # Calculate date range
    end_date = datetime.now()
    start_date = end_date - timedelta(days=days)
    
    try:
        # Get executions with decision nodes
        executions = workflow_store.get_executions_with_decisions(
            workflow_id=workflow_id,
            user_id=user_id,
            start_date=start_date,
            end_date=end_date
        )
        
        decision_paths = {}
        for execution in executions:
            trace = execution.get("trace", {})
            decisions = trace.get("decisions", [])
            
            for decision in decisions:
                node_id = decision.get("node_id")
                path_taken = decision.get("path_taken")
                
                if node_id not in decision_paths:
                    decision_paths[node_id] = {}
                
                if path_taken not in decision_paths[node_id]:
                    decision_paths[node_id][path_taken] = 0
                    
                decision_paths[node_id][path_taken] += 1
        
        return {
            "workflow_id": workflow_id,
            "time_range": {"start": start_date.isoformat(), "end": end_date.isoformat()},
            "decision_paths": decision_paths,
            "total_executions": len(executions)
        }
        
    except Exception as e:
        print(f"Error analyzing decision paths: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/insights")
async def get_analytics_insights(request: Request):
    """Get AI-generated insights from analytics data"""
    if not workflow_store:
        raise HTTPException(status_code=500, detail="Workflow store not initialized")
    
    user_id = request.query_params.get("userId")
    workflow_id = request.query_params.get("workflowId")
    
    try:
        # Get various analytics data
        analytics_data = workflow_store.get_comprehensive_analytics(
            user_id=user_id,
            workflow_id=workflow_id
        )
        
        # Generate insights (placeholder - could integrate with AI)
        insights = {
            "performance_trends": _analyze_performance_trends(analytics_data),
            "cost_optimization": _analyze_cost_patterns(analytics_data),
            "error_patterns": _analyze_error_patterns(analytics_data),
            "usage_patterns": _analyze_usage_patterns(analytics_data)
        }
        
        return insights
        
    except Exception as e:
        print(f"Error generating analytics insights: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/performance")
async def get_performance_analytics(request: Request):
    """Get detailed performance analytics"""
    if not workflow_store:
        raise HTTPException(status_code=500, detail="Workflow store not initialized")
    
    user_id = request.query_params.get("userId")
    workflow_id = request.query_params.get("workflowId")
    days = int(request.query_params.get("days", 7))
    
    # Calculate date range
    end_date = datetime.now()
    start_date = end_date - timedelta(days=days)
    
    try:
        performance_data = workflow_store.get_performance_metrics(
            user_id=user_id,
            workflow_id=workflow_id,
            start_date=start_date,
            end_date=end_date
        )
        
        return performance_data
        
    except Exception as e:
        print(f"Error fetching performance analytics: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# Helper functions for analytics
def _analyze_performance_trends(data: Dict[str, Any]) -> Dict[str, Any]:
    """Analyze performance trends from analytics data"""
    # Placeholder implementation
    return {
        "trend": "improving",
        "average_execution_time": 5.2,
        "recommendation": "Consider caching frequent API calls"
    }


def _analyze_cost_patterns(data: Dict[str, Any]) -> Dict[str, Any]:
    """Analyze cost patterns from analytics data"""
    # Placeholder implementation
    return {
        "total_cost": 12.50,
        "cost_per_execution": 0.25,
        "high_cost_nodes": []
    }


def _analyze_error_patterns(data: Dict[str, Any]) -> Dict[str, Any]:
    """Analyze error patterns from analytics data"""
    # Placeholder implementation
    return {
        "error_rate": 0.05,
        "common_errors": [],
        "recommendations": []
    }


def _analyze_usage_patterns(data: Dict[str, Any]) -> Dict[str, Any]:
    """Analyze usage patterns from analytics data"""
    # Placeholder implementation
    return {
        "peak_hours": [14, 15, 16],
        "most_used_workflows": [],
        "user_growth": "stable"
    }