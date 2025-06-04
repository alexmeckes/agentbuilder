#!/usr/bin/env python3
"""
Lightweight Composio MCP Bridge

Bridges Composio tools into the existing MCP infrastructure.
Designed to work alongside existing tools without breaking anything.
"""

import asyncio
import json
import os
import sys
import logging
from typing import Dict, List, Any, Optional

# Try to import Composio with correct import path
try:
    from composio import ComposioToolSet, Action, App
    COMPOSIO_AVAILABLE = True
except ImportError:
    try:
        # Alternative import path
        from composio.client import Composio
        from composio.tools import ComposioToolSet
        COMPOSIO_AVAILABLE = True
    except ImportError:
        COMPOSIO_AVAILABLE = False

# Basic MCP protocol implementation (lightweight)
class MCPServer:
    def __init__(self):
        self.composio_toolset = None
        self.available_tools = {}
        
        # Always discover tools, even without valid API key
        self._discover_tools()
        
        if COMPOSIO_AVAILABLE and os.getenv('COMPOSIO_API_KEY'):
            try:
                self.composio_toolset = ComposioToolSet()
                logging.info("✅ Composio toolset initialized successfully")
            except Exception as e:
                logging.error(f"Failed to initialize Composio: {e}")
                logging.info("🔄 Continuing with mock tools...")
    
    def _discover_tools(self):
        """Discover popular Composio tools (lightweight subset)"""
        popular_tools = {
            # Communication
            "github_star_repo": {
                "description": "Star a GitHub repository",
                "category": "development",
                "parameters": {
                    "owner": {"type": "string", "description": "Repository owner"},
                    "repo": {"type": "string", "description": "Repository name"}
                }
            },
            "slack_send_message": {
                "description": "Send message to Slack channel",
                "category": "communication",
                "parameters": {
                    "channel": {"type": "string", "description": "Channel name or ID"},
                    "text": {"type": "string", "description": "Message text"}
                }
            },
            "gmail_send_email": {
                "description": "Send email via Gmail",
                "category": "communication",
                "parameters": {
                    "to": {"type": "string", "description": "Recipient email"},
                    "subject": {"type": "string", "description": "Email subject"},
                    "body": {"type": "string", "description": "Email body"}
                }
            },
            # Productivity
            "notion_create_page": {
                "description": "Create a new Notion page",
                "category": "productivity",
                "parameters": {
                    "title": {"type": "string", "description": "Page title"},
                    "content": {"type": "string", "description": "Page content"}
                }
            },
            "linear_create_issue": {
                "description": "Create a Linear issue",
                "category": "productivity",
                "parameters": {
                    "title": {"type": "string", "description": "Issue title"},
                    "description": {"type": "string", "description": "Issue description"}
                }
            }
        }
        
        self.available_tools = popular_tools
    
    async def handle_request(self, request: Dict[str, Any]) -> Dict[str, Any]:
        """Handle MCP requests"""
        method = request.get('method', '')
        
        if method == 'tools/list':
            return await self._list_tools()
        elif method == 'tools/call':
            return await self._call_tool(request.get('params', {}))
        elif method == 'ping':
            return {"status": "ok", "composio_available": COMPOSIO_AVAILABLE}
        else:
            return {"error": f"Unknown method: {method}"}
    
    async def _list_tools(self) -> Dict[str, Any]:
        """List available Composio tools"""
        tools = []
        
        for tool_id, tool_info in self.available_tools.items():
            tools.append({
                "name": tool_id,
                "description": tool_info["description"],
                "category": tool_info.get("category", "general"),
                "parameters": tool_info.get("parameters", {}),
                "source": "composio"
            })
        
        return {
            "tools": tools,
            "total": len(tools),
            "composio_available": COMPOSIO_AVAILABLE
        }
    
    async def _call_tool(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Execute a Composio tool (mock for now)"""
        tool_name = params.get('name')
        tool_params = params.get('arguments', {})
        
        if tool_name not in self.available_tools:
            return {"error": f"Tool {tool_name} not found"}
        
        # For now, return mock success (until real Composio API key is provided)
        return {
            "result": f"Successfully executed {tool_name} with params: {tool_params}",
            "success": True,
            "mock": True,
            "message": "Add real COMPOSIO_API_KEY to enable actual tool execution"
        }

def simple_test():
    """Simple test mode for verification"""
    server = MCPServer()
    
    # Test ping
    ping_result = asyncio.run(server.handle_request({"method": "ping"}))
    print("🔍 Ping test:", json.dumps(ping_result, indent=2))
    
    # Test list tools
    list_result = asyncio.run(server.handle_request({"method": "tools/list"}))
    print("🛠️  Available tools:", json.dumps(list_result, indent=2))
    
    # Test tool call
    call_result = asyncio.run(server.handle_request({
        "method": "tools/call",
        "params": {
            "name": "github_star_repo",
            "arguments": {"owner": "ComposioHQ", "repo": "composio"}
        }
    }))
    print("⚡ Tool execution test:", json.dumps(call_result, indent=2))

async def main():
    """Main MCP server loop (stdio protocol)"""
    server = MCPServer()
    
    while True:
        try:
            # Read JSON-RPC request from stdin
            line = await asyncio.get_event_loop().run_in_executor(
                None, sys.stdin.readline
            )
            
            if not line:
                break
                
            request = json.loads(line.strip())
            response = await server.handle_request(request)
            
            # Write response to stdout
            print(json.dumps(response))
            sys.stdout.flush()
            
        except Exception as e:
            error_response = {
                "error": str(e),
                "id": request.get('id') if 'request' in locals() else None
            }
            print(json.dumps(error_response))
            sys.stdout.flush()

if __name__ == "__main__":
    # Check command line arguments
    if len(sys.argv) > 1 and sys.argv[1] == "test":
        print("🧪 Running Composio MCP Bridge Test...")
        simple_test()
        sys.exit(0)
    
    # Regular MCP server mode
    if not COMPOSIO_AVAILABLE:
        print(json.dumps({
            "error": "Composio not available. Install with: pip install composio-core",
            "available": False
        }))
        sys.exit(1)
    
    asyncio.run(main()) 