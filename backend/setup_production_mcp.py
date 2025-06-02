#!/usr/bin/env python3
"""
Production MCP Setup Script

Sets up MCP configuration for production deployment on Render.
Handles environment-specific paths and configuration.
"""

import json
import os
import shutil
import sys
from pathlib import Path

def setup_production_mcp():
    """Set up MCP configuration for production"""
    print("🚀 Setting up MCP for production deployment...")
    
    # Determine if we're in production (Render sets RENDER=true)
    is_production = os.getenv('RENDER', '').lower() == 'true'
    is_mcp_enabled = os.getenv('ENABLE_MCP_SERVERS', '').lower() == 'true'
    
    if not is_mcp_enabled:
        print("⚠️  MCP not enabled (ENABLE_MCP_SERVERS not set to true)")
        return False
    
    print(f"📍 Environment: {'Production (Render)' if is_production else 'Development'}")
    
    # Configuration based on environment
    if is_production:
        python_cmd = "python3"
        working_dir = "./"
        config_source = "servers_production.json"
    else:
        python_cmd = "python3"  # Use system python in dev too for consistency
        working_dir = os.getcwd()
        config_source = "servers.json"
    
    # Create production MCP configuration
    production_config = {
        "servers": [
            {
                "id": "web_search",
                "name": "Web Search Tool", 
                "description": "Search the web for real-time information using DuckDuckGo",
                "command": [python_cmd, "simple_mcp_server.py"],
                "args": [],
                "env": {},
                "working_dir": working_dir,
                "host": None,
                "port": None,
                "credentials": {},
                "status": "disconnected",
                "last_error": None,
                "capabilities": []
            }
        ]
    }
    
    # Add GitHub server if token is available
    github_token = os.getenv('GITHUB_PERSONAL_ACCESS_TOKEN')
    if github_token and github_token != 'your_github_token_here':
        github_server = {
            "id": "github",
            "name": "GitHub Integration",
            "description": "Comprehensive GitHub repository management, issues, pull requests, and more",
            "command": ["./github-mcp-server"],
            "args": [],
            "env": {
                "GITHUB_PERSONAL_ACCESS_TOKEN": github_token
            },
            "working_dir": working_dir,
            "host": None,
            "port": None,
            "credentials": {},
            "status": "disconnected", 
            "last_error": None,
            "capabilities": []
        }
        production_config["servers"].append(github_server)
        print("✅ GitHub MCP server configured with environment token")
    else:
        print("⚠️  GitHub MCP server skipped (no GITHUB_PERSONAL_ACCESS_TOKEN set)")
    
    # Ensure mcp_config directory exists
    mcp_config_dir = Path("mcp_config")
    mcp_config_dir.mkdir(exist_ok=True)
    
    # Write production configuration
    config_file = mcp_config_dir / "servers.json"
    with open(config_file, 'w') as f:
        json.dump(production_config, f, indent=2)
    
    print(f"📝 Created production MCP config: {config_file}")
    print(f"🔧 Configured {len(production_config['servers'])} MCP servers")
    
    # Verify required files exist
    required_files = [
        "simple_mcp_server.py",
        "mcp_manager.py"
    ]
    
    if github_token:
        required_files.append("github-mcp-server")
    
    missing_files = []
    for file in required_files:
        if not Path(file).exists():
            missing_files.append(file)
    
    if missing_files:
        print(f"❌ Missing required files: {missing_files}")
        return False
    
    print("✅ All required MCP files present")
    print("🎉 Production MCP setup complete!")
    return True

if __name__ == "__main__":
    success = setup_production_mcp()
    sys.exit(0 if success else 1) 