import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:8000';
    
    // Extract user ID from query params if provided (for future use)
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

    // NEW: If user ID is provided, try to get user-specific Composio tools
    if (userId) {
      try {
        // Load user settings to get API key
        const userSettings = await getUserSettings(userId);
        if (userSettings?.composioApiKey || userSettings?.encryptedComposioKey) {
          console.log('🔍 Found user settings with Composio key, fetching user-specific tools...');
          
          const composioTools = await getUserComposioTools(userId, userSettings);
          
          // Add user-specific Composio tools
          Object.entries(composioTools).forEach(([toolId, toolInfo]: [string, any]) => {
            tools[toolId] = {
              type: 'composio',
              source: 'composio',
              name: toolInfo.name,
              description: toolInfo.description,
              category: toolInfo.category,
              server_id: 'composio-tools',
              server_name: 'Composio Universal Tools',
              server_status: 'connected'
            };
          });
          
          console.log(`✅ Added ${Object.keys(composioTools).length} user-specific Composio tools`);
        }
      } catch (userToolsError) {
        console.warn('⚠️ Failed to get user-specific Composio tools:', userToolsError);
        // Continue with MCP approach as fallback
      }
    }

    // FALLBACK: Use the original MCP servers approach  
    const serversResponse = await fetch(`${backendUrl}/mcp/servers`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (serversResponse.ok) {
      const serversData = await serversResponse.json();
      
      console.log('🔍 MCP Tools API: Server data:', JSON.stringify(serversData, null, 2));
      console.log('🔍 Available servers:', Object.keys(serversData.servers || {}));

      // Extract MCP tools from connected servers (ORIGINAL APPROACH)
      if (serversData.servers) {
        Object.entries(serversData.servers).forEach(([serverId, serverInfo]: [string, any]) => {
          console.log(`🔍 Processing server ${serverId}:`, {
            name: serverInfo.name,
            status: serverInfo.status,
            capabilities: serverInfo.capabilities,
            tool_count: serverInfo.tool_count,
            hasCapabilities: !!serverInfo.capabilities,
            capabilitiesLength: serverInfo.capabilities?.length || 0
          });
          
          // Include both connected and configured servers (configured servers have their tools available)
          if ((serverInfo.status === 'connected' || serverInfo.status === 'configured') && serverInfo.capabilities) {
            console.log(`✅ Adding ${serverInfo.capabilities.length} tools from ${serverId} (${serverInfo.name})`);
            serverInfo.capabilities.forEach((toolName: string) => {
              const toolId = `${serverId}_${toolName}`;
              
              // Skip if we already have this tool from user-specific fetch
              if (tools[toolId]) {
                console.log(`⏭️ Skipping ${toolId} - already added from user-specific fetch`);
                return;
              }
              
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
              console.log(`   🔧 Added tool: ${toolName} -> ${toolId}`);
            });
          }
          // For Composio server without capabilities, let user know they need to configure it
          else if (serverId === 'composio-tools' && (serverInfo.status === 'connected' || serverInfo.status === 'configured')) {
            console.log(`🔍 Composio server found but no capabilities. User needs to check their Account settings and test connection.`);
          }
        });
      }
    } else {
      console.warn('⚠️ Failed to fetch MCP servers, proceeding with built-in tools only');
    }
    
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

// Helper function to get user settings from localStorage (server-side simulation)
async function getUserSettings(userId: string): Promise<any> {
  // In a real implementation, this would fetch from a database
  // For now, we'll simulate by checking if we can load from frontend localStorage pattern
  // This is a placeholder - in practice, you'd store user settings in a database
  console.log('📝 getUserSettings called for userId:', userId);
  return null; // Will be implemented with proper user storage later
}

// Helper function to get user-specific Composio tools
async function getUserComposioTools(userId: string, userSettings: any): Promise<Record<string, any>> {
  try {
    // For now, return empty object since we don't have server-side user storage yet
    // This will be implemented when we add proper user database storage
    console.log('🔧 getUserComposioTools called for userId:', userId);
    return {};
  } catch (error) {
    console.error('Error fetching user Composio tools:', error);
    return {};
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

// NOTE: This endpoint reverted back to the working MCP approach.
// The previous "simplification" attempt broke the working system.
// This uses the MCP servers approach which properly connects to Composio tools. 