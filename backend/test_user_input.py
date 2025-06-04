#!/usr/bin/env python3
"""
Test script to demonstrate user input detection functionality
"""

import asyncio
from main import WorkflowExecutor

async def test_user_input_detection():
    """Test the user input detection functionality"""
    
    executor = WorkflowExecutor()
    
    # Test cases for input detection
    test_outputs = [
        "What would you like me to help you with today?",
        "Please provide more details about your project.",
        "Tell me about your preferences for this task.",
        "What are your thoughts on this approach?",
        "This is just a regular response without questions.",
        "How would you like me to proceed with this analysis?",
        "What kind of output format do you prefer?",
        "The task has been completed successfully.",
        "Which option would you like to choose: A, B, or C?",
        "Can you tell me more about your requirements?"
    ]
    
    print("🧪 Testing user input detection...")
    print("=" * 50)
    
    for i, output in enumerate(test_outputs, 1):
        print(f"\nTest {i}: {output}")
        
        # Test the detection method
        input_request = await executor._detect_user_input_request(f"test_exec_{i}", output)
        
        if input_request:
            print(f"✅ DETECTED as input request")
            print(f"   Question: {input_request['question']}")
            print(f"   Type: {input_request['type']}")
        else:
            print(f"❌ NOT detected as input request")
    
    print("\n" + "=" * 50)
    print("🏁 Test completed!")

if __name__ == "__main__":
    asyncio.run(test_user_input_detection()) 