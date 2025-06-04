#!/usr/bin/env python3
"""
Per-User Composio MCP Bridge

Supports multiple users with individual API keys and tool access.
Each user has isolated Composio connections and permissions.
"""

import asyncio
import json
import os
import sys
import logging
from typing import Dict, List, Any, Optional
from dataclasses import dataclass

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

@dataclass
class UserContext:
    """User execution context"""
    user_id: str
    api_key: Optional[str] = None
    enabled_tools: List[str] = None
    preferences: Dict[str, Any] = None

class UserComposioManager:
    """Manages per-user Composio clients"""
    
    def __init__(self):
        self.user_clients: Dict[str, ComposioToolSet] = {}
        self.available_tools = {}
        self._discover_base_tools()
    
    def _discover_base_tools(self):
        """Discover popular Composio tools (lightweight subset)"""
        popular_tools = {
            # Development
            "github_star_repo": {
                "description": "Star a GitHub repository",
                "category": "development",
                "parameters": {
                    "owner": {"type": "string", "description": "Repository owner"},
                    "repo": {"type": "string", "description": "Repository name"}
                }
            },
            "github_create_issue": {
                "description": "Create a GitHub issue",
                "category": "development", 
                "parameters": {
                    "owner": {"type": "string", "description": "Repository owner"},
                    "repo": {"type": "string", "description": "Repository name"},
                    "title": {"type": "string", "description": "Issue title"},
                    "body": {"type": "string", "description": "Issue description"}
                }
            },
            
            # Communication
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
                    "content": {"type": "string", "description": "Page content"},
                    "parent_page_id": {"type": "string", "description": "Parent page ID (optional)", "required": False}
                }
            },
            "linear_create_issue": {
                "description": "Create a Linear issue",
                "category": "productivity",
                "parameters": {
                    "title": {"type": "string", "description": "Issue title"},
                    "description": {"type": "string", "description": "Issue description"},
                    "team_id": {"type": "string", "description": "Team ID (optional)", "required": False}
                }
            }
        }
        
        self.available_tools = popular_tools
    
    def get_user_client(self, user_context: UserContext) -> Optional[ComposioToolSet]:
        """Get or create Composio client for specific user"""
        if not user_context.api_key or not COMPOSIO_AVAILABLE:
            return None
            
        client_key = f"{user_context.user_id}_{hash(user_context.api_key)}"
        
        if client_key not in self.user_clients:
            try:
                # Create user-specific client with entity isolation
                self.user_clients[client_key] = ComposioToolSet(
                    api_key=user_context.api_key,
                    entity_id=user_context.user_id  # Isolate user's connected accounts
                )
                logging.info(f"✅ Created Composio client for user: {user_context.user_id}")
            except Exception as e:
                logging.error(f"❌ Failed to create Composio client for user {user_context.user_id}: {e}")
                return None
        
        return self.user_clients[client_key]
    
    async def execute_tool_for_user(self, tool_name: str, params: Dict[str, Any], user_context: UserContext) -> Dict[str, Any]:
        """Execute tool with user-specific API key and permissions"""
        
        # Check if user has this tool enabled
        if user_context.enabled_tools and tool_name not in user_context.enabled_tools:
            return {
                "error": f"Tool '{tool_name}' not enabled for user {user_context.user_id}",
                "available_tools": user_context.enabled_tools
            }
        
        # Check if tool exists
        if tool_name not in self.available_tools:
            return {"error": f"Tool '{tool_name}' not found"}
        
        # Get user's Composio client
        client = self.get_user_client(user_context)
        
        if not client:
            return {
                "error": "No valid Composio API key provided for user",
                "mock_result": f"Mock execution of {tool_name} with params: {params}",
                "message": "Provide valid API key in user settings to enable real tool execution"
            }
        
        try:
            # Execute with real Composio API
            result = await asyncio.get_event_loop().run_in_executor(
                None, 
                lambda: client.execute_action(
                    action=tool_name,
                    params=params,
                    entity_id=user_context.user_id
                )
            )
            
            return {
                "success": True,
                "result": result,
                "user_id": user_context.user_id,
                "tool": tool_name
            }
            
        except Exception as e:
            logging.error(f"❌ Tool execution failed for user {user_context.user_id}: {e}")
            return {
                "error": f"Tool execution failed: {str(e)}",
                "mock_result": f"Mock execution of {tool_name} with params: {params}",
                "message": "Check your tool connections in Composio dashboard"
            }
    
    def get_available_tools_for_user(self, user_context: UserContext) -> List[Dict[str, Any]]:
        """Get tools available to specific user"""
        tools = []
        
        for tool_id, tool_info in self.available_tools.items():
            # Filter by user's enabled tools if specified
            if user_context.enabled_tools and tool_id not in user_context.enabled_tools:
                continue
                
            tools.append({
                "name": tool_id,
                "description": tool_info["description"],
                "category": tool_info.get("category", "general"),
                "parameters": tool_info.get("parameters", {}),
                "source": "composio",
                "enabled": True,
                "user_id": user_context.user_id
            })
        
        return tools

# Global manager instance
user_manager = UserComposioManager()

# Enhanced MCP Server with user context support
class PerUserMCPServer:
    def __init__(self):
        self.user_manager = user_manager
        
    def _parse_user_context(self, request: Dict[str, Any]) -> UserContext:
        """Extract user context from request"""
        user_data = request.get('user_context', {})
        
        return UserContext(
            user_id=user_data.get('user_id', 'anonymous'),
            api_key=user_data.get('composio_api_key'),
            enabled_tools=user_data.get('enabled_tools', []),
            preferences=user_data.get('preferences', {})
        )
    
    async def handle_request(self, request: Dict[str, Any]) -> Dict[str, Any]:
        """Handle MCP requests with user context"""
        method = request.get('method', '')
        user_context = self._parse_user_context(request)
        
        if method == 'tools/list':
            return await self._list_tools_for_user(user_context)
        elif method == 'tools/call':
            return await self._call_tool_for_user(request.get('params', {}), user_context)
        elif method == 'ping':
            return {
                "status": "ok", 
                "composio_available": COMPOSIO_AVAILABLE,
                "user_id": user_context.user_id,
                "has_api_key": bool(user_context.api_key)
            }
        elif method == 'user/validate':
            return await self._validate_user_setup(user_context)
        else:
            return {"error": f"Unknown method: {method}"}
    
    async def _list_tools_for_user(self, user_context: UserContext) -> Dict[str, Any]:
        """List tools available to specific user"""
        tools = self.user_manager.get_available_tools_for_user(user_context)
        
        return {
            "tools": tools,
            "total": len(tools),
            "user_id": user_context.user_id,
            "composio_available": COMPOSIO_AVAILABLE,
            "has_api_key": bool(user_context.api_key)
        }
    
    async def _call_tool_for_user(self, params: Dict[str, Any], user_context: UserContext) -> Dict[str, Any]:
        """Execute tool for specific user"""
        tool_name = params.get('name')
        tool_params = params.get('arguments', {})
        
        result = await self.user_manager.execute_tool_for_user(tool_name, tool_params, user_context)
        
        # Add execution metadata
        result.update({
            "user_id": user_context.user_id,
            "timestamp": asyncio.get_event_loop().time(),
            "tool_name": tool_name
        })
        
        return result
    
    async def _validate_user_setup(self, user_context: UserContext) -> Dict[str, Any]:
        """Validate user's Composio setup"""
        if not user_context.api_key:
            return {
                "valid": False,
                "message": "No API key provided",
                "user_id": user_context.user_id
            }
        
        client = self.user_manager.get_user_client(user_context)
        if not client:
            return {
                "valid": False,
                "message": "Failed to create Composio client",
                "user_id": user_context.user_id
            }
        
        try:
            # Test the connection (you can add real API call here)
            return {
                "valid": True,
                "message": "Composio client created successfully",
                "user_id": user_context.user_id,
                "enabled_tools": user_context.enabled_tools,
                "tools_count": len(user_context.enabled_tools or [])
            }
        except Exception as e:
            return {
                "valid": False,
                "message": f"Connection test failed: {str(e)}",
                "user_id": user_context.user_id
            }

def simple_test():
    """Simple test mode for verification"""
    server = PerUserMCPServer()
    
    # Test user context
    test_user_context = {
        "user_context": {
            "user_id": "test_user_123",
            "composio_api_key": "test_key_456",
            "enabled_tools": ["github_star_repo", "slack_send_message"],
            "preferences": {"framework": "openai"}
        }
    }
    
    # Test ping
    ping_result = asyncio.run(server.handle_request({
        "method": "ping",
        **test_user_context
    }))
    print("🔍 Ping test:", json.dumps(ping_result, indent=2))
    
    # Test list tools for user
    list_result = asyncio.run(server.handle_request({
        "method": "tools/list",
        **test_user_context
    }))
    print("🛠️  User's available tools:", json.dumps(list_result, indent=2))
    
    # Test tool call for user
    call_result = asyncio.run(server.handle_request({
        "method": "tools/call",
        "params": {
            "name": "github_star_repo",
            "arguments": {"owner": "ComposioHQ", "repo": "composio"}
        },
        **test_user_context
    }))
    print("⚡ Tool execution test:", json.dumps(call_result, indent=2))
    
    # Test user validation
    validate_result = asyncio.run(server.handle_request({
        "method": "user/validate",
        **test_user_context
    }))
    print("✅ User validation test:", json.dumps(validate_result, indent=2))

async def main():
    """Main MCP server loop (stdio protocol)"""
    server = PerUserMCPServer()
    
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
    # Set up logging
    logging.basicConfig(level=logging.INFO)
    
    # Check command line arguments
    if len(sys.argv) > 1 and sys.argv[1] == "test":
        print("🧪 Running Per-User Composio MCP Bridge Test...")
        simple_test()
        sys.exit(0)
    
    # Regular MCP server mode
    if not COMPOSIO_AVAILABLE:
        print(json.dumps({
            "error": "Composio not available. Install with: pip install composio-core",
            "available": False
        }))
        sys.exit(1)
    
    print(json.dumps({
        "status": "Per-User Composio MCP Bridge starting...",
        "composio_available": COMPOSIO_AVAILABLE
    }), file=sys.stderr)
    
    asyncio.run(main()) 