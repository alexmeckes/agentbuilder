import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:8000';
    
    // The /mcp/tools endpoint is failing, so let's use /mcp/servers instead
    // which contains the tool information in each server's capabilities
    const serversResponse = await fetch(`${backendUrl}/mcp/servers`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!serversResponse.ok) {
      throw new Error(`Backend responded with status: ${serversResponse.status}`);
    }

    const serversData = await serversResponse.json();
    
    // Extract tools from server capabilities
    const tools: Record<string, any> = {};
    
    // Add built-in tools
    tools['search_web'] = {
      type: 'built-in',
      name: 'Web Search',
      description: 'Search the internet for information',
      category: 'web',
      server_status: 'built-in'
    };
    
    tools['visit_webpage'] = {
      type: 'built-in',
      name: 'Visit Webpage',
      description: 'Visit and read webpage content',
      category: 'web',
      server_status: 'built-in'
    };
    
    // Extract MCP tools from connected servers
    if (serversData.servers) {
      Object.entries(serversData.servers).forEach(([serverId, serverInfo]: [string, any]) => {
        // Include both connected and configured servers (configured servers have their tools available)
        if ((serverInfo.status === 'connected' || serverInfo.status === 'configured') && serverInfo.capabilities) {
          serverInfo.capabilities.forEach((toolName: string) => {
            const toolId = `${serverId}_${toolName}`;
            tools[toolId] = {
              type: 'mcp',
              name: toolName,
              description: `${toolName} - ${serverInfo.name} tool`,
              category: _categorizeGitHubTool(toolName),
              server_id: serverId,
              server_name: serverInfo.name,
              server_status: serverInfo.status
            };
          });
        }
        
        // Special handling for Composio server - add default tools even if no capabilities discovered yet
        if (serverId === 'composio-tools' && (serverInfo.status === 'connected' || serverInfo.status === 'configured')) {
          const composioDefaultTools = [
            { name: 'github_star_repo', category: 'development', description: 'Star a GitHub repository' },
            { name: 'github_create_issue', category: 'development', description: 'Create a GitHub issue' },
            { name: 'gmail_send_email', category: 'communication', description: 'Send email via Gmail' },
            { name: 'googledocs_create_doc', category: 'productivity', description: 'Create a Google Docs document' },
            { name: 'slack_send_message', category: 'communication', description: 'Send message to Slack' },
            { name: 'notion_create_page', category: 'productivity', description: 'Create a Notion page' },
            { name: 'linear_create_issue', category: 'productivity', description: 'Create a Linear issue' }
          ];
          
          composioDefaultTools.forEach((tool) => {
            const toolId = `composio_${tool.name}`;
            // Only add if not already present from capabilities
            if (!tools[toolId]) {
              tools[toolId] = {
                type: 'composio',
                source: 'composio',
                name: tool.name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
                description: tool.description,
                category: tool.category,
                server_id: serverId,
                server_name: serverInfo.name,
                server_status: serverInfo.status
              };
            }
          });
        }
      });
    }
    
    return NextResponse.json({ tools });
  } catch (error) {
    console.error('Error fetching MCP tools:', error);
    
    // Return basic built-in tools if backend is unavailable
    return NextResponse.json({
      tools: {
        'search_web': {
          type: 'built-in',
          name: 'Web Search',
          description: 'Search the internet for information',
          category: 'web',
          server_status: 'built-in'
        },
        'visit_webpage': {
          type: 'built-in',
          name: 'Visit Webpage',
          description: 'Visit and read webpage content',
          category: 'web',
          server_status: 'built-in'
        }
      },
      error: 'Backend unavailable - showing built-in tools only'
    });
  }
}

// Helper function to categorize GitHub tools
function _categorizeGitHubTool(toolName: string): string {
  const toolNameLower = toolName.toLowerCase();
  
  if (toolNameLower.includes('repo') || toolNameLower.includes('fork') || toolNameLower.includes('create_repository')) {
    return 'repository';
  } else if (toolNameLower.includes('issue') || toolNameLower.includes('pr') || toolNameLower.includes('pull')) {
    return 'issues';
  } else if (toolNameLower.includes('file') || toolNameLower.includes('content') || toolNameLower.includes('create') || toolNameLower.includes('update') || toolNameLower.includes('delete')) {
    return 'files';
  } else if (toolNameLower.includes('search') || toolNameLower.includes('find')) {
    return 'search';
  } else if (toolNameLower.includes('branch') || toolNameLower.includes('commit') || toolNameLower.includes('tag')) {
    return 'version_control';
  } else if (toolNameLower.includes('notification')) {
    return 'notifications';
  } else if (toolNameLower.includes('scanning') || toolNameLower.includes('alert')) {
    return 'security';
  } else {
    return 'development';
  }
} 