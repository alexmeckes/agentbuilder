"""
MCP Server Manager

Manages Model Context Protocol (MCP) servers for the any-agent workflow composer.
Provides a bridge between MCP servers and the existing any-agent tool system.
"""

import asyncio
import json
import logging
import os
import subprocess
import sys
from typing import Dict, List, Optional, Any, Callable
from dataclasses import dataclass
from pathlib import Path
import tempfile
import shutil

# MCP protocol imports (will be installed as dependency)
try:
    from mcp import ClientSession, StdioServerParameters
    from mcp.client.stdio import stdio_client
    MCP_AVAILABLE = True
except ImportError:
    MCP_AVAILABLE = False
    logging.warning("MCP libraries not available. Install with: pip install mcp")

@dataclass
class MCPServerConfig:
    """Configuration for an MCP server"""
    id: str
    name: str
    description: str
    command: List[str]
    args: List[str] = None
    env: Dict[str, str] = None
    working_dir: str = None
    
    # Connection config
    host: str = None
    port: int = None
    credentials: Dict[str, Any] = None
    
    # Server metadata
    status: str = "disconnected"  # disconnected, connecting, connected, error
    last_error: str = None
    capabilities: List[str] = None

@dataclass 
class MCPTool:
    """Represents a tool available from an MCP server"""
    server_id: str
    name: str
    description: str
    parameters: Dict[str, Any]
    
    def to_tool_key(self) -> str:
        """Convert to key format compatible with existing tool system"""
        return f"mcp_{self.server_id}_{self.name}"

class MCPServerManager:
    """Manages MCP servers and their tools"""
    
    def __init__(self, config_dir: str = None):
        self.config_dir = config_dir or os.path.join(os.getcwd(), "mcp_config")
        self.servers: Dict[str, MCPServerConfig] = {}
        self.active_sessions: Dict[str, Any] = {}  # server_id -> session
        self.tools_cache: Dict[str, List[MCPTool]] = {}  # server_id -> tools
        
        # Ensure config directory exists
        os.makedirs(self.config_dir, exist_ok=True)
        
        # Load existing server configurations
        self._load_server_configs()
        
        logging.info(f"MCPServerManager initialized. MCP Available: {MCP_AVAILABLE}")
    
    def _load_server_configs(self):
        """Load server configurations from disk"""
        config_file = os.path.join(self.config_dir, "servers.json")
        if os.path.exists(config_file):
            try:
                with open(config_file, 'r') as f:
                    data = json.load(f)
                    for server_data in data.get('servers', []):
                        config = MCPServerConfig(**server_data)
                        self.servers[config.id] = config
                logging.info(f"Loaded {len(self.servers)} MCP server configurations")
            except Exception as e:
                logging.error(f"Failed to load MCP server configs: {e}")
    
    def _save_server_configs(self):
        """Save server configurations to disk"""
        config_file = os.path.join(self.config_dir, "servers.json")
        try:
            data = {
                'servers': [
                    {
                        'id': config.id,
                        'name': config.name,
                        'description': config.description,
                        'command': config.command,
                        'args': config.args or [],
                        'env': config.env or {},
                        'working_dir': config.working_dir,
                        'host': config.host,
                        'port': config.port,
                        'credentials': config.credentials or {},
                        'status': config.status,
                        'last_error': config.last_error,
                        'capabilities': config.capabilities or []
                    }
                    for config in self.servers.values()
                ]
            }
            with open(config_file, 'w') as f:
                json.dump(data, f, indent=2)
        except Exception as e:
            logging.error(f"Failed to save MCP server configs: {e}")
    
    async def add_server(self, server_config: MCPServerConfig) -> bool:
        """Add and connect to a new MCP server"""
        try:
            # Validate configuration
            if not server_config.command:
                raise ValueError("Server command is required")
            
            # Check if server already exists
            if server_config.id in self.servers:
                raise ValueError(f"Server {server_config.id} already exists")
            
            # Test connection
            server_config.status = "connecting"
            self.servers[server_config.id] = server_config
            
            success = await self._connect_server(server_config.id)
            if success:
                server_config.status = "connected"
                self._save_server_configs()
                logging.info(f"Successfully added MCP server: {server_config.name}")
                return True
            else:
                server_config.status = "error"
                server_config.last_error = "Failed to connect"
                return False
                
        except Exception as e:
            server_config.status = "error"
            server_config.last_error = str(e)
            logging.error(f"Failed to add MCP server {server_config.name}: {e}")
            return False
    
    async def _connect_server(self, server_id: str) -> bool:
        """Connect to an MCP server and discover its tools"""
        if not MCP_AVAILABLE:
            logging.error("MCP libraries not available")
            return False
        
        config = self.servers.get(server_id)
        if not config:
            return False
        
        try:
            # Create server parameters
            server_params = StdioServerParameters(
                command=config.command[0],
                args=config.command[1:] + (config.args or []),
                env=config.env or {}
            )
            
            # Connect to server
            async with stdio_client(server_params) as (read, write):
                async with ClientSession(read, write) as session:
                    # Initialize session
                    await session.initialize()
                    
                    # Store active session
                    self.active_sessions[server_id] = session
                    
                    # Discover tools
                    tools = await self._discover_tools(session, server_id)
                    self.tools_cache[server_id] = tools
                    
                    # Update server capabilities
                    config.capabilities = [tool.name for tool in tools]
                    
                    logging.info(f"Connected to MCP server {config.name} with {len(tools)} tools")
                    return True
                    
        except Exception as e:
            logging.error(f"Failed to connect to MCP server {server_id}: {e}")
            config.last_error = str(e)
            return False
    
    async def _discover_tools(self, session: Any, server_id: str) -> List[MCPTool]:
        """Discover available tools from an MCP server"""
        tools = []
        try:
            # List available tools from the MCP server
            response = await session.list_tools()
            
            for tool_info in response.tools:
                tool = MCPTool(
                    server_id=server_id,
                    name=tool_info.name,
                    description=tool_info.description or f"Tool from {server_id}",
                    parameters=tool_info.inputSchema or {}
                )
                tools.append(tool)
                
        except Exception as e:
            logging.error(f"Failed to discover tools for server {server_id}: {e}")
        
        return tools
    
    def get_available_tools(self) -> Dict[str, Callable]:
        """
        Get all available MCP tools in format compatible with existing any-agent tool system
        Returns dict of tool_key -> callable function
        """
        available_tools = {}
        
        for server_id, tools in self.tools_cache.items():
            if self.servers.get(server_id, {}).status != "connected":
                continue
                
            for tool in tools:
                tool_key = tool.to_tool_key()
                available_tools[tool_key] = self._create_tool_wrapper(tool)
        
        return available_tools
    
    def _create_tool_wrapper(self, tool: MCPTool) -> Callable:
        """Create a wrapper function for an MCP tool that's compatible with any-agent"""
        
        async def mcp_tool_wrapper(*args, **kwargs):
            """Wrapper function that executes MCP tool"""
            try:
                session = self.active_sessions.get(tool.server_id)
                if not session:
                    raise Exception(f"No active session for server {tool.server_id}")
                
                # Convert args/kwargs to tool parameters
                if args and len(args) == 1 and isinstance(args[0], str):
                    # Simple case: single string argument
                    tool_input = {"input": args[0]}
                else:
                    # Use kwargs directly
                    tool_input = kwargs
                
                # Call the MCP tool
                result = await session.call_tool(tool.name, tool_input)
                
                # Return result in format expected by any-agent
                if hasattr(result, 'content'):
                    return str(result.content)
                else:
                    return str(result)
                    
            except Exception as e:
                logging.error(f"Error executing MCP tool {tool.name}: {e}")
                return f"Error executing {tool.name}: {str(e)}"
        
        # Set function metadata for any-agent compatibility
        mcp_tool_wrapper.__name__ = f"mcp_{tool.server_id}_{tool.name}"
        mcp_tool_wrapper.__doc__ = tool.description
        
        return mcp_tool_wrapper
    
    def get_server_status(self) -> Dict[str, Dict[str, Any]]:
        """Get status of all configured servers"""
        status = {}
        for server_id, config in self.servers.items():
            status[server_id] = {
                'name': config.name,
                'description': config.description,
                'status': config.status,
                'last_error': config.last_error,
                'tool_count': len(self.tools_cache.get(server_id, [])),
                'capabilities': config.capabilities or []
            }
        return status
    
    def remove_server(self, server_id: str) -> bool:
        """Remove an MCP server"""
        try:
            # Disconnect if active
            if server_id in self.active_sessions:
                # Close session if possible
                try:
                    session = self.active_sessions[server_id]
                    # Note: actual session closing would depend on MCP client implementation
                    del self.active_sessions[server_id]
                except:
                    pass
            
            # Remove from cache
            if server_id in self.tools_cache:
                del self.tools_cache[server_id]
            
            # Remove configuration
            if server_id in self.servers:
                del self.servers[server_id]
                self._save_server_configs()
            
            logging.info(f"Removed MCP server: {server_id}")
            return True
            
        except Exception as e:
            logging.error(f"Failed to remove MCP server {server_id}: {e}")
            return False
    
    async def test_server_connection(self, server_id: str) -> Dict[str, Any]:
        """Test connection to an MCP server"""
        result = {
            'success': False,
            'error': None,
            'tool_count': 0,
            'tools': []
        }
        
        try:
            if server_id not in self.servers:
                raise ValueError(f"Server {server_id} not found")
            
            success = await self._connect_server(server_id)
            if success:
                tools = self.tools_cache.get(server_id, [])
                result.update({
                    'success': True,
                    'tool_count': len(tools),
                    'tools': [{'name': t.name, 'description': t.description} for t in tools]
                })
            else:
                result['error'] = self.servers[server_id].last_error or "Connection failed"
                
        except Exception as e:
            result['error'] = str(e)
        
        return result

    async def update_server_config(self, server_id: str, server_config: dict) -> bool:
        """Update an existing MCP server configuration without forcing immediate connection"""
        try:
            # Check if server exists
            if server_id not in self.servers:
                raise ValueError(f"Server {server_id} not found")
            
            # Get existing server config
            existing_config = self.servers[server_id]
            
            # Update the configuration with new values
            updated_env = existing_config.env.copy() if existing_config.env else {}
            if 'env' in server_config:
                updated_env.update(server_config['env'])
            
            # Create updated server config
            updated_config = MCPServerConfig(
                id=server_id,
                name=server_config.get('name', existing_config.name),
                description=server_config.get('description', existing_config.description),
                command=server_config.get('command', existing_config.command),
                args=server_config.get('args', existing_config.args or []),
                env=updated_env,
                working_dir=server_config.get('working_dir', existing_config.working_dir),
                host=server_config.get('host', existing_config.host),
                port=server_config.get('port', existing_config.port),
                credentials=server_config.get('credentials', existing_config.credentials or {})
            )
            
            # Update configuration without forcing connection
            updated_config.status = "configured"  # Mark as configured but not connected
            self.servers[server_id] = updated_config
            self._save_server_configs()
            
            logging.info(f"✅ Updated MCP server '{server_id}' configuration (connection will be established when needed)")
            return True
            
        except Exception as e:
            logging.error(f"Failed to update MCP server {server_id}: {e}")
            return False

    async def create_or_update_server_config(self, server_config: MCPServerConfig) -> bool:
        """Create or update a server configuration without forcing immediate connection"""
        try:
            # Mark as configured but not connected to avoid subprocess hanging
            server_config.status = "configured"
            
            # Store the configuration
            self.servers[server_config.id] = server_config
            self._save_server_configs()
            
            logging.info(f"✅ Created/updated MCP server '{server_config.id}' configuration (connection will be established when needed)")
            return True
            
        except Exception as e:
            logging.error(f"Failed to create/update MCP server {server_config.id}: {e}")
            return False

# Global MCP manager instance
_mcp_manager: Optional[MCPServerManager] = None

def get_mcp_manager() -> MCPServerManager:
    """Get or create global MCP manager instance"""
    global _mcp_manager
    if _mcp_manager is None:
        _mcp_manager = MCPServerManager()
    return _mcp_manager

def is_mcp_enabled() -> bool:
    """Check if MCP features are enabled"""
    return os.getenv('ENABLE_MCP_SERVERS', 'false').lower() == 'true' and MCP_AVAILABLE 