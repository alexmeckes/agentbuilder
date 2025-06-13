#!/usr/bin/env python3
"""
Test GitHub MCP Integration

This script tests the GitHub MCP server integration:
1. Tests server connection
2. Lists available GitHub tools
3. Tests basic functionality without requiring auth
"""

import requests
import json
import sys

def test_github_mcp():
    """Test GitHub MCP server integration"""
    base_url = "http://localhost:8000"
    
    print("🐙 Testing GitHub MCP Integration...")
    print("=" * 60)
    
    # Test 1: Check available servers
    print("\n1. Checking Available GitHub Servers...")
    try:
        response = requests.get(f"{base_url}/mcp/servers/available")
        data = response.json()
        servers = data.get('servers', [])
        
        github_servers = [s for s in servers if 'github' in s['id'].lower()]
        
        for server in github_servers:
            print(f"   🐙 {server['name']}")
            print(f"      Description: {server['description']}")
            print(f"      Category: {server['category']}")
            if server.get('official'):
                print(f"      ✅ Official GitHub Server")
            if server.get('features'):
                print(f"      Features: {', '.join(server['features'])}")
                
    except Exception as e:
        print(f"   ❌ Failed to list available servers: {e}")
        return False
    
    # Test 2: Check configured servers
    print("\n2. Checking Configured GitHub Server...")
    try:
        response = requests.get(f"{base_url}/mcp/servers")
        data = response.json()
        servers = data.get('servers', {})
        
        if 'github' in servers:
            server_info = servers['github']
            print(f"   📡 {server_info['name']}")
            print(f"      Status: {server_info['status']}")
            print(f"      Tools: {server_info['tool_count']}")
            if server_info['capabilities']:
                print(f"      Capabilities: {', '.join(server_info['capabilities'][:5])}...")
        else:
            print("   ⚠️  GitHub server not configured yet")
                
    except Exception as e:
        print(f"   ❌ Failed to check configured servers: {e}")
        return False
    
    # Test 3: Test GitHub server connection (will fail without token but shows structure)
    print("\n3. Testing GitHub Server Connection...")
    try:
        response = requests.post(f"{base_url}/mcp/servers/github/test")
        data = response.json()
        
        if data['success']:
            print(f"   ✅ GitHub Server Connected!")
            print(f"   🔧 Available Tools: {data['tool_count']}")
            
            # Show sample tools
            tools = data.get('tools', [])
            if tools:
                print(f"   📋 Sample GitHub Tools:")
                for tool in tools[:8]:  # Show first 8 tools
                    print(f"      - {tool['name']}: {tool['description'][:60]}...")
                if len(tools) > 8:
                    print(f"      ... and {len(tools) - 8} more tools")
        else:
            print(f"   ⚠️  Connection test (expected without token): {data['error']}")
            print(f"   💡 This is normal - GitHub server requires authentication")
            
    except Exception as e:
        print(f"   ❌ Failed to test GitHub server: {e}")
    
    # Test 4: List all available tools to see GitHub tools
    print("\n4. Checking Available Tools...")
    try:
        response = requests.get(f"{base_url}/mcp/tools")
        data = response.json()
        tools = data.get('tools', {})
        
        github_tools = {k: v for k, v in tools.items() if 'github' in k.lower()}
        other_mcp_tools = {k: v for k, v in tools.items() if v.get('type') == 'mcp' and 'github' not in k.lower()}
        built_in_tools = {k: v for k, v in tools.items() if v.get('type') == 'built-in'}
        
        print(f"   🔧 Built-in Tools: {len(built_in_tools)}")
        print(f"   🐙 GitHub MCP Tools: {len(github_tools)}")
        print(f"   🔌 Other MCP Tools: {len(other_mcp_tools)}")
        
        if github_tools:
            print(f"   📋 Sample GitHub Tools:")
            for tool_key, tool_info in list(github_tools.items())[:5]:
                print(f"      - {tool_key}: {tool_info['description']}")
        else:
            print(f"   💡 GitHub tools will appear after server connection")
            
    except Exception as e:
        print(f"   ❌ Failed to list tools: {e}")
        return False
    
    # Test 5: Show setup instructions
    print("\n5. Setup Instructions...")
    print("   📋 To complete GitHub MCP integration:")
    print("   1. Create a GitHub Personal Access Token:")
    print("      - Go to https://github.com/settings/tokens")
    print("      - Click 'Generate new token (classic)'")
    print("      - Select scopes: repo, read:user, user:email")
    print("   2. Update the server configuration:")
    print("      - Edit backend/mcp_config/servers.json")
    print("      - Replace 'your_github_token_here' with your actual token")
    print("   3. Restart the backend server")
    print("   4. Test the connection!")
    
    print("\n" + "=" * 60)
    print("🎉 GitHub MCP Integration Test Complete!")
    print("✅ Infrastructure ready - just needs authentication!")
    return True

if __name__ == "__main__":
    success = test_github_mcp()
    sys.exit(0 if success else 1) 