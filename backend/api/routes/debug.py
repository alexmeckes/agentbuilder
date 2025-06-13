"""
Debug and development routes.
"""
import uuid
from datetime import datetime
from fastapi import APIRouter, HTTPException, Request

router = APIRouter(prefix="/api/debug", tags=["debug"])

# Dependencies
executor = None
workflow_store = None


def set_executor(exec_instance):
    """Set the executor instance - called from main.py"""
    global executor
    executor = exec_instance


def set_workflow_store(store_instance):
    """Set the workflow store instance - called from main.py"""
    global workflow_store
    workflow_store = store_instance


@router.get("/workflow-store-state")
async def get_workflow_store_state():
    """Get current state of the workflow store for debugging"""
    if not workflow_store:
        return {"error": "WorkflowStore not initialized"}
    
    return {
        "total_executions": len(workflow_store.executions),
        "executions": [
            {
                "execution_id": e.get("execution_id"),
                "user_id": e.get("user_id"),
                "status": e.get("status"),
                "created_at": e.get("created_at"),
                "workflow_name": e.get("workflow_name")
            }
            for e in workflow_store.executions[-10:]  # Last 10 executions
        ],
        "workflow_store_id": id(workflow_store),
        "executor_store_id": id(executor.workflow_store) if executor and hasattr(executor, "workflow_store") else None,
        "stores_match": id(workflow_store) == id(executor.workflow_store) if executor and hasattr(executor, "workflow_store") else False
    }


@router.post("/test-executions")
async def create_test_executions():
    """Create test executions for development"""
    if not executor:
        raise HTTPException(status_code=500, detail="Executor not initialized")
    
    test_executions = []
    
    # Create a few test executions
    for i in range(3):
        exec_id = f"exec_test_{uuid.uuid4().hex[:8]}"
        execution = {
            "id": exec_id,
            "status": ["completed", "failed", "running"][i % 3],
            "created_at": datetime.now().timestamp(),
            "workflow_name": f"Test Workflow {i+1}",
            "result": f"Test result {i+1}" if i % 3 == 0 else None,
            "error": "Test error" if i % 3 == 1 else None,
            "trace": {
                "steps": [{"name": f"Step {j+1}"} for j in range(3)],
                "cost_info": {"total_cost": 0.01 * (i+1)},
                "performance": {"total_execution_time": 1.5 * (i+1)}
            }
        }
        
        # Add to executor storage
        executor._add_execution("test_user", exec_id, execution)
        test_executions.append(exec_id)
    
    return {
        "success": True,
        "message": f"Created {len(test_executions)} test executions",
        "execution_ids": test_executions
    }


@router.delete("/test-executions")
async def clear_test_executions():
    """Clear all test executions"""
    if not executor:
        raise HTTPException(status_code=500, detail="Executor not initialized")
    
    # Clear test user executions
    if "test_user" in executor.user_executions:
        count = len(executor.user_executions["test_user"])
        executor.user_executions["test_user"] = {}
        return {"success": True, "message": f"Cleared {count} test executions"}
    
    return {"success": True, "message": "No test executions to clear"}


@router.get("/user-executions")
async def debug_user_executions():
    """Debug endpoint to view user execution storage"""
    if not executor:
        raise HTTPException(status_code=500, detail="Executor not initialized")
    
    summary = {}
    for user_id, executions in executor.user_executions.items():
        summary[user_id] = {
            "execution_count": len(executions),
            "execution_ids": list(executions.keys())[:10]  # First 10 only
        }
    
    return {
        "total_users": len(executor.user_executions),
        "user_summaries": summary,
        "memory_settings": {
            "max_executions_per_user": executor.max_executions_per_user,
            "execution_ttl_hours": executor.execution_ttl_hours
        }
    }


@router.post("/migrate-anonymous-executions")
async def migrate_anonymous_executions(request: Request):
    """Migrate anonymous executions to a specific user"""
    if not executor:
        raise HTTPException(status_code=500, detail="Executor not initialized")
    
    data = await request.json()
    target_user_id = data.get("user_id")
    
    if not target_user_id:
        raise HTTPException(status_code=400, detail="user_id is required")
    
    # Get anonymous executions
    anon_executions = executor.user_executions.get("anonymous", {})
    if not anon_executions:
        return {"success": True, "message": "No anonymous executions to migrate"}
    
    # Get or create target user executions
    if target_user_id not in executor.user_executions:
        executor.user_executions[target_user_id] = {}
    
    # Migrate executions
    migrated_count = 0
    for exec_id, execution in anon_executions.items():
        # Update execution ID to include user ID
        new_exec_id = f"exec_{target_user_id}_{exec_id.split('_')[-1]}"
        execution["migrated_from"] = exec_id
        executor.user_executions[target_user_id][new_exec_id] = execution
        migrated_count += 1
    
    # Clear anonymous executions
    executor.user_executions["anonymous"] = {}
    
    return {
        "success": True,
        "message": f"Migrated {migrated_count} executions to user {target_user_id}"
    }


@router.get("/analytics-cost-data")
async def debug_analytics_cost_data():
    """Debug endpoint to check analytics cost calculations"""
    if not executor:
        raise HTTPException(status_code=500, detail="Executor not initialized")
    
    cost_summary = {}
    
    for user_id, executions in executor.user_executions.items():
        user_costs = []
        for exec_id, execution in executions.items():
            trace = execution.get("trace", {})
            cost_info = trace.get("cost_info", {})
            if cost_info.get("total_cost", 0) > 0:
                user_costs.append({
                    "execution_id": exec_id,
                    "total_cost": cost_info.get("total_cost"),
                    "model_costs": cost_info.get("model_costs", {})
                })
        
        if user_costs:
            cost_summary[user_id] = {
                "execution_count": len(user_costs),
                "total_cost": sum(c["total_cost"] for c in user_costs),
                "sample_costs": user_costs[:3]  # First 3 only
            }
    
    return {
        "users_with_costs": len(cost_summary),
        "cost_summary": cost_summary
    }


@router.get("/workflow-store-state")
async def debug_workflow_store_state():
    """Debug endpoint to inspect WorkflowStore state"""
    if not workflow_store:
        raise HTTPException(status_code=500, detail="WorkflowStore not initialized")
    
    # Get analytics to trigger the same query as the UI
    analytics = workflow_store.get_workflow_analytics()
    
    return {
        "workflow_store_instance": str(workflow_store),
        "workflow_store_id": id(workflow_store),
        "total_executions_in_memory": len(workflow_store.executions),
        "sample_executions": workflow_store.executions[:5] if workflow_store.executions else [],
        "analytics_result": analytics,
        "executor_store_reference": {
            "has_reference": executor.workflow_store is not None if executor else False,
            "same_instance": executor.workflow_store is workflow_store if executor and executor.workflow_store else False,
            "executor_store_id": id(executor.workflow_store) if executor and executor.workflow_store else None
        }
    }