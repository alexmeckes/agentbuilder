"""
Lightweight evaluation module that provides core evaluation functionality
without requiring heavy ML dependencies like HuggingFace datasets or evaluate.
"""
import json
import re
from typing import Dict, List, Any, Optional
from dataclasses import dataclass
from litellm import completion


@dataclass
class EvaluationResult:
    """Result of an evaluation."""
    passed: bool
    reason: str
    criteria: str
    points: int


def llm_evaluate_with_criterion(
    model: str,
    criteria: str,
    points: int,
    ground_truth_output: Optional[List[Dict[str, Any]]] = None,
    hypothesis_final_output: Optional[str] = None,
    evidence: Optional[str] = None,
) -> EvaluationResult:
    """Evaluate a single criterion using LLM."""
    prompt = f"""
Evaluate if the following criterion was met {"based on the provided evidence" if evidence else "in the agent's answer"}.

Criterion: {criteria}
"""

    if ground_truth_output:
        prompt += f"""
Expected output: {json.dumps(ground_truth_output)}
"""
    if hypothesis_final_output:
        prompt += f"""
Agent's answer: {hypothesis_final_output}
"""

    if evidence:
        prompt += f"""
Trace evidence:
{evidence}
"""

    prompt += f"""

Based on the {"evidence" if evidence else "comparison between the expected output and the actual final answer"},
was this criterion satisfied? Answer with:
1. "passed": true or false
2. "reason": Brief explanation for your decision

Output valid JSON with these fields only, in the format:
{{
    "passed": true,
    "reason": "Brief explanation"
}}
"""

    try:
        response = completion(
            model=model,
            messages=[{"role": "user", "content": prompt}],
        )
        content = response.choices[0].message.content

        # Extract JSON from the response
        json_match = re.search(
            r"```(?:json)?\s*(\{.*?\})\s*```|(\{.*?\})",
            content,
            re.DOTALL,
        )

        if json_match:
            json_str = next(group for group in json_match.groups() if group)
            evaluation = json.loads(json_str)
        else:
            evaluation = json.loads(content)

        evaluation["criteria"] = criteria
        evaluation["points"] = points

        return EvaluationResult(
            passed=evaluation.get("passed", False),
            reason=evaluation.get("reason", "No reason provided"),
            criteria=criteria,
            points=points
        )

    except Exception as e:
        return EvaluationResult(
            passed=False,
            reason=f"Failed to evaluate due to error: {str(e)}",
            criteria=criteria,
            points=points
        )


def simple_text_match_evaluation(
    hypothesis_answer: str,
    ground_truth_answers: List[str],
    threshold: float = 0.8
) -> EvaluationResult:
    """
    Simple text matching evaluation without requiring HuggingFace metrics.
    Uses basic string similarity instead of SQuAD metric.
    """
    hypothesis_lower = hypothesis_answer.lower().strip()
    
    # Check for exact matches
    for truth in ground_truth_answers:
        if hypothesis_lower == truth.lower().strip():
            return EvaluationResult(
                passed=True,
                reason="Exact match found",
                criteria="Is the answer a direct match?",
                points=1
            )
    
    # Check for substring matches
    best_score = 0.0
    for truth in ground_truth_answers:
        truth_lower = truth.lower().strip()
        
        # Simple Jaccard similarity
        hypothesis_words = set(hypothesis_lower.split())
        truth_words = set(truth_lower.split())
        
        if len(hypothesis_words.union(truth_words)) > 0:
            similarity = len(hypothesis_words.intersection(truth_words)) / len(hypothesis_words.union(truth_words))
            best_score = max(best_score, similarity)
    
    passed = best_score >= threshold
    
    return EvaluationResult(
        passed=passed,
        reason=f"Best similarity score: {best_score:.2f} (threshold: {threshold})",
        criteria="Is the answer a direct match?",
        points=1 if passed else 0
    )


def evaluate_workflow_output(
    workflow_output: str,
    criteria: str,
    points: int,
    model: str = "gpt-4o-mini"
) -> EvaluationResult:
    """
    Evaluate workflow output against specific criteria using LLM.
    This is the main evaluation function used by the application.
    """
    return llm_evaluate_with_criterion(
        model=model,
        criteria=criteria,
        points=points,
        hypothesis_final_output=workflow_output
    ) 