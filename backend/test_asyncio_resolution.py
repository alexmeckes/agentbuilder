#!/usr/bin/env python3
"""
Test script for asyncio conflict resolution in any-agent execution
"""

import asyncio
import os
import sys
from visual_to_anyagent_translator import execute_visual_workflow_with_anyagent

# Set to real execution mode
os.environ["USE_MOCK_EXECUTION"] = "false"

async def test_asyncio_resolution():
    """Test that any-agent execution works within an async context"""
    
    print("🧪 Testing AsyncIO Conflict Resolution")
    print("=" * 50)
    
    # Simple test workflow
    test_nodes = [
        {
            "id": "agent1",
            "type": "agent", 
            "data": {
                "name": "test_agent",
                "model_id": "gpt-4o-mini",
                "instructions": "You are a helpful assistant. Answer questions clearly and concisely.",
                "label": "Test Agent"
            },
            "position": {"x": 100, "y": 100}
        }
    ]
    
    test_edges = []
    
    test_input = "What is 2 + 2?"
    
    print(f"📝 Test Input: {test_input}")
    print("⏳ Executing workflow with asyncio conflict resolution...")
    
    try:
        result = await execute_visual_workflow_with_anyagent(
            nodes=test_nodes,
            edges=test_edges, 
            input_data=test_input,
            framework="openai"
        )
        
        print("\n✅ Execution completed successfully!")
        print(f"🎯 Mode: {result.get('mode', 'unknown')}")
        print(f"📤 Output: {result.get('final_output', 'No output')[:200]}...")
        
        if result.get('error'):
            print(f"⚠️  Note: {result['error']}")
            
        return True
        
    except Exception as e:
        print(f"\n❌ Execution failed: {str(e)}")
        return False

async def test_multiple_concurrent_executions():
    """Test multiple concurrent any-agent executions"""
    
    print("\n🔄 Testing Concurrent Executions")
    print("=" * 50)
    
    tasks = []
    for i in range(3):
        test_nodes = [
            {
                "id": f"agent{i}",
                "type": "agent",
                "data": {
                    "name": f"test_agent_{i}",
                    "model_id": "gpt-4o-mini", 
                    "instructions": f"You are test agent {i}. Answer questions clearly.",
                    "label": f"Test Agent {i}"
                },
                "position": {"x": 100, "y": 100}
            }
        ]
        
        task = execute_visual_workflow_with_anyagent(
            nodes=test_nodes,
            edges=[],
            input_data=f"What is {i+1} + {i+1}?",
            framework="openai"
        )
        tasks.append(task)
    
    print("⏳ Running 3 concurrent executions...")
    
    try:
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        success_count = 0
        for i, result in enumerate(results):
            if isinstance(result, Exception):
                print(f"❌ Task {i+1} failed: {str(result)}")
            else:
                print(f"✅ Task {i+1} completed: {result.get('mode', 'unknown')}")
                success_count += 1
        
        print(f"\n📊 Results: {success_count}/3 tasks completed successfully")
        return success_count == 3
        
    except Exception as e:
        print(f"❌ Concurrent execution test failed: {str(e)}")
        return False

async def main():
    """Run all tests"""
    
    print("🚀 any-agent AsyncIO Conflict Resolution Test Suite")
    print("=" * 60)
    
    # Check if OpenAI API key is set
    if not os.getenv("OPENAI_API_KEY"):
        print("⚠️  Warning: OPENAI_API_KEY not set. Tests may fall back to suggestion mode.")
        print("🔧 Set your API key: export OPENAI_API_KEY='your_key_here'")
        print()
    
    test_results = []
    
    # Test 1: Basic execution
    result1 = await test_asyncio_resolution()
    test_results.append(("Basic Execution", result1))
    
    # Test 2: Concurrent executions  
    result2 = await test_multiple_concurrent_executions()
    test_results.append(("Concurrent Executions", result2))
    
    # Summary
    print("\n📋 Test Summary")
    print("=" * 30)
    
    passed = 0
    for test_name, result in test_results:
        status = "✅ PASSED" if result else "❌ FAILED"
        print(f"{test_name}: {status}")
        if result:
            passed += 1
    
    print(f"\n🎯 Overall: {passed}/{len(test_results)} tests passed")
    
    if passed == len(test_results):
        print("🎉 All tests passed! AsyncIO conflict resolution is working correctly.")
    else:
        print("⚠️  Some tests failed. Check the error messages above.")
    
    return passed == len(test_results)

if __name__ == "__main__":
    asyncio.run(main()) 