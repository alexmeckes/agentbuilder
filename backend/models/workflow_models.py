"""
Workflow-related model definitions.
"""
from typing import Any, Dict, List
from pydantic import BaseModel


class WorkflowNode(BaseModel):
    """Represents a node in the visual workflow"""
    id: str
    type: str  # 'agent', 'tool', 'input', 'output'
    data: Dict[str, Any]
    position: Dict[str, float]


class WorkflowEdge(BaseModel):
    """Represents an edge (connection) between nodes"""
    id: str
    source: str
    target: str


class WorkflowDefinition(BaseModel):
    """Complete workflow definition from the frontend"""
    nodes: List[WorkflowNode]
    edges: List[WorkflowEdge]