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
    
    console.log('🔍 MCP Tools API: Server data:', JSON.stringify(serversData, null, 2));
    
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
        console.log(`🔍 Processing server ${serverId}:`, {
          status: serverInfo.status,
          capabilities: serverInfo.capabilities,
          tool_count: serverInfo.tool_count
        });
        
        // Include both connected and configured servers (configured servers have their tools available)
        if ((serverInfo.status === 'connected' || serverInfo.status === 'configured') && serverInfo.capabilities) {
          serverInfo.capabilities.forEach((toolName: string) => {
            const toolId = `${serverId}_${toolName}`;
            tools[toolId] = {
              type: serverId === 'composio-tools' ? 'composio' : 'mcp',
              source: serverId === 'composio-tools' ? 'composio' : 'mcp',
              name: toolName.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()),
              description: `${toolName} - ${serverInfo.name} tool`,
              category: _categorizeComposioTool(toolName),
              server_id: serverId,
              server_name: serverInfo.name,
              server_status: serverInfo.status
            };
          });
        }
        // For Composio server without capabilities, test if tools are actually available
        else if (serverId === 'composio-tools' && (serverInfo.status === 'connected' || serverInfo.status === 'configured')) {
          console.log(`🔍 Composio server found but no capabilities. Would attempt direct tool discovery in separate call.`);
          // Note: Direct API call would need to be made separately due to async constraints
          // For now, we'll only show tools that are actually discovered via MCP capabilities
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

// Helper function to categorize Composio tools
function _categorizeComposioTool(toolName: string): string {
  const toolNameLower = toolName.toLowerCase();
  
  // GitHub tools
  if (toolNameLower.includes('github') || toolNameLower.includes('repo') || toolNameLower.includes('issue') || toolNameLower.includes('fork')) {
    return 'development';
  }
  // Communication tools
  else if (toolNameLower.includes('gmail') || toolNameLower.includes('email') || toolNameLower.includes('slack') || toolNameLower.includes('message')) {
    return 'communication';
  }
  // Productivity tools
  else if (toolNameLower.includes('notion') || toolNameLower.includes('linear') || toolNameLower.includes('google') || toolNameLower.includes('docs') || toolNameLower.includes('sheets') || toolNameLower.includes('calendar') || toolNameLower.includes('drive')) {
    return 'productivity';
  }
  // Default to general
  else {
    return 'general';
  }
} 