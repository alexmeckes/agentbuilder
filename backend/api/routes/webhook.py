"""
Webhook management routes.
"""
from typing import Dict, Any
from fastapi import APIRouter, HTTPException

from models import WorkflowDefinition

router = APIRouter(tags=["webhooks"])

# Dependencies
executor = None


def set_executor(exec_instance):
    """Set the executor instance - called from main.py"""
    global executor
    executor = exec_instance


@router.post("/api/webhooks/register")
async def register_webhook_endpoint(workflow: WorkflowDefinition):
    """Register a webhook that will trigger a workflow"""
    if not executor:
        raise HTTPException(status_code=500, detail="Executor not initialized")
    
    try:
        result = await executor.register_webhook(workflow)
        return result
    except Exception as e:
        print(f"Error registering webhook: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/webhooks/trigger/{webhook_id}")
async def trigger_webhook_endpoint(webhook_id: str, request_body: Dict[str, Any]):
    """Trigger a workflow via webhook"""
    if not executor:
        raise HTTPException(status_code=500, detail="Executor not initialized")
    
    try:
        result = await executor.trigger_webhook(webhook_id, request_body)
        return result
    except Exception as e:
        print(f"Error triggering webhook: {e}")
        if hasattr(e, "status_code") and e.status_code == 404:
            raise e
        raise HTTPException(status_code=500, detail=str(e))