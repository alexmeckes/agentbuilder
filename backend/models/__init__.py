"""
Model definitions for the any-agent backend.
"""

from .workflow_models import (
    WorkflowNode,
    WorkflowEdge,
    WorkflowDefinition
)

from .execution_models import (
    ExecutionRequest,
    ExecutionResponse,
    UserInputRequest
)

from .evaluation_models import (
    CheckpointCriteria,
    GroundTruthAnswer,
    NodeCriteria,
    EvaluationCaseRequest
)

__all__ = [
    'WorkflowNode',
    'WorkflowEdge',
    'WorkflowDefinition',
    'ExecutionRequest',
    'ExecutionResponse',
    'UserInputRequest',
    'CheckpointCriteria',
    'GroundTruthAnswer',
    'NodeCriteria',
    'EvaluationCaseRequest'
]