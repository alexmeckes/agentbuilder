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

# Import encryption service for handling encrypted API keys
try:
    from encryption_service import get_encryption_service
    ENCRYPTION_AVAILABLE = True
except ImportError:
    ENCRYPTION_AVAILABLE = False
    logging.warning("Encryption service not available, encrypted keys won't be supported")

# Try to import Composio with correct import path
try:
    # Only import for type hints, don't actually use the SDK
    COMPOSIO_AVAILABLE = True
    logging.info("🚀 Using HTTP-only Composio integration (no SDK)")
except ImportError:
    COMPOSIO_AVAILABLE = False
    logging.warning("Composio integration disabled")

@dataclass
class UserContext:
    """User execution context"""
    user_id: str
    api_key: Optional[str] = None
    enabled_tools: List[str] = None
    preferences: Dict[str, Any] = None

class ComposioHttpClient:
    """Manages per-user Composio clients via HTTP API only"""
    
    def __init__(self):
        # No SDK clients - pure HTTP API approach
        self.user_api_keys: Dict[str, str] = {}  # user_id -> api_key
        self.available_tools = {}
        self._discover_base_tools()
        self._dynamic_discovery_cache = {}
        logging.info("🚀 Composio manager initialized with HTTP-only approach")
    
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
        # Get decrypted API key for discovery
        actual_api_key = user_context.api_key
        if user_context.api_key and user_context.api_key.startswith('encrypted:'):
            logging.warning("🔐 API key is encrypted - using fallback tools for discovery")
            actual_api_key = None
        
        if not actual_api_key:
            logging.info("No decrypted API key available, using fallback tools")
            return self.available_tools
        
        # Check cache first (cache for 1 hour per user)
        cache_key = f"{user_context.user_id}_{hash(actual_api_key)}"
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
                        headers={'x-api-key': actual_api_key, 'Content-Type': 'application/json'},
                        timeout=aiohttp.ClientTimeout(total=15)
                    ) as response:
                        connected_apps = []
                        if response.status == 200:
                            accounts_data = await response.json(content_type=None)
                            
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
                            headers={'x-api-key': actual_api_key, 'Content-Type': 'application/json'},
                            timeout=aiohttp.ClientTimeout(total=10)
                        ) as actions_response:
                            if actions_response.status == 200:
                                actions_data = await actions_response.json(content_type=None)
                                
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
    
    def _extract_app_name_from_tool(self, tool_name: str) -> str:
        """Extract app name from tool name"""
        # Handle specific patterns
        if tool_name.startswith('GOOGLEDOCS_'):
            return 'googledocs'
        elif tool_name.startswith('GITHUB_'):
            return 'github'
        elif tool_name.startswith('SLACK_'):
            return 'slack'
        elif tool_name.startswith('GMAIL_'):
            return 'gmail'
        elif tool_name.startswith('NOTION_'):
            return 'notion'
        
        # Fallback: try to extract from prefix
        parts = tool_name.lower().split('_')
        if len(parts) > 0:
            return parts[0]
        
        return 'unknown'
    
    def get_user_client(self, user_context: UserContext) -> bool:
        """Register user's API key for HTTP API calls (no SDK client creation)"""
        # Get the actual API key (decrypted if needed)
        actual_api_key = self._get_decrypted_api_key(user_context)
        
        if not actual_api_key or not COMPOSIO_AVAILABLE:
            return False
            
        # Store API key for HTTP calls (no SDK initialization)
        self.user_api_keys[user_context.user_id] = actual_api_key
        logging.info(f"✅ Registered API key for user: {user_context.user_id} (HTTP-only)")
        return True
    
    def get_user_api_key(self, user_context: UserContext) -> Optional[str]:
        """Get user's API key for direct HTTP calls"""
        return self.user_api_keys.get(user_context.user_id) or self._get_decrypted_api_key(user_context)
    
    async def execute_tool_for_user(self, tool_name: str, params: Dict[str, Any], user_context: UserContext, retry_count: int = 0) -> Dict[str, Any]:
        """Execute tool with user-specific API key via HTTP API only"""
        
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
        
        # Get app name from tool info (for HTTP API)
        tool_info = available_tools[tool_name]
        app_name = tool_info.get('app_name', self._extract_app_name_from_tool(tool_name))
        
        # Get user's API key (HTTP-only approach)
        actual_api_key = self.get_user_api_key(user_context)
        
        if not actual_api_key:
            return {
                "error": "No valid Composio API key provided for user",
                "mock_result": f"Mock execution of {tool_name} with params: {params}",
                "message": "💡 Check your tool connections in Composio dashboard"
            }
        
        try:
            # Execute with direct HTTP API only
            import aiohttp
            
            async with aiohttp.ClientSession() as session:
                # Use direct HTTP API approach (no SDK)
                async with session.post(
                    f'https://backend.composio.dev/api/v2/actions/{tool_name}/execute',
                    headers={'x-api-key': actual_api_key, 'Content-Type': 'application/json'},
                    json={
                        "input": params,
                        "entityId": "default",
                        "appName": app_name  # Dynamic app name based on tool
                    },
                    timeout=aiohttp.ClientTimeout(total=30)
                ) as response:
                    if response.status == 200:
                        result = await response.json(content_type=None)
                        return {
                            "success": True,
                            "result": result,
                            "user_id": user_context.user_id,
                            "tool": tool_name,
                            "retry_count": retry_count,
                            "method": "http_api_direct"
                        }
                    elif response.status == 429 and retry_count < 3:
                        # Rate limited - retry with exponential backoff
                        wait_time = (2 ** retry_count) * 1.0  # 1s, 2s, 4s
                        logging.warning(f"Rate limited for tool {tool_name}, retrying in {wait_time}s (attempt {retry_count + 1}/3)")
                        await asyncio.sleep(wait_time)
                        return await self.execute_tool_for_user(tool_name, params, user_context, retry_count + 1)
                    elif response.status in [500, 502, 503] and retry_count < 2:
                        # Server error - retry
                        wait_time = (2 ** retry_count) * 0.5  # 0.5s, 1s
                        logging.warning(f"Server error {response.status} for tool {tool_name}, retrying in {wait_time}s (attempt {retry_count + 1}/2)")
                        await asyncio.sleep(wait_time)
                        return await self.execute_tool_for_user(tool_name, params, user_context, retry_count + 1)
                    else:
                        error_text = await response.text()
                        return {
                            "error": f"HTTP {response.status}: {error_text}",
                            "user_id": user_context.user_id,
                            "tool": tool_name,
                            "retry_count": retry_count,
                            "status_code": response.status
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
    
    def _get_decrypted_api_key(self, user_context: UserContext) -> Optional[str]:
        """Get decrypted API key for actual API calls"""
        if not user_context.api_key:
            return None
        
        # Check if it's an encrypted key
        if user_context.api_key.startswith('encrypted:'):
            # For now, we'll need the frontend to provide the decrypted key
            # In a real implementation, this would require client-side decryption
            # or a secure key decryption service with user authentication
            logging.warning("🔐 API key is encrypted - frontend needs to provide decrypted key for API calls")
            return None
        else:
            # Unencrypted key - return as is
            return user_context.api_key
    
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
user_manager = ComposioHttpClient()

# Enhanced MCP Server with user context support
class PerUserComposioManager:
    def __init__(self):
        self.user_manager = user_manager
        # Get user context from environment variables (set by MCP server config)
        self.default_user_context = self._get_user_context_from_env()
        
    def _get_user_context_from_env(self) -> UserContext:
        """Get user context from environment variables set by MCP server configuration"""
        # Check if we have encrypted keys
        encryption_enabled = os.getenv('ENCRYPTION_ENABLED', 'false').lower() == 'true'
        user_id = os.getenv('USER_ID', 'default_user')
        enabled_tools_str = os.getenv('ENABLED_TOOLS', '')
        
        api_key = None
        
        if encryption_enabled and ENCRYPTION_AVAILABLE:
            # Handle encrypted API key
            encrypted_key = os.getenv('ENCRYPTED_COMPOSIO_KEY', '')
            key_id = os.getenv('KEY_ID', '')
            
            if encrypted_key and key_id:
                try:
                    # Use server-side encryption service to get client-encrypted data
                    encryption_service = get_encryption_service()
                    client_encrypted = encryption_service.retrieve_encrypted_api_key(user_id, key_id)
                    
                    if client_encrypted:
                        # Store the client-encrypted data for later decryption when needed
                        # Note: The actual API key is still encrypted and will need client-side decryption
                        api_key = f"encrypted:{client_encrypted}"
                        logging.info(f"🔐 Retrieved encrypted API key for user: {user_id}")
                    else:
                        logging.warning(f"⚠️ Could not retrieve encrypted key for user: {user_id}")
                        
                except Exception as e:
                    logging.error(f"❌ Failed to decrypt API key for user {user_id}: {e}")
            else:
                logging.warning(f"⚠️ Encryption enabled but missing encrypted key data for user: {user_id}")
        else:
            # Handle legacy unencrypted API key
            api_key = os.getenv('COMPOSIO_API_KEY', '')
            if api_key:
                logging.info(f"🔓 Using unencrypted API key for user: {user_id}")
        
        # Parse enabled tools from comma-separated string
        enabled_tools = []
        if enabled_tools_str:
            enabled_tools = [tool.strip() for tool in enabled_tools_str.split(',') if tool.strip()]
        
        logging.info(f"🔧 Composio MCP Bridge initialized for user: {user_id}")
        logging.info(f"🔧 API key configured: {'✅ Yes' if api_key else '❌ No'}")
        logging.info(f"🔧 Encryption enabled: {'✅ Yes' if encryption_enabled else '❌ No'}")
        logging.info(f"🔧 Enabled tools: {enabled_tools if enabled_tools else 'All tools'}")
        
        return UserContext(
            user_id=user_id,
            api_key=api_key if api_key else None,
            enabled_tools=enabled_tools,
            preferences={}
        )
    
    def _create_user_context_with_decrypted_key(self, user_context: UserContext, decrypted_key: str) -> UserContext:
        """Create a new user context with decrypted API key for API operations"""
        return UserContext(
            user_id=user_context.user_id,
            api_key=decrypted_key,
            enabled_tools=user_context.enabled_tools,
            preferences=user_context.preferences
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
        elif method == 'tools/call_with_key':
            # Special method that accepts a decrypted API key from frontend
            return await self._call_tool_with_decrypted_key(request.get('params', {}), user_context, request.get('decrypted_api_key', ''))
        elif method == 'ping':
            return {
                "status": "ok", 
                "composio_available": COMPOSIO_AVAILABLE,
                "user_id": user_context.user_id,
                "has_api_key": bool(user_context.api_key),
                "encryption_enabled": user_context.api_key and user_context.api_key.startswith('encrypted:') if user_context.api_key else False
            }
        elif method == 'user/validate':
            return await self._validate_user_setup(user_context)
        elif method == 'user/decrypt_test':
            # Test method to verify decrypted key works
            return await self._test_decrypted_key(user_context, request.get('decrypted_api_key', ''))
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
    
    async def _call_tool_with_decrypted_key(self, params: Dict[str, Any], user_context: UserContext, decrypted_api_key: str) -> Dict[str, Any]:
        """Execute tool with provided decrypted API key"""
        if not decrypted_api_key:
            return {
                "error": "Decrypted API key is required",
                "user_id": user_context.user_id
            }
        
        # Create a new user context with the decrypted key
        decrypted_context = self._create_user_context_with_decrypted_key(user_context, decrypted_api_key)
        
        # Execute the tool with the decrypted context
        return await self.user_manager.execute_tool_for_user(
            params.get('name'),
            params.get('arguments', {}),
            decrypted_context
        )
    
    async def _test_decrypted_key(self, user_context: UserContext, decrypted_api_key: str) -> Dict[str, Any]:
        """Test if the provided decrypted API key works"""
        if not decrypted_api_key:
            return {
                "valid": False,
                "message": "Decrypted API key is required",
                "user_id": user_context.user_id
            }
        
        try:
            # Test the key by making a simple API call
            import aiohttp
            
            async with aiohttp.ClientSession() as session:
                async with session.get(
                    'https://backend.composio.dev/api/v1/connectedAccounts',
                    headers={'x-api-key': decrypted_api_key, 'Content-Type': 'application/json'},
                    timeout=aiohttp.ClientTimeout(total=10)
                ) as response:
                    if response.status == 200:
                        accounts_data = await response.json(content_type=None)
                        return {
                            "valid": True,
                            "message": "Decrypted API key is valid",
                            "user_id": user_context.user_id,
                            "connected_accounts": len(accounts_data.get('items', []))
                        }
                    else:
                        return {
                            "valid": False,
                            "message": f"API key validation failed: HTTP {response.status}",
                            "user_id": user_context.user_id
                        }
        except Exception as e:
            return {
                "valid": False,
                "message": f"API key test failed: {str(e)}",
                "user_id": user_context.user_id
            }
    
    async def _validate_user_setup(self, user_context: UserContext) -> Dict[str, Any]:
        """Validate user's Composio setup using HTTP API only"""
        if not user_context.api_key:
            return {
                "valid": False,
                "message": "No API key provided",
                "user_id": user_context.user_id
            }
        
        # Register API key for HTTP calls (no SDK client creation)
        api_key_registered = self.user_manager.get_user_client(user_context)
        if not api_key_registered:
            return {
                "valid": False,
                "message": "Failed to register API key for HTTP access",
                "user_id": user_context.user_id
            }
        
        try:
            # Test API key with a simple HTTP call
            actual_api_key = self.user_manager.get_user_api_key(user_context)
            if actual_api_key:
                import aiohttp
                
                async with aiohttp.ClientSession() as session:
                    async with session.get(
                        'https://backend.composio.dev/api/v1/connectedAccounts',
                        headers={'x-api-key': actual_api_key, 'Content-Type': 'application/json'},
                        timeout=aiohttp.ClientTimeout(total=10)
                    ) as response:
                        if response.status == 200:
                            return {
                                "valid": True,
                                "message": "Composio HTTP API connection successful",
                                "user_id": user_context.user_id,
                                "enabled_tools": user_context.enabled_tools,
                                "tools_count": len(user_context.enabled_tools or []),
                                "method": "http_api_direct"
                            }
                        else:
                            return {
                                "valid": False,
                                "message": f"API key validation failed: HTTP {response.status}",
                                "user_id": user_context.user_id
                            }
            else:
                return {
                    "valid": False,
                    "message": "No valid API key available for HTTP calls",
                    "user_id": user_context.user_id
                }
        except Exception as e:
            return {
                "valid": False,
                "message": f"Connection test failed: {str(e)}",
                "user_id": user_context.user_id
            }

def simple_test():
    """Simple test mode for verification"""
    server = PerUserComposioManager()
    
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
    server = PerUserComposioManager()
    
    # Check if stdin is available (not running as detached subprocess)
    import select
    import sys
    
    try:
        # Test if stdin is available for reading without blocking
        if hasattr(select, 'select'):
            # Unix-like systems
            ready, _, _ = select.select([sys.stdin], [], [], 0)
            stdin_available = bool(ready)
        else:
            # Windows or when select is not available
            stdin_available = sys.stdin.isatty()
    except:
        stdin_available = False
    
    if not stdin_available:
        # Running as subprocess without stdin - use standalone mode
        print(json.dumps({
            "status": "Composio MCP Bridge ready (standalone HTTP-only mode)",
            "composio_available": COMPOSIO_AVAILABLE,
            "user_id": server.default_user_context.user_id,
            "has_api_key": bool(server.default_user_context.api_key),
            "method": "http_api_direct"
        }), file=sys.stderr)
        
        # Keep the process alive but don't block
        try:
            while True:
                await asyncio.sleep(1)
        except KeyboardInterrupt:
            print("Composio MCP Bridge shutting down...", file=sys.stderr)
            return
    
    # Original stdin/stdout protocol mode
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
        "status": "Per-User Composio MCP Bridge starting (HTTP-only mode)...",
        "composio_available": COMPOSIO_AVAILABLE,
        "method": "http_api_direct"
    }), file=sys.stderr)
    
    asyncio.run(main()) 