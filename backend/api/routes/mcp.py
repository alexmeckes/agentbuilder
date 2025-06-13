"""
MCP (Model Context Protocol) server management routes.
"""
from typing import Dict, List, Any
from fastapi import APIRouter, HTTPException

router = APIRouter(prefix="/api/mcp", tags=["mcp"])

# Dependencies - will be set from main.py
MCP_AVAILABLE = False
get_mcp_manager = None
is_mcp_enabled = None
MCPServerConfig = None


def set_mcp_dependencies(available: bool, manager_func=None, enabled_func=None, config_class=None):
    """Set MCP dependencies - called from main.py"""
    global MCP_AVAILABLE, get_mcp_manager, is_mcp_enabled, MCPServerConfig
    MCP_AVAILABLE = available
    get_mcp_manager = manager_func
    is_mcp_enabled = enabled_func
    MCPServerConfig = config_class


@router.get("/enabled")
async def check_mcp_enabled():
    """Check if MCP integration is enabled"""
    if not MCP_AVAILABLE or not is_mcp_enabled:
        return {"enabled": False, "reason": "MCP not available"}
    
    return {"enabled": is_mcp_enabled()}


@router.get("/servers")
async def list_mcp_servers():
    """List all configured MCP servers"""
    if not MCP_AVAILABLE or not get_mcp_manager:
        return {"servers": [], "error": "MCP integration not available"}
    
    try:
        manager = get_mcp_manager()
        servers = await manager.list_servers()
        return {"servers": servers}
    except Exception as e:
        print(f"Error listing MCP servers: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/servers")
async def add_mcp_server(server_config: dict):
    """Add a new MCP server configuration"""
    if not MCP_AVAILABLE or not get_mcp_manager or not MCPServerConfig:
        raise HTTPException(status_code=501, detail="MCP integration not available")
    
    try:
        config = MCPServerConfig(**server_config)
        manager = get_mcp_manager()
        result = await manager.add_server(config)
        return {"success": True, "server": result}
    except Exception as e:
        print(f"Error adding MCP server: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/servers/{server_id}")
async def remove_mcp_server(server_id: str):
    """Remove an MCP server configuration"""
    if not MCP_AVAILABLE or not get_mcp_manager:
        raise HTTPException(status_code=501, detail="MCP integration not available")
    
    try:
        manager = get_mcp_manager()
        await manager.remove_server(server_id)
        return {"success": True, "message": f"Server {server_id} removed"}
    except Exception as e:
        print(f"Error removing MCP server: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/servers/{server_id}")
async def update_mcp_server(server_id: str, server_config: dict):
    """Update an MCP server configuration"""
    if not MCP_AVAILABLE or not get_mcp_manager or not MCPServerConfig:
        raise HTTPException(status_code=501, detail="MCP integration not available")
    
    try:
        config = MCPServerConfig(**server_config)
        manager = get_mcp_manager()
        result = await manager.update_server(server_id, config)
        return {"success": True, "server": result}
    except Exception as e:
        print(f"Error updating MCP server: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/servers/{server_id}/test")
async def test_mcp_server(server_id: str):
    """Test connectivity to an MCP server"""
    if not MCP_AVAILABLE or not get_mcp_manager:
        raise HTTPException(status_code=501, detail="MCP integration not available")
    
    try:
        manager = get_mcp_manager()
        result = await manager.test_server(server_id)
        return {"success": result.get("success", False), "details": result}
    except Exception as e:
        print(f"Error testing MCP server: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/tools")
async def list_available_tools():
    """List all available tools from all sources"""
    tools = {
        "builtin": [],
        "mcp": {},
        "composio": []
    }
    
    # Get MCP tools if available
    if MCP_AVAILABLE and get_mcp_manager:
        try:
            manager = get_mcp_manager()
            mcp_tools = await manager.get_all_tools()
            tools["mcp"] = mcp_tools
        except Exception as e:
            print(f"Error getting MCP tools: {e}")
    
    # TODO: Add built-in and Composio tools
    
    return {"tools": tools}


@router.get("/servers/available")
async def list_available_servers():
    """List pre-configured MCP servers that can be easily added"""
    available_servers = [
        {
            "id": "github",
            "name": "GitHub MCP Server",
            "description": "Access GitHub repositories, issues, and pull requests",
            "required_env": ["GITHUB_TOKEN"],
            "optional_env": []
        },
        {
            "id": "filesystem",
            "name": "Filesystem MCP Server",
            "description": "Read and write files on the local filesystem",
            "required_env": [],
            "optional_env": ["ALLOWED_PATHS"]
        },
        {
            "id": "web",
            "name": "Web MCP Server", 
            "description": "Fetch and interact with web pages",
            "required_env": [],
            "optional_env": ["USER_AGENT", "TIMEOUT"]
        }
    ]
    
    return {"servers": available_servers}


@router.get("/status")
async def get_mcp_status():
    """Get overall MCP integration status"""
    status = {
        "available": MCP_AVAILABLE,
        "enabled": False,
        "server_count": 0,
        "tool_count": 0,
        "errors": []
    }
    
    if MCP_AVAILABLE and is_mcp_enabled:
        status["enabled"] = is_mcp_enabled()
        
        if get_mcp_manager:
            try:
                manager = get_mcp_manager()
                servers = await manager.list_servers()
                status["server_count"] = len(servers)
                
                # Count tools
                all_tools = await manager.get_all_tools()
                tool_count = sum(len(tools) for tools in all_tools.values())
                status["tool_count"] = tool_count
            except Exception as e:
                status["errors"].append(str(e))
    
    return status


@router.post("/force-reconnect")
async def force_mcp_reconnect():
    """Force reconnection to all MCP servers"""
    if not MCP_AVAILABLE or not get_mcp_manager:
        raise HTTPException(status_code=501, detail="MCP integration not available")
    
    try:
        manager = get_mcp_manager()
        await manager.reconnect_all()
        return {"success": True, "message": "Reconnection initiated"}
    except Exception as e:
        print(f"Error forcing MCP reconnect: {e}")
        raise HTTPException(status_code=500, detail=str(e))