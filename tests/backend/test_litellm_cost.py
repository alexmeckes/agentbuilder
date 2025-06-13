#!/usr/bin/env python3
"""Test script to verify LiteLLM cost calculation is working correctly."""

import litellm
from litellm.cost_calculator import cost_per_token

def test_cost_calculation():
    """Test various cost calculation scenarios."""
    
    # Test cases with different models
    test_cases = [
        {
            "model": "gpt-4",
            "prompt_tokens": 1000,
            "completion_tokens": 500,
            "description": "GPT-4 standard usage"
        },
        {
            "model": "gpt-3.5-turbo",
            "prompt_tokens": 2000,
            "completion_tokens": 1000,
            "description": "GPT-3.5 Turbo usage"
        },
        {
            "model": "claude-3-opus-20240229",
            "prompt_tokens": 500,
            "completion_tokens": 250,
            "description": "Claude 3 Opus usage"
        },
        {
            "model": "claude-3-sonnet-20240229",
            "prompt_tokens": 1500,
            "completion_tokens": 750,
            "description": "Claude 3 Sonnet usage"
        }
    ]
    
    print("Testing LiteLLM cost_per_token function...")
    print("=" * 80)
    
    for test in test_cases:
        print(f"\nTest: {test['description']}")
        print(f"Model: {test['model']}")
        print(f"Input tokens: {test['prompt_tokens']:,}")
        print(f"Output tokens: {test['completion_tokens']:,}")
        
        try:
            # Calculate costs
            input_cost, output_cost = cost_per_token(
                model=test['model'],
                prompt_tokens=test['prompt_tokens'],
                completion_tokens=test['completion_tokens']
            )
            
            total_cost = input_cost + output_cost
            
            print(f"✅ Success!")
            print(f"   Input cost: ${input_cost:.6f}")
            print(f"   Output cost: ${output_cost:.6f}")
            print(f"   Total cost: ${total_cost:.6f}")
            
            # Calculate per-token rates for reference
            if test['prompt_tokens'] > 0:
                input_per_1k = (input_cost / test['prompt_tokens']) * 1000
                print(f"   Input rate: ${input_per_1k:.6f} per 1K tokens")
            
            if test['completion_tokens'] > 0:
                output_per_1k = (output_cost / test['completion_tokens']) * 1000
                print(f"   Output rate: ${output_per_1k:.6f} per 1K tokens")
                
        except Exception as e:
            print(f"❌ Error: {e}")
    
    print("\n" + "=" * 80)
    print("Testing edge cases...")
    
    # Edge case: Zero tokens
    try:
        input_cost, output_cost = cost_per_token(
            model="gpt-4",
            prompt_tokens=0,
            completion_tokens=0
        )
        print(f"✅ Zero tokens: input=${input_cost:.6f}, output=${output_cost:.6f}")
    except Exception as e:
        print(f"❌ Zero tokens error: {e}")
    
    # Edge case: Unknown model
    try:
        input_cost, output_cost = cost_per_token(
            model="unknown-model-xyz",
            prompt_tokens=100,
            completion_tokens=50
        )
        print(f"⚠️  Unknown model returned: input=${input_cost:.6f}, output=${output_cost:.6f}")
    except Exception as e:
        print(f"❌ Unknown model error (expected): {e}")
    
    print("\n" + "=" * 80)
    print("All tests completed!")

if __name__ == "__main__":
    test_cost_calculation()