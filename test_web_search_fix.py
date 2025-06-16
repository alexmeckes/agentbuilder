#!/usr/bin/env python3
"""
Test script to verify web search tool is properly spawned in workflows
"""

import asyncio
import logging
import sys
import os

# Add backend to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

from visual_to_anyagent_translator import VisualToAnyAgentTranslator, execute_visual_workflow_with_anyagent

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

async def test_web_search_workflow():
    """Test a workflow with web search tool"""
    
    # Create a simple workflow with an agent and web search tool
    nodes = [
        {
            "id": "agent1",
            "type": "agent",
            "data": {
                "name": "SearchAgent",
                "instructions": "You are a helpful research assistant. Use web search to find information.",
                "model_id": "gpt-4o-mini"
            },
            "position": {"x": 100, "y": 100}
        },
        {
            "id": "tool1",
            "type": "tool",
            "data": {
                "tool_type": "web_search",  # This is what frontend sends
                "name": "WebSearch",
                "description": "Search the web for information"
            },
            "position": {"x": 300, "y": 100}
        }
    ]
    
    edges = [
        {
            "id": "edge1",
            "source": "tool1",
            "target": "agent1",
            "sourceHandle": "default",
            "targetHandle": "tool"
        }
    ]
    
    # Test input
    test_input = "Search for the latest news about OpenAI"
    
    print("\n" + "="*60)
    print("🧪 TESTING WEB SEARCH TOOL WORKFLOW")
    print("="*60)
    print(f"📝 Input: {test_input}")
    print(f"🔧 Nodes: {len(nodes)} (1 agent, 1 tool)")
    print(f"🔗 Edges: {len(edges)}")
    print("="*60 + "\n")
    
    # Create translator and debug tools
    translator = VisualToAnyAgentTranslator()
    translator.debug_available_tools()
    
    # Test translation
    print("\n🔄 Testing workflow translation...")
    try:
        main_agent, managed_agents = translator.translate_workflow(nodes, edges, "openai")
        print(f"✅ Translation successful!")
        print(f"   Main agent: {main_agent.name}")
        print(f"   Tools assigned: {[t.__name__ for t in main_agent.tools]}")
    except Exception as e:
        print(f"❌ Translation failed: {e}")
        return
    
    # Test execution (mock)
    print("\n🚀 Testing workflow execution (mock mode)...")
    try:
        result = await execute_visual_workflow_with_anyagent(
            nodes=nodes,
            edges=edges,
            input_data=test_input,
            framework="openai"
        )
        print(f"✅ Execution completed!")
        print(f"   Result: {result.get('final_output', 'No output')[:200]}...")
    except Exception as e:
        print(f"❌ Execution failed: {e}")
    
    print("\n" + "="*60)
    print("🏁 TEST COMPLETE")
    print("="*60)

if __name__ == "__main__":
    asyncio.run(test_web_search_workflow())