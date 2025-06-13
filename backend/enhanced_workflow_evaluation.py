"""
Enhanced End-to-End Workflow Evaluation System

This module extends the existing evaluation system to provide:
1. Step-by-step evaluation of individual workflow nodes
2. Flow evaluation between steps
3. Comprehensive workflow performance analysis

IMPORTANT: This enhances existing functionality without breaking it.
"""

from typing import Dict, List, Any, Optional
from dataclasses import dataclass
from lightweight_evaluation import evaluate_workflow_output, EvaluationResult


@dataclass
class StepEvaluationResult:
    """Evaluation result for an individual workflow step"""
    step_name: str
    node_id: str
    step_input: str
    step_output: str
    evaluation_results: List[EvaluationResult]
    step_score: float
    duration_ms: float
    cost: float


@dataclass
class FlowEvaluationResult:
    """Evaluation of how well workflow steps connect and flow"""
    flow_coherence: float  # 0-1: How logically connected steps are
    information_preservation: float  # 0-1: How well data flows between steps
    efficiency: float  # 0-1: Absence of unnecessary redundancy
    transition_quality: List[Dict[str, Any]]  # Evaluation of each step transition


@dataclass
class WorkflowEvaluationResult:
    """Comprehensive end-to-end workflow evaluation"""
    execution_id: str
    
    # EXISTING: Overall workflow evaluation (enhanced)
    final_output_evaluation: Dict[str, Any]
    
    # NEW: Step-by-step breakdown
    step_evaluations: List[StepEvaluationResult]
    flow_evaluation: FlowEvaluationResult
    
    # NEW: Comprehensive scoring
    overall_score: float
    step_scores: List[float]
    bottleneck_analysis: List[str]
    
    # Performance metrics
    total_duration_ms: float
    total_cost: float
    efficiency_score: float


def evaluate_workflow_step(
    span: Dict[str, Any],
    step_criteria: List[Dict[str, Any]],
    model: str = "gpt-4o-mini"
) -> StepEvaluationResult:
    """
    Evaluate an individual workflow step using LLM as judge
    
    Args:
        span: Trace span representing a workflow step
        step_criteria: Evaluation criteria specific to this step type
        model: LLM model to use for evaluation
        
    Returns:
        StepEvaluationResult with detailed evaluation
    """
    attributes = span.get("attributes", {})
    
    # Extract step information - support both old and new span formats
    step_name = attributes.get("node.name") or attributes.get("workflow_node", "Unknown Step")
    node_id = attributes.get("node.id") or attributes.get("workflow_node_id", "unknown")
    
    # Get input/output from span events or attributes
    step_input = _extract_step_input(span)
    step_output = _extract_step_output(span) 
    
    # Run evaluation for each criterion
    evaluation_results = []
    for criterion in step_criteria:
        result = evaluate_workflow_output(
            workflow_output=step_output,
            criteria=criterion["criteria"],
            points=criterion["points"],
            model=model
        )
        evaluation_results.append(result)
    
    # Calculate step score
    total_points = sum(c["points"] for c in step_criteria)
    earned_points = sum(r.points for r in evaluation_results if r.passed)
    step_score = earned_points / total_points if total_points > 0 else 0
    
    # Extract performance metrics
    duration_ms = _extract_duration(span)
    cost = _extract_cost(span)
    
    return StepEvaluationResult(
        step_name=step_name,
        node_id=node_id,
        step_input=step_input,
        step_output=step_output,
        evaluation_results=evaluation_results,
        step_score=step_score,
        duration_ms=duration_ms,
        cost=cost
    )


def evaluate_workflow_flow(
    step_evaluations: List[StepEvaluationResult],
    model: str = "gpt-4o-mini"
) -> FlowEvaluationResult:
    """
    Evaluate how well workflow steps connect and flow together
    
    Args:
        step_evaluations: Results from individual step evaluations
        model: LLM model to use for evaluation
        
    Returns:
        FlowEvaluationResult with flow analysis
    """
    if len(step_evaluations) < 2:
        return FlowEvaluationResult(
            flow_coherence=1.0,
            information_preservation=1.0,
            efficiency=1.0,
            transition_quality=[]
        )
    
    transition_quality = []
    coherence_scores = []
    preservation_scores = []
    
    # Evaluate each step transition
    for i in range(len(step_evaluations) - 1):
        current_step = step_evaluations[i]
        next_step = step_evaluations[i + 1]
        
        # Evaluate transition coherence
        coherence_criterion = f"""
        Evaluate if the output from '{current_step.step_name}' provides appropriate 
        input for '{next_step.step_name}'. The workflow should flow logically.
        """
        
        coherence_result = evaluate_workflow_output(
            workflow_output=f"Step 1 Output: {current_step.step_output}\nStep 2 Input: {next_step.step_input}",
            criteria=coherence_criterion,
            points=1,
            model=model
        )
        
        # Evaluate information preservation
        preservation_criterion = f"""
        Evaluate if important information from '{current_step.step_name}' output 
        is preserved and utilized in '{next_step.step_name}'. No critical data should be lost.
        """
        
        preservation_result = evaluate_workflow_output(
            workflow_output=f"Previous: {current_step.step_output}\nCurrent: {next_step.step_output}",
            criteria=preservation_criterion,
            points=1,
            model=model
        )
        
        transition = {
            "from_step": current_step.step_name,
            "to_step": next_step.step_name,
            "coherence_score": 1.0 if coherence_result.passed else 0.0,
            "preservation_score": 1.0 if preservation_result.passed else 0.0,
            "coherence_reason": coherence_result.reason,
            "preservation_reason": preservation_result.reason
        }
        
        transition_quality.append(transition)
        coherence_scores.append(transition["coherence_score"])
        preservation_scores.append(transition["preservation_score"])
    
    # Calculate overall flow metrics
    flow_coherence = sum(coherence_scores) / len(coherence_scores) if coherence_scores else 1.0
    information_preservation = sum(preservation_scores) / len(preservation_scores) if preservation_scores else 1.0
    
    # Calculate efficiency (detect redundancy)
    efficiency = _calculate_efficiency(step_evaluations)
    
    return FlowEvaluationResult(
        flow_coherence=flow_coherence,
        information_preservation=information_preservation,
        efficiency=efficiency,
        transition_quality=transition_quality
    )


def evaluate_end_to_end_workflow(
    execution_id: str,
    trace_data: Dict[str, Any],
    evaluation_criteria: Dict[str, Any],
    model: str = "gpt-4o-mini"
) -> WorkflowEvaluationResult:
    """
    Perform comprehensive end-to-end workflow evaluation
    
    Args:
        execution_id: ID of the workflow execution
        trace_data: Complete trace data with spans
        evaluation_criteria: Evaluation criteria for different aspects
        model: LLM model to use for evaluation
        
    Returns:
        WorkflowEvaluationResult with comprehensive analysis
    """
    # 1. EXISTING: Evaluate final output (enhanced)
    final_output = trace_data.get("final_output", "")
    final_criteria = evaluation_criteria.get("final_output_criteria", [])
    
    final_evaluation_results = []
    for criterion in final_criteria:
        result = evaluate_workflow_output(
            workflow_output=final_output,
            criteria=criterion["criteria"],
            points=criterion["points"],
            model=model
        )
        final_evaluation_results.append(result)
    
    # Calculate final output score
    final_total_points = sum(c["points"] for c in final_criteria)
    final_earned_points = sum(r.points for r in final_evaluation_results if r.passed)
    final_score = final_earned_points / final_total_points if final_total_points > 0 else 0
    
    final_output_evaluation = {
        "score": final_score,
        "total_points": final_total_points,
        "earned_points": final_earned_points,
        "results": [
            {
                "passed": r.passed,
                "reason": r.reason,
                "criteria": r.criteria,
                "points": r.points
            }
            for r in final_evaluation_results
        ]
    }
    
    # 2. NEW: Evaluate individual steps
    spans = trace_data.get("spans", [])
    step_criteria = evaluation_criteria.get("step_criteria", {})
    
    step_evaluations = []
    for span in spans:
        # Filter for Node spans only
        span_name = span.get("name", "")
        if not span_name.startswith("Node:"):
            continue
            
        # Get criteria for this step type
        attributes = span.get("attributes", {})
        step_type = attributes.get("node.type") or attributes.get("workflow_node", "generic")
        node_name = attributes.get("node.name") or attributes.get("workflow_node", "")
        
        # Try to match criteria by node type or name
        criteria_for_step = (
            step_criteria.get(step_type, []) or 
            step_criteria.get(node_name, []) or
            step_criteria.get("generic", [])
        )
        
        if criteria_for_step:
            step_eval = evaluate_workflow_step(span, criteria_for_step, model)
            step_evaluations.append(step_eval)
    
    # 3. NEW: Evaluate workflow flow
    flow_evaluation = evaluate_workflow_flow(step_evaluations, model)
    
    # 4. Calculate comprehensive scores
    step_scores = [s.step_score for s in step_evaluations]
    average_step_score = sum(step_scores) / len(step_scores) if step_scores else 0
    
    # Overall score combines final output, steps, and flow
    overall_score = (
        final_score * 0.4 +  # Final output: 40%
        average_step_score * 0.4 +  # Step quality: 40%
        (flow_evaluation.flow_coherence + flow_evaluation.information_preservation) / 2 * 0.2  # Flow: 20%
    )
    
    # 5. Identify bottlenecks
    bottleneck_analysis = _identify_bottlenecks(step_evaluations, flow_evaluation)
    
    # 6. Calculate performance metrics
    total_duration = sum(s.duration_ms for s in step_evaluations)
    total_cost = sum(s.cost for s in step_evaluations)
    efficiency_score = flow_evaluation.efficiency
    
    return WorkflowEvaluationResult(
        execution_id=execution_id,
        final_output_evaluation=final_output_evaluation,
        step_evaluations=step_evaluations,
        flow_evaluation=flow_evaluation,
        overall_score=overall_score,
        step_scores=step_scores,
        bottleneck_analysis=bottleneck_analysis,
        total_duration_ms=total_duration,
        total_cost=total_cost,
        efficiency_score=efficiency_score
    )


# Helper functions
def _extract_step_input(span: Dict[str, Any]) -> str:
    """Extract input for this step from span data"""
    events = span.get("events", [])
    for event in events:
        # Check for new node.input event format
        if event.get("name") == "node.input":
            return event.get("attributes", {}).get("data", "")
        # Fallback to older format
        if "input" in event.get("name", "").lower():
            return event.get("attributes", {}).get("input", "")
    return span.get("attributes", {}).get("input", "Unknown input")


def _extract_step_output(span: Dict[str, Any]) -> str:
    """Extract output for this step from span data"""
    events = span.get("events", [])
    for event in events:
        # Check for new node.output event format
        if event.get("name") == "node.output":
            return event.get("attributes", {}).get("data", "")
        # Fallback to older format
        if "output" in event.get("name", "").lower():
            return event.get("attributes", {}).get("output", "")
    return span.get("attributes", {}).get("output", "Unknown output")


def _extract_duration(span: Dict[str, Any]) -> float:
    """Extract duration from span timing"""
    start_time = span.get("start_time", 0)
    end_time = span.get("end_time", 0)
    if start_time and end_time:
        return (end_time - start_time) / 1_000_000  # Convert to ms
    return 0.0


def _extract_cost(span: Dict[str, Any]) -> float:
    """Extract cost from span attributes"""
    attributes = span.get("attributes", {})
    input_cost = attributes.get("gen_ai.usage.input_cost", attributes.get("cost_prompt", 0))
    output_cost = attributes.get("gen_ai.usage.output_cost", attributes.get("cost_completion", 0))
    return float(input_cost) + float(output_cost)


def _calculate_efficiency(step_evaluations: List[StepEvaluationResult]) -> float:
    """Calculate workflow efficiency by detecting redundancy"""
    if len(step_evaluations) < 2:
        return 1.0
    
    # Simple heuristic: check for duplicate or very similar outputs
    outputs = [step.step_output.lower() for step in step_evaluations]
    unique_outputs = set(outputs)
    
    # Efficiency decreases if there's significant redundancy
    efficiency = len(unique_outputs) / len(outputs)
    return efficiency


def _identify_bottlenecks(
    step_evaluations: List[StepEvaluationResult],
    flow_evaluation: FlowEvaluationResult
) -> List[str]:
    """Identify performance bottlenecks in the workflow"""
    bottlenecks = []
    
    # Identify low-performing steps
    avg_step_score = sum(s.step_score for s in step_evaluations) / len(step_evaluations) if step_evaluations else 0
    for step in step_evaluations:
        if step.step_score < avg_step_score * 0.7:  # 30% below average
            bottlenecks.append(f"Low performance in '{step.step_name}' (score: {step.step_score:.2f})")
    
    # Identify flow issues
    if flow_evaluation.flow_coherence < 0.7:
        bottlenecks.append(f"Poor flow coherence between steps (score: {flow_evaluation.flow_coherence:.2f})")
    
    if flow_evaluation.information_preservation < 0.7:
        bottlenecks.append(f"Information loss between steps (score: {flow_evaluation.information_preservation:.2f})")
    
    # Identify expensive steps
    if step_evaluations:
        avg_cost = sum(s.cost for s in step_evaluations) / len(step_evaluations)
        for step in step_evaluations:
            if step.cost > avg_cost * 2:  # Significantly more expensive
                bottlenecks.append(f"High cost in '{step.step_name}' (${step.cost:.4f})")
    
    return bottlenecks if bottlenecks else ["No significant bottlenecks identified"]