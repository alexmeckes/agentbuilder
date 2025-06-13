"""
Execution-related model definitions.
"""
from typing import Any, Dict, Optional
from pydantic import BaseModel

from .workflow_models import WorkflowDefinition


class ExecutionRequest(BaseModel):
    """Request to execute a workflow"""
    workflow: WorkflowDefinition
    input_data: str
    framework: str = "openai"  # Default to OpenAI
    workflow_identity: Optional[Dict[str, Any]] = None  # Frontend workflow identity
    workflow_name: Optional[str] = None  # Frontend workflow name
    workflow_id: Optional[str] = None  # Frontend workflow ID
    user_context: Optional[Dict[str, Any]] = None  # User context with user_id


class ExecutionResponse(BaseModel):
    """Response from workflow execution"""
    execution_id: str
    status: str
    result: Optional[str] = None
    trace: Optional[Dict[str, Any]] = None
    error: Optional[str] = None


class UserInputRequest(BaseModel):
    """Request model for user input during workflow execution"""
    execution_id: str
    input_text: str