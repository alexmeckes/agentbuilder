"""
General and miscellaneous routes.
"""
from typing import List
from fastapi import APIRouter, Request
from fastapi.responses import StreamingResponse

router = APIRouter(tags=["general"])


@router.get("/")
async def root():
    """Root endpoint - health check"""
    return {
        "status": "healthy",
        "service": "any-agent Workflow Composer Backend",
        "version": "1.0.0"
    }


@router.get("/frameworks")
async def list_frameworks():
    """List available AI frameworks"""
    frameworks = [
        {
            "id": "openai",
            "name": "OpenAI",
            "models": ["gpt-4", "gpt-3.5-turbo"],
            "description": "OpenAI's GPT models"
        },
        {
            "id": "anthropic",
            "name": "Anthropic",
            "models": ["claude-3-opus", "claude-3-sonnet", "claude-3-haiku"],
            "description": "Anthropic's Claude models"
        },
        {
            "id": "google",
            "name": "Google",
            "models": ["gemini-pro"],
            "description": "Google's Gemini models"
        },
        {
            "id": "local",
            "name": "Local Models",
            "models": ["llama2", "mistral"],
            "description": "Locally hosted open-source models"
        }
    ]
    return {"frameworks": frameworks}


@router.get("/traces")
async def get_traces(request: Request):
    """Get execution traces with filtering"""
    # Query parameters
    user_id = request.query_params.get("userId")
    workflow_id = request.query_params.get("workflowId")
    limit = int(request.query_params.get("limit", 50))
    
    # TODO: Implement trace retrieval from storage
    # For now, return empty list
    return {
        "traces": [],
        "total": 0,
        "filters": {
            "user_id": user_id,
            "workflow_id": workflow_id,
            "limit": limit
        }
    }


@router.get("/traces/{trace_id}")
async def get_trace_details(trace_id: str):
    """Get detailed information about a specific trace"""
    # TODO: Implement trace detail retrieval
    return {
        "trace_id": trace_id,
        "status": "not_found",
        "message": "Trace retrieval not yet implemented"
    }