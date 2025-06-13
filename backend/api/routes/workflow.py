"""
Workflow execution and management routes.
"""
from typing import Dict, Any
from fastapi import APIRouter, HTTPException, WebSocket, WebSocketDisconnect, Request
from fastapi.responses import StreamingResponse

from models import ExecutionRequest, ExecutionResponse, UserInputRequest

router = APIRouter(prefix="/api", tags=["workflow"])


# These will be injected from main.py
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


@router.post("/execute", response_model=ExecutionResponse)
async def execute_workflow(request: ExecutionRequest, http_request: Request):
    """Execute a workflow using any-agent"""
    if not executor:
        raise HTTPException(status_code=500, detail="Executor not initialized")
    
    # Extract user ID from headers and add to request
    user_id = http_request.headers.get("x-user-id", "anonymous")
    if not request.user_context:
        request.user_context = {}
    request.user_context["user_id"] = user_id
    
    print(f"📊 Execute workflow request from user: {user_id}")
    
    return await executor.execute_workflow(request)


@router.post("/executions/{execution_id}/input")
async def submit_user_input(execution_id: str, input_request: UserInputRequest):
    """Submit user input for a workflow execution that's waiting for input"""
    if not executor:
        raise HTTPException(status_code=500, detail="Executor not initialized")
    try:
        result = await executor.provide_user_input(execution_id, input_request.input_text)
        return result
    except Exception as e:
        print(f"❌ Error handling user input submission: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/executions/{execution_id}")
async def get_execution(execution_id: str):
    """Get execution details by ID"""
    if not executor:
        raise HTTPException(status_code=500, detail="Executor not initialized")
    
    execution = executor._get_execution_by_id(execution_id)
    if not execution:
        raise HTTPException(status_code=404, detail="Execution not found")
    
    # Return the same JSON-safe structure as WebSocket for consistency
    return {
        "execution_id": execution_id,
        "status": execution.get("status"),
        "progress": execution.get("progress", {}),
        "result": execution.get("result"),
        "error": execution.get("error"),
        "created_at": execution.get("created_at"),
        "completed_at": execution.get("completed_at"),
        "execution_time": execution.get("execution_time"),
        "workflow_name": execution.get("workflow_name"),
        "workflow_category": execution.get("workflow_category"),
        "workflow_description": execution.get("workflow_description"),
        "framework": execution.get("framework"),
        # Include workflow identity for frontend display
        "workflow_identity": execution.get("workflow_identity", {}),
        "workflow_id": execution.get("workflow_identity", {}).get("id") if execution.get("workflow_identity") else None,
        # Include trace data for cost/performance info (JSON-safe version)
        "trace": {
            "final_output": execution.get("trace", {}).get("final_output") if execution.get("trace") else execution.get("result"),
            "cost_info": execution.get("trace", {}).get("cost_info", {}),
            "performance": execution.get("trace", {}).get("performance", {}),
            "framework_used": execution.get("trace", {}).get("framework_used", execution.get("framework", "openai"))
        } if execution.get("trace") else None
    }


@router.get("/executions/{execution_id}/trace")
async def get_execution_trace(execution_id: str):
    """Get execution trace by ID"""
    if not executor:
        raise HTTPException(status_code=500, detail="Executor not initialized")
    
    execution = executor._get_execution_by_id(execution_id)
    if not execution:
        raise HTTPException(status_code=404, detail="Execution not found")
    
    trace = execution.get("trace", {})
    if not trace:
        return {
            "execution_id": execution_id,
            "trace": None,
            "message": "No trace available for this execution"
        }
    
    return {
        "execution_id": execution_id,
        "trace": trace
    }


@router.get("/executions/{execution_id}/performance")
async def get_execution_performance(execution_id: str):
    """Get performance metrics for an execution"""
    if not executor:
        raise HTTPException(status_code=500, detail="Executor not initialized")
    
    execution = executor._get_execution_by_id(execution_id)
    if not execution:
        raise HTTPException(status_code=404, detail="Execution not found")
    
    trace = execution.get("trace", {})
    performance = trace.get("performance", {})
    
    return {
        "execution_id": execution_id,
        "performance": performance,
        "cost_info": trace.get("cost_info", {}),
        "framework_used": trace.get("framework_used", execution.get("framework", "openai"))
    }


@router.websocket("/ws/execution/{execution_id}")
async def websocket_execution_status(websocket: WebSocket, execution_id: str):
    """WebSocket endpoint for real-time execution status updates"""
    if not executor:
        await websocket.close(code=1011, reason="Executor not initialized")
        return
    
    await websocket.accept()
    
    # Store the websocket connection
    executor.websocket_connections[execution_id] = websocket
    
    try:
        # Send initial status
        execution = executor._get_execution_by_id(execution_id)
        if execution:
            await websocket.send_json({
                "type": "status",
                "status": execution.get("status", "unknown"),
                "result": execution.get("result"),
                "error": execution.get("error"),
                "progress": execution.get("progress", {})
            })
        
        # Keep connection open for updates
        while True:
            try:
                # Wait for any message from client (heartbeat)
                await websocket.receive_text()
            except WebSocketDisconnect:
                break
                
    except Exception as e:
        print(f"WebSocket error: {e}")
    finally:
        # Clean up connection
        if execution_id in executor.websocket_connections:
            del executor.websocket_connections[execution_id]


# Workflow-related analytics routes (keeping them here as they're tightly coupled)
@router.post("/analytics/enhance-workflow-name")
async def enhance_workflow_name(request: dict):
    """Generate an enhanced workflow name based on node information"""
    from ai_workflow_refiner import enhance_workflow_name as ai_enhance_name
    
    node_data = request.get("node_data", {})
    original_name = request.get("original_name", "")
    
    try:
        enhanced_name = await ai_enhance_name(node_data, original_name)
        return {"enhanced_name": enhanced_name}
    except Exception as e:
        print(f"Error enhancing workflow name: {e}")
        # Return original name on error
        return {"enhanced_name": original_name or "Untitled Workflow"}


@router.post("/ai/refine-workflow")
async def refine_workflow(request: dict):
    """AI-powered workflow refinement endpoint"""
    from ai_workflow_refiner import generate_workflow_actions, apply_actions
    
    workflow = request.get("workflow", {})
    refinement_type = request.get("refinement_type", "optimize")
    custom_prompt = request.get("custom_prompt", "")
    
    try:
        # Generate refinement actions
        actions = await generate_workflow_actions(workflow, refinement_type, custom_prompt)
        
        # Apply actions to get refined workflow
        refined_workflow = apply_actions(workflow, actions)
        
        return {
            "success": True,
            "refined_workflow": refined_workflow,
            "actions": actions,
            "summary": f"Applied {len(actions)} refinements to the workflow"
        }
    except Exception as e:
        print(f"Error refining workflow: {e}")
        import traceback
        traceback.print_exc()
        return {
            "success": False,
            "error": str(e),
            "refined_workflow": workflow,  # Return original on error
            "actions": []
        }