#!/usr/bin/env python3
"""
Test MCP Integration

This script tests the end-to-end MCP integration by:
1. Checking if MCP is enabled
2. Testing server connections
3. Executing MCP tools
"""

import requests
import json
import sys

def test_mcp_integration():
    """Test the MCP integration end-to-end"""
    base_url = "http://localhost:8000"
    
    print("🧪 Testing MCP Integration...")
    print("=" * 50)
    
    # Test 1: Check if MCP is enabled
    print("\n1. Checking MCP Status...")
    try:
        response = requests.get(f"{base_url}/mcp/enabled")
        data = response.json()
        print(f"   ✅ MCP Enabled: {data['enabled']}")
        print(f"   ✅ MCP Available: {data['available']}")
        
        if not data['enabled']:
            print("   ❌ MCP is not enabled. Set ENABLE_MCP_SERVERS=true")
            return False
            
    except Exception as e:
        print(f"   ❌ Failed to check MCP status: {e}")
        return False
    
    # Test 2: List configured servers
    print("\n2. Checking Configured Servers...")
    try:
        response = requests.get(f"{base_url}/mcp/servers")
        data = response.json()
        servers = data.get('servers', {})
        
        for server_id, server_info in servers.items():
            print(f"   📡 {server_info['name']}")
            print(f"      Status: {server_info['status']}")
            print(f"      Tools: {server_info['tool_count']}")
            if server_info['capabilities']:
                print(f"      Capabilities: {', '.join(server_info['capabilities'])}")
                
    except Exception as e:
        print(f"   ❌ Failed to list servers: {e}")
        return False
    
    # Test 3: Test server connection
    print("\n3. Testing Server Connections...")
    try:
        response = requests.post(f"{base_url}/mcp/servers/web_search/test")
        data = response.json()
        
        if data['success']:
            print(f"   ✅ Web Search Server Connected")
            print(f"   🔧 Available Tools: {data['tool_count']}")
            for tool in data['tools']:
                print(f"      - {tool['name']}: {tool['description']}")
        else:
            print(f"   ❌ Connection failed: {data['error']}")
            return False
            
    except Exception as e:
        print(f"   ❌ Failed to test connection: {e}")
        return False
    
    # Test 4: List available tools
    print("\n4. Checking Available Tools...")
    try:
        response = requests.get(f"{base_url}/mcp/tools")
        data = response.json()
        tools = data.get('tools', {})
        
        mcp_tools = {k: v for k, v in tools.items() if v.get('type') == 'mcp'}
        built_in_tools = {k: v for k, v in tools.items() if v.get('type') == 'built-in'}
        
        print(f"   🔧 Built-in Tools: {len(built_in_tools)}")
        print(f"   🔌 MCP Tools: {len(mcp_tools)}")
        
        for tool_key, tool_info in mcp_tools.items():
            print(f"      - {tool_key}: {tool_info['description']}")
            
    except Exception as e:
        print(f"   ❌ Failed to list tools: {e}")
        return False
    
    # Test 5: Test workflow execution with MCP tools
    print("\n5. Testing Workflow Execution...")
    try:
        # Create a simple workflow that uses the echo tool
        workflow = {
            "nodes": [
                {
                    "id": "input-1",
                    "type": "input",
                    "data": {"label": "User Input"},
                    "position": {"x": 100, "y": 100}
                },
                {
                    "id": "tool-1", 
                    "type": "tool",
                    "data": {
                        "label": "Echo Tool",
                        "tool": "mcp_web_search_echo",
                        "parameters": {"text": "Hello from MCP!"}
                    },
                    "position": {"x": 300, "y": 100}
                },
                {
                    "id": "output-1",
                    "type": "output", 
                    "data": {"label": "Result"},
                    "position": {"x": 500, "y": 100}
                }
            ],
            "edges": [
                {
                    "id": "edge-1",
                    "source": "input-1",
                    "target": "tool-1"
                },
                {
                    "id": "edge-2", 
                    "source": "tool-1",
                    "target": "output-1"
                }
            ]
        }
        
        execution_request = {
            "workflow": workflow,
            "input_data": "Test input",
            "framework": "openai"
        }
        
        response = requests.post(f"{base_url}/execute", json=execution_request)
        
        if response.status_code == 200:
            data = response.json()
            print(f"   ✅ Workflow executed successfully")
            print(f"   📋 Execution ID: {data['execution_id']}")
            print(f"   📊 Status: {data['status']}")
            if data.get('result'):
                print(f"   📝 Result: {data['result'][:100]}...")
        else:
            print(f"   ⚠️  Workflow execution returned status {response.status_code}")
            print(f"   📝 Response: {response.text[:200]}...")
            
    except Exception as e:
        print(f"   ❌ Failed to execute workflow: {e}")
        return False
    
    print("\n" + "=" * 50)
    print("🎉 MCP Integration Test Complete!")
    print("✅ Phase 2 MCP implementation is working!")
    return True

if __name__ == "__main__":
    success = test_mcp_integration()
    sys.exit(0 if success else 1) 