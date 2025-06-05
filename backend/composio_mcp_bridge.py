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
    ComposioToolSetType = ComposioToolSet
except ImportError:
    try:
        # Alternative import path
        from composio.client import Composio
        from composio.tools import ComposioToolSet
        COMPOSIO_AVAILABLE = True
        ComposioToolSetType = ComposioToolSet
    except ImportError:
        COMPOSIO_AVAILABLE = False
        # Create dummy type for type annotations when Composio is not available
        ComposioToolSetType = Any

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
        self.user_clients: Dict[str, ComposioToolSetType] = {}
        self.available_tools = {}
        self._discover_base_tools()
        self._dynamic_discovery_cache = {}
    
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
            
            # Google Workspace
            "GOOGLEDOCS_CREATE_DOCUMENT": {
                "description": "Create a new Google Docs document",
                "category": "productivity",
                "parameters": {
                    "title": {"type": "string", "description": "Document title"},
                    "text": {"type": "string", "description": "Document text content"},
                    "folder_id": {"type": "string", "description": "Folder ID (optional)", "required": False}
                }
            },
            "googlesheets_create_sheet": {
                "description": "Create a new Google Sheets spreadsheet",
                "category": "productivity",
                "parameters": {
                    "title": {"type": "string", "description": "Spreadsheet title"},
                    "folder_id": {"type": "string", "description": "Folder ID (optional)", "required": False}
                }
            },
            "googledrive_upload": {
                "description": "Upload file to Google Drive",
                "category": "productivity",
                "parameters": {
                    "file_name": {"type": "string", "description": "File name"},
                    "content": {"type": "string", "description": "File content or path"},
                    "folder_id": {"type": "string", "description": "Folder ID (optional)", "required": False}
                }
            },
            "googlecalendar_create_event": {
                "description": "Create a Google Calendar event",
                "category": "productivity",
                "parameters": {
                    "title": {"type": "string", "description": "Event title"},
                    "start_time": {"type": "string", "description": "Start time (ISO format)"},
                    "end_time": {"type": "string", "description": "End time (ISO format)"},
                    "description": {"type": "string", "description": "Event description (optional)", "required": False}
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
            },
            "trello_create_card": {
                "description": "Create a Trello card",
                "category": "productivity",
                "parameters": {
                    "name": {"type": "string", "description": "Card name"},
                    "description": {"type": "string", "description": "Card description"},
                    "list_id": {"type": "string", "description": "List ID"}
                }
            },
            
            # Business/CRM
            "airtable_create_record": {
                "description": "Create record in Airtable",
                "category": "productivity",
                "parameters": {
                    "base_id": {"type": "string", "description": "Base ID"},
                    "table_name": {"type": "string", "description": "Table name"},
                    "fields": {"type": "object", "description": "Record fields"}
                }
            },
            
            # Development Tools
            "jira_create_issue": {
                "description": "Create a JIRA issue",
                "category": "development",
                "parameters": {
                    "project_key": {"type": "string", "description": "Project key"},
                    "summary": {"type": "string", "description": "Issue summary"},
                    "description": {"type": "string", "description": "Issue description"},
                    "issue_type": {"type": "string", "description": "Issue type (optional)", "required": False}
                }
            }
        }
        
        self.available_tools = popular_tools
    
    async def discover_actions_for_user(self, user_context: UserContext) -> Dict[str, Dict[str, Any]]:
        """Dynamically discover real actions from Composio API for user's connected apps"""
        if not user_context.api_key:
            logging.info("No API key provided, using fallback tools")
            return self.available_tools
        
        # Check cache first (cache for 1 hour per user)
        cache_key = f"{user_context.user_id}_{hash(user_context.api_key)}"
        if cache_key in self._dynamic_discovery_cache:
            cached_data = self._dynamic_discovery_cache[cache_key]
            if cached_data.get('timestamp', 0) > asyncio.get_event_loop().time() - 3600:  # 1 hour cache
                logging.info(f"Using cached actions for user {user_context.user_id}")
                return cached_data['tools']
        
        discovered_tools = {}
        
        try:
            # Dynamic import to avoid startup issues
            import aiohttp
            
            async with aiohttp.ClientSession() as session:
                # First, get connected accounts
                try:
                                         async with session.get(
                         'https://backend.composio.dev/api/v1/connectedAccounts',
                         headers={'x-api-key': user_context.api_key, 'Content-Type': 'application/json'},
                         timeout=aiohttp.ClientTimeout(total=15)
                     ) as response:
                        connected_apps = []
                        if response.status == 200:
                            accounts_data = await response.json()
                            
                            if accounts_data.get('items'):
                                connected_apps = [
                                    item.get('appName') or item.get('name') or item.get('slug') 
                                    for item in accounts_data['items']
                                ]
                                connected_apps = [app for app in connected_apps if app]
                            
                            logging.info(f"🔍 User {user_context.user_id} connected apps: {connected_apps}")
                        else:
                            logging.warning(f"Failed to fetch connected accounts: {response.status}")
                            
                except Exception as e:
                    logging.warning(f"Error fetching connected accounts: {e}")
                    connected_apps = []
                
                # If no connected apps found, use common ones
                if not connected_apps:
                    connected_apps = ['googledocs', 'github', 'gmail', 'slack', 'notion']
                    logging.info(f"Using fallback apps for user {user_context.user_id}")
                
                # Fetch actions for each connected app
                for app_name in connected_apps[:5]:  # Limit to 5 apps for performance
                    try:
                        async with session.get(
                            f'https://backend.composio.dev/api/v1/actions?appNames={app_name}',
                            headers={'x-api-key': user_context.api_key, 'Content-Type': 'application/json'},
                            timeout=aiohttp.ClientTimeout(total=10)
                        ) as actions_response:
                            if actions_response.status == 200:
                                actions_data = await actions_response.json()
                                
                                if actions_data.get('items'):
                                    for action in actions_data['items']:
                                        action_name = action.get('name')
                                        if action_name:
                                            discovered_tools[action_name] = {
                                                "description": action.get('description', f"Action for {app_name}"),
                                                "category": self._categorize_app(app_name),
                                                "parameters": action.get('parameters', {}),
                                                "app_name": app_name,
                                                "display_name": action.get('displayName', action_name),
                                                "source": "dynamic_discovery"
                                            }
                                    
                                    logging.info(f"✅ Discovered {len(actions_data['items'])} actions for {app_name}")
                            else:
                                logging.warning(f"Failed to fetch actions for {app_name}: {actions_response.status}")
                    except Exception as e:
                        logging.warning(f"Error fetching actions for {app_name}: {e}")
                        
        except ImportError:
            logging.warning("aiohttp not available, using fallback tools")
            return self.available_tools
        except Exception as e:
            logging.error(f"Error during dynamic action discovery: {e}")
            return self.available_tools
        
        # If we discovered any tools, merge with fallback tools and cache
        if discovered_tools:
            # Merge discovered tools with fallback tools (discovered takes priority)
            final_tools = {**self.available_tools, **discovered_tools}
            
            # Cache the result
            self._dynamic_discovery_cache[cache_key] = {
                'tools': final_tools,
                'timestamp': asyncio.get_event_loop().time()
            }
            
            logging.info(f"🎉 Successfully discovered {len(discovered_tools)} real actions for user {user_context.user_id}")
            return final_tools
        else:
            logging.info(f"No dynamic actions discovered for user {user_context.user_id}, using fallback")
            return self.available_tools
    
    def _categorize_app(self, app_name: str) -> str:
        """Categorize app by name"""
        app_categories = {
            'github': 'development',
            'slack': 'communication',
            'gmail': 'communication',
            'googledocs': 'productivity',
            'googlesheets': 'productivity',
            'notion': 'productivity',
            'linear': 'productivity',
            'trello': 'productivity'
        }
        return app_categories.get(app_name.lower(), 'general')
    
    def get_user_client(self, user_context: UserContext) -> Optional[ComposioToolSetType]:
        """Get or create Composio client for specific user"""
        if not user_context.api_key or not COMPOSIO_AVAILABLE:
            return None
            
        client_key = f"{user_context.user_id}_{hash(user_context.api_key)}"
        
        if client_key not in self.user_clients:
            try:
                # Create user-specific client with entity isolation
                self.user_clients[client_key] = ComposioToolSetType(
                    api_key=user_context.api_key,
                    entity_id="default"  # Use default entity as per API requirements
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
        
        # Get available tools for this user (includes dynamic discovery)
        try:
            available_tools = await self.discover_actions_for_user(user_context)
        except Exception as e:
            logging.warning(f"Dynamic discovery failed for execution, using fallback: {e}")
            available_tools = self.available_tools
        
        # Check if tool exists
        if tool_name not in available_tools:
            return {"error": f"Tool '{tool_name}' not found in available tools: {list(available_tools.keys())[:10]}"}
        
        # Get user's Composio client
        client = self.get_user_client(user_context)
        
        if not client:
            return {
                "error": "No valid Composio API key provided for user",
                "mock_result": f"Mock execution of {tool_name} with params: {params}",
                "message": "💡 Check your tool connections in Composio dashboard"
            }
        
        try:
            # Execute with real Composio API
            result = await asyncio.get_event_loop().run_in_executor(
                None, 
                lambda: client.execute_action(
                    action=tool_name,
                    params=params,
                    entity_id="default"  # Use default entity ID as per API requirements
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
                "message": "💡 Check your tool connections in Composio dashboard"
            }
    
    async def get_available_tools_for_user(self, user_context: UserContext) -> List[Dict[str, Any]]:
        """Get tools available to specific user (with dynamic discovery)"""
        # Use dynamic discovery to get real actions if API key is available
        try:
            available_tools = await self.discover_actions_for_user(user_context)
        except Exception as e:
            logging.warning(f"Dynamic discovery failed, using fallback: {e}")
            available_tools = self.available_tools
        
        tools = []
        
        for tool_id, tool_info in available_tools.items():
            # Filter by user's enabled tools if specified
            if user_context.enabled_tools and tool_id not in user_context.enabled_tools:
                continue
                
            tools.append({
                "name": tool_id,
                "description": tool_info["description"],
                "category": tool_info.get("category", "general"),
                "parameters": tool_info.get("parameters", {}),
                "source": tool_info.get("source", "composio"),
                "app_name": tool_info.get("app_name", "unknown"),
                "display_name": tool_info.get("display_name", tool_id),
                "enabled": True,
                "user_id": user_context.user_id
            })
        
        return tools
    
    def get_available_tools_for_user_sync(self, user_context: UserContext) -> List[Dict[str, Any]]:
        """Synchronous version - fallback for sync contexts"""
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
        # Get user context from environment variables (set by MCP server config)
        self.default_user_context = self._get_user_context_from_env()
        
    def _get_user_context_from_env(self) -> UserContext:
        """Get user context from environment variables set by MCP server configuration"""
        api_key = os.getenv('COMPOSIO_API_KEY', '')
        user_id = os.getenv('USER_ID', 'default_user')
        enabled_tools_str = os.getenv('ENABLED_TOOLS', '')
        
        # Parse enabled tools from comma-separated string
        enabled_tools = []
        if enabled_tools_str:
            enabled_tools = [tool.strip() for tool in enabled_tools_str.split(',') if tool.strip()]
        
        logging.info(f"🔧 Composio MCP Bridge initialized for user: {user_id}")
        logging.info(f"🔧 API key configured: {'✅ Yes' if api_key else '❌ No'}")
        logging.info(f"🔧 Enabled tools: {enabled_tools if enabled_tools else 'All tools'}")
        
        return UserContext(
            user_id=user_id,
            api_key=api_key if api_key else None,
            enabled_tools=enabled_tools,
            preferences={}
        )
        
    def _parse_user_context(self, request: Dict[str, Any]) -> UserContext:
        """Extract user context from request, fallback to environment"""
        user_data = request.get('user_context', {})
        
        # Use environment context as default, override with request data if provided
        return UserContext(
            user_id=user_data.get('user_id', self.default_user_context.user_id),
            api_key=user_data.get('composio_api_key', self.default_user_context.api_key),
            enabled_tools=user_data.get('enabled_tools', self.default_user_context.enabled_tools),
            preferences=user_data.get('preferences', self.default_user_context.preferences)
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
        tools = await self.user_manager.get_available_tools_for_user(user_context)
        
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