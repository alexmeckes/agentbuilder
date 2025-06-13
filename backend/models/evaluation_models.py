"""
Evaluation-related model definitions.
"""
from typing import List
from pydantic import BaseModel


class CheckpointCriteria(BaseModel):
    """Evaluation checkpoint criteria"""
    points: int
    criteria: str


class GroundTruthAnswer(BaseModel):
    """Ground truth answer for evaluation"""
    name: str
    value: str
    points: int


class NodeCriteria(BaseModel):
    """Evaluation criteria for specific node types"""
    node_type: str  # 'agent', 'tool', 'decision', 'input', 'output', or specific node name
    criteria: List[CheckpointCriteria]


class EvaluationCaseRequest(BaseModel):
    """Request model for creating evaluation cases"""
    llm_judge: str
    checkpoints: List[CheckpointCriteria]
    ground_truth: List[GroundTruthAnswer]
    final_output_criteria: List[CheckpointCriteria] = []
    node_criteria: List[NodeCriteria] = []  # NEW: Node-level evaluation criteria