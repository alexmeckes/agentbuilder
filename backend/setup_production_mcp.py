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
import urllib.request
import urllib.error
import platform
import stat
from pathlib import Path

def download_github_mcp_server():
    """Download the appropriate GitHub MCP server binary for the current platform"""
    print("🔄 Setting up GitHub MCP server binary...")
    
    # Determine platform and architecture
    system = platform.system().lower()
    machine = platform.machine().lower()
    
    # Map to GitHub release naming convention
    if system == "linux":
        if "x86_64" in machine or "amd64" in machine:
            platform_name = "linux-x64"
        elif "aarch64" in machine or "arm64" in machine:
            platform_name = "linux-arm64"
        else:
            print(f"❌ Unsupported Linux architecture: {machine}")
            return None
    elif system == "darwin":
        if "arm64" in machine or "aarch64" in machine:
            platform_name = "macos-arm64"
        else:
            platform_name = "macos-x64"
    elif system == "windows":
        platform_name = "windows-x64"
    else:
        print(f"❌ Unsupported operating system: {system}")
        return None
    
    # GitHub MCP server details
    version = "v0.4.0"
    binary_name = f"github-mcp-server-{platform_name}"
    local_binary_name = "github-mcp-server"
    
    # Check if binary already exists and is executable
    if Path(local_binary_name).exists():
        try:
            # Test if it's executable
            os.access(local_binary_name, os.X_OK)
            print(f"✅ GitHub MCP server binary already exists: {local_binary_name}")
            return f"./{local_binary_name}"
        except:
            print("⚠️  Existing binary not executable, re-downloading...")
    
    # Download URL
    download_url = f"https://github.com/github/github-mcp-server/releases/download/{version}/{binary_name}"
    
    try:
        print(f"📥 Downloading GitHub MCP server from: {download_url}")
        print(f"🔍 Platform detected: {system}-{machine} -> {platform_name}")
        print(f"🎯 Target binary name: {local_binary_name}")
        
        # Download with more detailed error handling
        urllib.request.urlretrieve(download_url, local_binary_name)
        
        # Verify download
        downloaded_size = Path(local_binary_name).stat().st_size
        print(f"📊 Downloaded {downloaded_size} bytes")
        
        if downloaded_size == 0:
            print("❌ Downloaded file is empty")
            return None
        
        # Make executable
        st = os.stat(local_binary_name)
        os.chmod(local_binary_name, st.st_mode | stat.S_IEXEC)
        
        # Verify it's executable
        if not os.access(local_binary_name, os.X_OK):
            print("❌ Binary is not executable after chmod")
            return None
        
        print(f"✅ Downloaded and configured: {local_binary_name} ({downloaded_size} bytes)")
        return f"./{local_binary_name}"
        
    except urllib.error.HTTPError as e:
        print(f"❌ HTTP Error downloading GitHub MCP server: {e.code} {e.reason}")
        print(f"🔗 URL was: {download_url}")
        return None
    except urllib.error.URLError as e:
        print(f"❌ URL Error downloading GitHub MCP server: {e.reason}")
        return None
    except Exception as e:
        print(f"❌ Unexpected error downloading GitHub MCP server: {e}")
        return None

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
    
    # Always download GitHub MCP server binary (for UI token management)
    github_binary = download_github_mcp_server()
    
    if github_binary and Path(github_binary).exists():
        print("✅ GitHub MCP server binary ready for UI configuration")
        
        # Add GitHub server if token is available via environment
        github_token = os.getenv('GITHUB_PERSONAL_ACCESS_TOKEN')
        if github_token and github_token != 'your_github_token_here':
            github_server = {
                "id": "github",
                "name": "GitHub Integration",
                "description": "Comprehensive GitHub repository management, issues, pull requests, and more",
                "command": [github_binary],
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
            print("✅ GitHub MCP server auto-configured with environment token")
        else:
            print("ℹ️  GitHub MCP server binary downloaded - ready for UI token configuration")
    else:
        print("❌ Failed to setup GitHub MCP server binary")
    
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