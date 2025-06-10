import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:8000';
    
    // Extract user ID from query params if provided
    const url = new URL(request.url);
    const userId = url.searchParams.get('userId');
    
    console.log('🔍 Tools API: Getting tools for user:', userId);
    
    // Start with built-in tools (always available)
    const tools: Record<string, any> = {};
    
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

    // Get Composio tools directly from user's connected accounts
    if (userId) {
      await _addComposioToolsFromUserSettings(tools, userId, backendUrl);
    } else {
      console.log('ℹ️ No userId provided, skipping user-specific Composio tools');
    }

    // Add other MCP tools (non-Composio) from servers
    await _addOtherMCPTools(tools, backendUrl);
    
    console.log(`🎯 Final tools summary:`, {
      totalTools: Object.keys(tools).length,
      toolIds: Object.keys(tools),
      composioTools: Object.values(tools).filter(t => t.type === 'composio').length,
      mcpTools: Object.values(tools).filter(t => t.type === 'mcp').length,
      builtInTools: Object.values(tools).filter(t => t.type === 'built-in').length
    });
    
    return NextResponse.json({ tools });
  } catch (error) {
    console.error('Error fetching tools:', error);
    
    // Return basic built-in tools if there's an error
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
      error: 'Error loading tools - showing built-in tools only'
    });
  }
}

async function _addComposioToolsFromUserSettings(tools: Record<string, any>, userId: string, backendUrl: string) {
  try {
    console.log('🔍 Getting Composio tools for user:', userId);
    
    // Call backend to get tools based on user's actual connected accounts
    const composioResponse = await fetch(`${backendUrl}/api/composio/user-tools?userId=${userId}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    
    if (composioResponse.ok) {
      const composioData = await composioResponse.json();
      if (composioData.success && composioData.tools) {
        console.log(`✅ Found ${composioData.tools.length} Composio tools for connected accounts`);
        
        composioData.tools.forEach((tool: any) => {
          const toolId = `composio_${tool.name}`;
          tools[toolId] = {
            type: 'composio',
            source: 'composio',
            name: tool.displayName || tool.name.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()),
            description: tool.description || `${tool.name} tool`,
            category: _categorizeComposioTool(tool.name),
            server_id: 'composio-user-tools',
            server_name: 'Connected Accounts',
            server_status: 'connected',
            app: tool.app,
            enabled: tool.enabled
          };
        });
      } else {
        console.log('ℹ️ No Composio tools found for user - user may not have connected any accounts');
      }
    } else {
      console.log('⚠️ Failed to get user Composio tools, falling back to basic detection');
      // Simple fallback - check if user has any settings saved
      await _addBasicComposioToolsIfConfigured(tools, userId, backendUrl);
    }
    
  } catch (error) {
    console.error('Failed to get Composio tools from user settings:', error);
    // Try fallback approach
    await _addBasicComposioToolsIfConfigured(tools, userId, backendUrl);
  }
}

async function _addBasicComposioToolsIfConfigured(tools: Record<string, any>, userId: string, backendUrl: string) {
  try {
    // Check if user has Composio configured at all
    const testResponse = await fetch(`${backendUrl}/api/test-composio`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId })
    });
    
    if (testResponse.ok) {
      const testData = await testResponse.json();
      if (testData.success) {
        console.log('✅ User has Composio configured, adding basic tools');
        
        // Add a few basic tools that we know work
        const basicTools = [
          { name: 'googledocs_create_doc', app: 'googledocs', category: 'productivity', description: 'Create a Google Docs document' },
          { name: 'gmail_send_email', app: 'gmail', category: 'communication', description: 'Send email via Gmail' },
          { name: 'github_star_repo', app: 'github', category: 'development', description: 'Star a GitHub repository' }
        ];
        
        basicTools.forEach(tool => {
          const toolId = `composio_${tool.name}`;
          tools[toolId] = {
            type: 'composio',
            source: 'composio',
            name: tool.name.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()),
            description: tool.description,
            category: tool.category,
            server_id: 'composio-basic',
            server_name: 'Composio Tools',
            server_status: 'configured',
            app: tool.app
          };
        });
      }
    }
  } catch (error) {
    console.log('ℹ️ Could not determine Composio configuration, skipping basic tools');
  }
}

async function _addOtherMCPTools(tools: Record<string, any>, backendUrl: string) {
  try {
    const serversResponse = await fetch(`${backendUrl}/mcp/servers`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });

    if (serversResponse.ok) {
      const serversData = await serversResponse.json();
      
      if (serversData.servers) {
        Object.entries(serversData.servers).forEach(([serverId, serverInfo]: [string, any]) => {
          // Skip Composio server - we handle that separately above
          if (serverId === 'composio-tools') {
            return;
          }
          
          if ((serverInfo.status === 'connected' || serverInfo.status === 'configured') && serverInfo.capabilities) {
            console.log(`✅ Adding ${serverInfo.capabilities.length} tools from ${serverId} (${serverInfo.name})`);
            serverInfo.capabilities.forEach((toolName: string) => {
              const toolId = `${serverId}_${toolName}`;
              tools[toolId] = {
                type: 'mcp',
                source: 'mcp',
                name: toolName.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()),
                description: `${toolName} - ${serverInfo.name} tool`,
                category: _categorizeGitHubTool(toolName),
                server_id: serverId,
                server_name: serverInfo.name,
                server_status: serverInfo.status
              };
            });
          }
        });
      }
    }
  } catch (error) {
    console.log('⚠️ Failed to get other MCP tools:', error);
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