# LiteLLM Cost Calculation Guide

## Problem
The current code is failing with:
```
cost_per_token() got an unexpected keyword argument 'num_tokens'
```

## Root Cause
The code is using incorrect parameter names for the `litellm.cost_per_token()` function.

## Correct API Usage

### Function Signature
```python
from litellm.cost_calculator import cost_per_token

cost_per_token(
    model: str = '',
    prompt_tokens: int = 0,
    completion_tokens: int = 0,
    response_time_ms: Optional[float] = 0.0,
    custom_llm_provider: Optional[str] = None,
    # ... other optional parameters
) -> Tuple[float, float]
```

### Key Parameters
1. **model**: The model name (e.g., "gpt-4", "claude-3-opus-20240229")
2. **prompt_tokens**: Number of input/prompt tokens
3. **completion_tokens**: Number of output/completion tokens

### Return Value
The function returns a tuple: `(prompt_cost, completion_cost)`

## Correcting the Code

### Current (Incorrect) Code
```python
# This is WRONG - uses incorrect parameter names
input_cost_calc = litellm.cost_per_token(model=model_name, num_tokens=span_input_tokens, is_completion=False)
output_cost_calc = litellm.cost_per_token(model=model_name, num_tokens=span_output_tokens, is_completion=True)
```

### Correct Implementation
```python
# Option 1: Calculate both costs in one call
prompt_cost, completion_cost = litellm.cost_per_token(
    model=model_name,
    prompt_tokens=span_input_tokens,
    completion_tokens=span_output_tokens
)

# Option 2: Calculate costs separately (less efficient)
# For input tokens only
input_cost, _ = litellm.cost_per_token(
    model=model_name,
    prompt_tokens=span_input_tokens,
    completion_tokens=0
)

# For output tokens only
_, output_cost = litellm.cost_per_token(
    model=model_name,
    prompt_tokens=0,
    completion_tokens=span_output_tokens
)
```

## Best Practice Example
```python
import litellm
from litellm.cost_calculator import cost_per_token

def calculate_llm_costs(model_name: str, input_tokens: int, output_tokens: int) -> tuple[float, float, float]:
    """
    Calculate costs for LLM usage.
    
    Args:
        model_name: The model identifier (e.g., "gpt-4", "claude-3-opus-20240229")
        input_tokens: Number of input/prompt tokens
        output_tokens: Number of output/completion tokens
        
    Returns:
        Tuple of (input_cost, output_cost, total_cost)
    """
    try:
        # Calculate costs in one efficient call
        input_cost, output_cost = cost_per_token(
            model=model_name,
            prompt_tokens=input_tokens,
            completion_tokens=output_tokens
        )
        
        total_cost = input_cost + output_cost
        
        return input_cost, output_cost, total_cost
        
    except Exception as e:
        print(f"Error calculating costs: {e}")
        # Return zeros if calculation fails
        return 0.0, 0.0, 0.0

# Example usage
model = "gpt-4"
input_tokens = 1000
output_tokens = 500

input_cost, output_cost, total_cost = calculate_llm_costs(model, input_tokens, output_tokens)
print(f"Input cost: ${input_cost:.6f}")
print(f"Output cost: ${output_cost:.6f}")
print(f"Total cost: ${total_cost:.6f}")
```

## Common Mistakes to Avoid

1. **Using `num_tokens` parameter** - This doesn't exist
2. **Using `is_completion` parameter** - This doesn't exist
3. **Calling the function twice** - It's more efficient to call once with both token counts
4. **Not handling exceptions** - The function may raise exceptions for unknown models

## Additional Notes

- The function automatically handles cost calculation based on the model's pricing
- For custom models or providers, use the `custom_llm_provider` parameter
- The function returns costs in USD
- Always validate that the model name matches LiteLLM's expected format