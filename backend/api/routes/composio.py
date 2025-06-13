"""
Composio integration routes.
"""
import os
import json
from typing import Dict, Any
from fastapi import APIRouter, HTTPException

router = APIRouter(tags=["composio"])

# Dependencies
COMPOSIO_AVAILABLE = False
composio_http_manager = None


def set_composio_dependencies(available: bool, manager=None):
    """Set Composio dependencies - called from main.py"""
    global COMPOSIO_AVAILABLE, composio_http_manager
    COMPOSIO_AVAILABLE = available
    composio_http_manager = manager


@router.get("/api/composio/user-tools")
async def get_user_composio_tools(userId: str):
    """Get available Composio tools for a specific user"""
    if not COMPOSIO_AVAILABLE or not composio_http_manager:
        return {"tools": [], "message": "Composio integration not available"}
    
    try:
        # Load user settings
        settings = _load_user_settings(userId)
        api_key = settings.get("composio_api_key")
        
        if not api_key:
            return {"tools": [], "message": "No Composio API key configured"}
        
        # Get tools from Composio
        tools = await composio_http_manager.get_user_tools(userId, api_key)
        return {"tools": tools}
        
    except Exception as e:
        print(f"Error getting user Composio tools: {e}")
        return {"tools": [], "error": str(e)}


@router.post("/composio/update-config")
async def update_composio_config(request: dict):
    """Update Composio configuration for a user"""
    user_id = request.get("userId")
    api_key = request.get("apiKey")
    
    if not user_id:
        raise HTTPException(status_code=400, detail="userId is required")
    
    try:
        # Load existing settings
        settings = _load_user_settings(user_id)
        
        # Update Composio settings
        if api_key is not None:
            settings["composio_api_key"] = api_key
        
        # Save settings
        _save_user_settings(user_id, settings)
        
        return {"success": True, "message": "Composio configuration updated"}
        
    except Exception as e:
        print(f"Error updating Composio config: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/composio/test-connection")
async def test_composio_connection(request: dict):
    """Test Composio API connection"""
    if not COMPOSIO_AVAILABLE or not composio_http_manager:
        return {"success": False, "error": "Composio integration not available"}
    
    api_key = request.get("apiKey")
    user_id = request.get("userId", "test_user")
    
    if not api_key:
        raise HTTPException(status_code=400, detail="apiKey is required")
    
    try:
        # Test the connection
        result = await composio_http_manager.test_connection(api_key, user_id)
        return result
        
    except Exception as e:
        print(f"Error testing Composio connection: {e}")
        return {"success": False, "error": str(e)}


@router.post("/api/composio/save-and-update")
async def save_and_update_composio(request: dict):
    """Save Composio configuration and update available tools"""
    if not COMPOSIO_AVAILABLE or not composio_http_manager:
        return {"success": False, "error": "Composio integration not available"}
    
    user_id = request.get("userId")
    api_key = request.get("apiKey")
    entity_id = request.get("entityId")
    
    if not all([user_id, api_key]):
        raise HTTPException(status_code=400, detail="userId and apiKey are required")
    
    try:
        # Save configuration
        settings = _load_user_settings(user_id)
        settings["composio_api_key"] = api_key
        if entity_id:
            settings["composio_entity_id"] = entity_id
        _save_user_settings(user_id, settings)
        
        # Update available tools
        if composio_http_manager:
            await composio_http_manager.refresh_user_tools(user_id, api_key)
        
        return {"success": True, "message": "Configuration saved and tools updated"}
        
    except Exception as e:
        print(f"Error saving Composio configuration: {e}")
        raise HTTPException(status_code=500, detail=str(e))


def _load_user_settings(userId: str) -> dict:
    """Load user-specific settings"""
    settings_file = f"user_settings_{userId}.json"
    if os.path.exists(settings_file):
        with open(settings_file, 'r') as f:
            return json.load(f)
    return {}


def _save_user_settings(userId: str, settings: dict):
    """Save user-specific settings"""
    settings_file = f"user_settings_{userId}.json"
    with open(settings_file, 'w') as f:
        json.dump(settings, f, indent=2)