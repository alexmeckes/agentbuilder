# 🔌 MCP Server Integration

This document explains how to set up and use Model Context Protocol (MCP) servers with the any-agent Workflow Composer.

## Overview

MCP integration allows you to connect external services and systems to your workflows through standardized MCP servers. Instead of building custom integrations, you can leverage the growing ecosystem of MCP servers.

## Quick Start

### 1. Enable MCP Features

Set the environment variable to enable MCP support:

```bash
export ENABLE_MCP_SERVERS=true
```

Or add it to your `.env` file:

```
ENABLE_MCP_SERVERS=true
```

### 2. Install MCP Dependencies

MCP dependencies are included in `requirements.txt`, but if you need to install them manually:

```bash
pip install mcp
```

### 3. Restart the Backend

After enabling MCP, restart the backend server:

```bash
cd backend
python main.py
```

You should see a message indicating MCP integration is enabled.

## Available MCP Servers

The system comes pre-configured with several popular MCP servers:

### 📊 PostgreSQL Database
- **Purpose**: Query and manage PostgreSQL databases
- **Command**: `npx @modelcontextprotocol/server-postgres`
- **Tools**: Query Database, List Tables, Get Schema

### 📁 File System Access
- **Purpose**: Read, write, and manage local files
- **Command**: `npx @modelcontextprotocol/server-filesystem`
- **Tools**: Read File, Write File, List Directory

### 🐙 GitHub Integration
- **Purpose**: Manage repositories, issues, and pull requests
- **Command**: `npx @modelcontextprotocol/server-github`
- **Tools**: Repository management, issue tracking

### 💬 Slack Integration
- **Purpose**: Send messages and manage Slack workspaces
- **Command**: `npx @modelcontextprotocol/server-slack`
- **Tools**: Send messages, manage channels

## API Endpoints

### Check MCP Status
```http
GET /mcp/enabled
```

### List Available Server Templates
```http
GET /mcp/servers/available
```

### List Configured Servers
```http
GET /mcp/servers
```

### Add New Server
```http
POST /mcp/servers
Content-Type: application/json

{
  "id": "my-postgres",
  "name": "Production Database",
  "description": "Main application database",
  "command": ["npx", "@modelcontextprotocol/server-postgres"],
  "env": {
    "POSTGRES_HOST": "localhost",
    "POSTGRES_PORT": "5432",
    "POSTGRES_DB": "myapp",
    "POSTGRES_USER": "workflow_user",
    "POSTGRES_PASSWORD": "secure_password"
  }
}
```

### Test Server Connection
```http
POST /mcp/servers/{server_id}/test
```

### Remove Server
```http
DELETE /mcp/servers/{server_id}
```

### List Available Tools
```http
GET /mcp/tools
```

## Using MCP Tools in Workflows

Once MCP servers are connected, their tools automatically appear in the workflow designer:

1. **Add Tool Node**: Create a new tool node in the visual designer
2. **Select MCP Tool**: Choose from available MCP tools in the dropdown
3. **Configure Parameters**: Set up the tool parameters (e.g., SQL query, file path)
4. **Execute Workflow**: The tool will execute via the MCP server

### Example: Database Query Workflow

```json
{
  "nodes": [
    {
      "id": "input-1",
      "type": "input",
      "data": {
        "label": "Query Input",
        "placeholder": "Enter your database query"
      }
    },
    {
      "id": "tool-1",
      "type": "tool",
      "data": {
        "tool_source": "mcp-server",
        "mcp_server_id": "my-postgres",
        "mcp_tool_name": "query_database",
        "mcp_parameters": {
          "query": "SELECT * FROM customers WHERE created_at > NOW() - INTERVAL '7 days'"
        }
      }
    }
  ]
}
```

## Configuration Examples

### PostgreSQL Database
```json
{
  "id": "production-db",
  "name": "Production Database",
  "description": "Main application database",
  "command": ["npx", "@modelcontextprotocol/server-postgres"],
  "env": {
    "POSTGRES_HOST": "db.example.com",
    "POSTGRES_PORT": "5432",
    "POSTGRES_DB": "production",
    "POSTGRES_USER": "readonly_user",
    "POSTGRES_PASSWORD": "secure_password",
    "POSTGRES_SSL": "true"
  }
}
```

### File System (Read-Only)
```json
{
  "id": "document-storage",
  "name": "Document Storage",
  "description": "Access to shared documents",
  "command": ["npx", "@modelcontextprotocol/server-filesystem"],
  "args": ["--readonly", "--root", "/shared/documents"]
}
```

### GitHub Repository
```json
{
  "id": "main-repo",
  "name": "Main Repository",
  "description": "Company main repository",
  "command": ["npx", "@modelcontextprotocol/server-github"],
  "env": {
    "GITHUB_TOKEN": "ghp_your_token_here",
    "GITHUB_OWNER": "your-company",
    "GITHUB_REPO": "main-app"
  }
}
```

## Security Considerations

### Credential Management
- Server credentials are stored locally in `mcp_config/servers.json`
- Use environment variables for sensitive data when possible
- Consider using read-only database users for safety

### Network Access
- MCP servers run as separate processes
- They may require network access to external services
- Configure firewalls and access controls appropriately

### File System Access
- File system MCP servers can access local files
- Use read-only mode for production environments
- Restrict access to specific directories

## Troubleshooting

### MCP Not Available
If you see "MCP Integration: Not available":
```bash
pip install mcp
```

### Server Connection Failed
1. Check server command and arguments
2. Verify environment variables are set correctly
3. Test server manually: `npx @modelcontextprotocol/server-postgres --help`
4. Check network connectivity to external services

### Tool Not Appearing
1. Verify server status: `GET /mcp/servers`
2. Check server capabilities in the response
3. Restart the backend to refresh tool discovery

### Environment Variables Not Loading
1. Ensure `.env` file is in the backend directory
2. Restart the backend after changes
3. Check that `ENABLE_MCP_SERVERS=true` is set

## Development

### Adding Custom MCP Servers

To add support for additional MCP servers, update the `list_available_servers()` function in `main.py`:

```python
{
    "id": "custom-server",
    "name": "Custom Service",
    "description": "Your custom MCP server",
    "command": ["node", "path/to/custom-server.js"],
    "config_schema": {
        "api_key": {"type": "password", "required": True},
        "endpoint": {"type": "string", "required": True}
    },
    "category": "custom"
}
```

### Testing MCP Integration

```bash
# 1. Enable MCP
export ENABLE_MCP_SERVERS=true

# 2. Start backend
cd backend
python main.py

# 3. Test MCP endpoints
curl http://localhost:8000/mcp/enabled
curl http://localhost:8000/mcp/servers/available
curl http://localhost:8000/mcp/tools
```

## Next Steps

1. **Install Your First MCP Server**: Start with the File System server for simplicity
2. **Create a Test Workflow**: Build a workflow using an MCP tool
3. **Monitor Server Status**: Use the API endpoints to monitor server health
4. **Explore More Servers**: Check the MCP ecosystem for additional servers

For more information about MCP, visit: https://modelcontextprotocol.io/ 