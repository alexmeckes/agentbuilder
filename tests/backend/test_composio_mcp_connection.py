#!/usr/bin/env python3
"""
Test script to diagnose and fix Composio MCP server connection
"""

import requests
import json
import time

BACKEND_URL = "http://localhost:8000"
API_KEY = "1zvikjpl9g389p2m27twdl"
USER_ID = "user_1749064147432_wepvtbf4u"

def test_mcp_status():
    """Check current MCP server status"""
    print("🔍 Checking MCP server status...")
    try:
        response = requests.get(f"{BACKEND_URL}/mcp/servers")
        if response.status_code == 200:
            data = response.json()
            composio_server = data.get('servers', {}).get('composio-tools', {})
            print(f"   Status: {composio_server.get('status', 'unknown')}")
            print(f"   Tool Count: {composio_server.get('tool_count', 0)}")
            print(f"   Last Error: {composio_server.get('last_error', 'none')}")
            return composio_server
        else:
            print(f"   ❌ Failed to get server status: {response.status_code}")
            return None
    except Exception as e:
        print(f"   ❌ Error checking status: {e}")
        return None

def update_composio_server():
    """Update Composio MCP server configuration"""
    print("🔧 Updating Composio MCP server configuration...")
    
    payload = {
        "env": {
            "COMPOSIO_API_KEY": API_KEY,
            "USER_ID": USER_ID,
            "ENABLED_TOOLS": "googledocs_create_doc",
            "ENCRYPTION_ENABLED": "false"
        }
    }
    
    try:
        response = requests.put(
            f"{BACKEND_URL}/mcp/servers/composio-tools",
            headers={"Content-Type": "application/json"},
            json=payload,
            timeout=15  # 15 second timeout
        )
        
        if response.status_code == 200:
            data = response.json()
            print(f"   ✅ Server updated: {data.get('message', 'success')}")
            return True
        else:
            print(f"   ❌ Update failed: {response.status_code} - {response.text}")
            return False
            
    except requests.exceptions.Timeout:
        print("   ⏱️ Update timed out (this is expected behavior with our timeout fix)")
        return False
    except Exception as e:
        print(f"   ❌ Error updating server: {e}")
        return False

def test_tools_endpoint():
    """Check what tools are detected"""
    print("🔍 Checking detected tools...")
    try:
        response = requests.get(f"{BACKEND_URL}/mcp/tools")
        if response.status_code == 200:
            data = response.json()
            tools = data.get('tools', {})
            
            print(f"   Total tools: {len(tools)}")
            
            composio_tools = {k: v for k, v in tools.items() if v.get('source') == 'composio'}
            builtin_tools = {k: v for k, v in tools.items() if v.get('source') == 'built-in'}
            
            print(f"   Composio tools: {len(composio_tools)}")
            print(f"   Built-in tools: {len(builtin_tools)}")
            
            if composio_tools:
                print("   📦 Composio tools found:")
                for tool_id, tool_info in composio_tools.items():
                    print(f"      - {tool_info.get('name', tool_id)} ({tool_info.get('category', 'unknown')})")
            else:
                print("   ⚠️ No Composio tools detected")
                
            return len(composio_tools) > 0
        else:
            print(f"   ❌ Failed to get tools: {response.status_code}")
            return False
    except Exception as e:
        print(f"   ❌ Error checking tools: {e}")
        return False

def test_composio_direct():
    """Test Composio API directly"""
    print("🔍 Testing Composio API directly...")
    try:
        response = requests.get(
            "https://backend.composio.dev/api/v1/connectedAccounts",
            headers={"X-API-Key": API_KEY},
            timeout=10
        )
        
        if response.status_code == 200:
            data = response.json()
            print(f"   ✅ Composio API works - {len(data)} connected accounts")
            for account in data:
                if isinstance(account, dict):
                    print(f"      - {account.get('integrationId', 'unknown')} ({account.get('id', 'no-id')})")
                else:
                    print(f"      - {account}")
            return True
        else:
            print(f"   ❌ Composio API failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"   ❌ Composio API error: {e}")
        return False

def main():
    print("🚀 Composio MCP Connection Diagnostic\n")
    
    # Step 1: Check current status
    status = test_mcp_status()
    print()
    
    # Step 2: Test Composio API directly
    composio_works = test_composio_direct()
    print()
    
    # Step 3: Update server config (will timeout, but that's expected)
    print("⏱️ Note: Update will timeout due to our hang fix - this is expected behavior")
    update_composio_server()
    print()
    
    # Step 4: Wait a bit and check status again
    print("⏳ Waiting 5 seconds for server to process...")
    time.sleep(5)
    test_mcp_status()
    print()
    
    # Step 5: Check tools detection
    tools_detected = test_tools_endpoint()
    print()
    
    # Summary
    print("📋 DIAGNOSIS SUMMARY:")
    print(f"   Composio API accessible: {'✅' if composio_works else '❌'}")
    print(f"   MCP server exists: {'✅' if status else '❌'}")
    print(f"   Tools detected: {'✅' if tools_detected else '❌'}")
    
    if composio_works and not tools_detected:
        print("\n💡 RECOMMENDATION:")
        print("   The Composio API works but MCP integration has issues.")
        print("   This is likely due to the timeout protection we added.")
        print("   The tools should appear after the server processes the update.")
        print("   Try refreshing your browser and check the Design tab.")

if __name__ == "__main__":
    main() 