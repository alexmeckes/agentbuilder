import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { userId, userSettings } = await request.json()
    
    if (!userId) {
      return NextResponse.json({ 
        success: false, 
        message: 'User ID is required' 
      }, { status: 400 })
    }

    console.log(`🔍 Getting user-specific tools for: ${userId}`)
    
    // Start with built-in tools (always available)
    const tools: Record<string, any> = {}
    
    tools['search_web'] = {
      id: 'search_web',
      type: 'built-in',
      source: 'built-in',
      name: 'Web Search',
      description: 'Search the internet for information',
      category: 'web',
      server_status: 'built-in'
    }
    
    tools['visit_webpage'] = {
      id: 'visit_webpage', 
      type: 'built-in',
      source: 'built-in',
      name: 'Visit Webpage',
      description: 'Visit and read webpage content',
      category: 'web',
      server_status: 'built-in'
    }

    // If user has settings with enabled tools, add those
    if (userSettings?.enabledTools && Array.isArray(userSettings.enabledTools)) {
      console.log(`🔧 Processing ${userSettings.enabledTools.length} enabled tools for user`);
      
      // Map enabled tools to actual tool definitions
      userSettings.enabledTools.forEach((toolId: string) => {
        const toolConfig = getComposioToolConfig(toolId);
        if (toolConfig) {
          tools[toolId] = {
            id: toolId,
            type: 'composio',
            source: 'composio', 
            name: toolConfig.name,
            description: toolConfig.description,
            category: toolConfig.category.toLowerCase(),
            server_id: 'composio-tools',
            server_name: 'Composio Universal Tools',
            server_status: 'connected'
          };
          console.log(`✅ Added user tool: ${toolConfig.name}`);
        } else {
          console.warn(`⚠️ Unknown tool ID: ${toolId}`);
        }
      });
    }

    // If user has Composio API key, try to get their connected apps dynamically
    if (userSettings?.composioApiKey || userSettings?.encryptedComposioKey) {
      try {
        console.log('🔍 User has Composio key, attempting to discover connected tools...');
        
        // Use the existing test-composio endpoint to get connected apps
        let apiKey = userSettings.composioApiKey;
        
        // Handle encrypted keys (simplified for now)
        if (!apiKey && userSettings.encryptedComposioKey) {
          console.log('🔐 User has encrypted key but no decryption available in this context');
          // In a full implementation, we'd decrypt here or ask for master password
        }
        
        if (apiKey) {
          const discoveredTools = await discoverComposioTools(apiKey, userId);
          
          // Add discovered tools (they override enabled tools if same ID)
          Object.entries(discoveredTools).forEach(([toolId, toolInfo]: [string, any]) => {
            tools[toolId] = {
              id: toolId,
              type: 'composio',
              source: 'composio',
              name: toolInfo.name,
              description: toolInfo.description,
              category: toolInfo.category.toLowerCase(),
              server_id: 'composio-tools',
              server_name: 'Composio Universal Tools',
              server_status: 'connected',
              discovered: true
            };
          });
          
          console.log(`🎯 Added ${Object.keys(discoveredTools).length} discovered tools`);
        }
      } catch (discoveryError) {
        console.warn('⚠️ Failed to discover Composio tools:', discoveryError);
        // Continue with enabled tools only
      }
    }
    
    console.log(`🎯 Final user tools summary:`, {
      totalTools: Object.keys(tools).length,
      toolIds: Object.keys(tools),
      composioTools: Object.values(tools).filter(t => t.type === 'composio').length,
      builtInTools: Object.values(tools).filter(t => t.type === 'built-in').length
    });
    
    return NextResponse.json({ 
      success: true,
      tools: Object.values(tools),
      summary: {
        totalTools: Object.keys(tools).length,
        composioTools: Object.values(tools).filter(t => t.type === 'composio').length,
        builtInTools: Object.values(tools).filter(t => t.type === 'built-in').length
      }
    })
    
  } catch (error) {
    console.error('Error fetching user tools:', error)
    return NextResponse.json({ 
      success: false, 
      message: 'Failed to fetch user tools',
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}

// Helper function to get Composio tool configuration
function getComposioToolConfig(toolId: string): any {
  const toolMapping: Record<string, any> = {
    'github_star_repo': { 
      name: 'GitHub Star', 
      description: 'Star a GitHub repository', 
      category: 'Development'
    },
    'github_create_issue': { 
      name: 'GitHub Issue', 
      description: 'Create a GitHub issue', 
      category: 'Development'
    },
    'slack_send_message': { 
      name: 'Slack Message', 
      description: 'Send message to Slack', 
      category: 'Communication'
    },
    'gmail_send_email': { 
      name: 'Gmail Email', 
      description: 'Send email via Gmail', 
      category: 'Communication'
    },
    'googledocs_create_doc': { 
      name: 'Google Docs', 
      description: 'Create a Google Docs document', 
      category: 'Productivity'
    },
    'googlesheets_create_sheet': { 
      name: 'Google Sheets', 
      description: 'Create a Google Sheets spreadsheet', 
      category: 'Productivity'
    },
    'googledrive_upload': { 
      name: 'Google Drive', 
      description: 'Upload file to Google Drive', 
      category: 'Productivity'
    },
    'googlecalendar_create_event': { 
      name: 'Google Calendar', 
      description: 'Create a Google Calendar event', 
      category: 'Productivity'
    },
    'notion_create_page': { 
      name: 'Notion Page', 
      description: 'Create a Notion page', 
      category: 'Productivity'
    },
    'linear_create_issue': { 
      name: 'Linear Issue', 
      description: 'Create a Linear issue', 
      category: 'Productivity'
    }
  }
  
  return toolMapping[toolId] || null
}

// Helper function to discover Composio tools dynamically
async function discoverComposioTools(apiKey: string, userId: string): Promise<Record<string, any>> {
  try {
    console.log('🔍 Discovering tools via test-composio endpoint...');
    
    // Call the existing test-composio endpoint to get connected apps
    const response = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/test-composio`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ apiKey, userId })
    });

    if (!response.ok) {
      throw new Error(`Discovery failed: ${response.status}`);
    }

    const result = await response.json();
    
    if (result.success && result.availableApps) {
      return mapComposioAppsToTools(result.availableApps);
    }
    
    return {};
  } catch (error) {
    console.error('Failed to discover Composio tools:', error);
    return {};
  }
}

// Helper function to map Composio apps to tool definitions
function mapComposioAppsToTools(availableApps: string[]): Record<string, any> {
  const toolMapping: Record<string, any> = {
    'github': { id: 'github_star_repo', name: 'GitHub Operations', category: 'Development', description: 'GitHub repository operations' },
    'slack': { id: 'slack_send_message', name: 'Slack Messaging', category: 'Communication', description: 'Send messages via Slack' },
    'gmail': { id: 'gmail_send_email', name: 'Gmail Operations', category: 'Communication', description: 'Send emails via Gmail' },
    'google': { id: 'gmail_send_email', name: 'Gmail Operations', category: 'Communication', description: 'Google services operations' },
    'googledocs': { id: 'googledocs_create_doc', name: 'Google Docs', category: 'Productivity', description: 'Create Google Docs documents' },
    'googlesheets': { id: 'googlesheets_create_sheet', name: 'Google Sheets', category: 'Productivity', description: 'Create Google Sheets spreadsheets' },
    'googledrive': { id: 'googledrive_upload', name: 'Google Drive', category: 'Productivity', description: 'Upload files to Google Drive' },
    'googlecalendar': { id: 'googlecalendar_create_event', name: 'Google Calendar', category: 'Productivity', description: 'Create Google Calendar events' },
    'notion': { id: 'notion_create_page', name: 'Notion Pages', category: 'Productivity', description: 'Create Notion pages' },
    'linear': { id: 'linear_create_issue', name: 'Linear Issues', category: 'Productivity', description: 'Create Linear issues' }
  }
  
  const discoveredTools: Record<string, any> = {};
  
  availableApps.forEach(appName => {
    const normalizedName = appName.toLowerCase().replace(/[\s-_]/g, '');
    console.log(`📱 Processing app: "${appName}" -> "${normalizedName}"`);
    
    if (toolMapping[normalizedName]) {
      const tool = toolMapping[normalizedName];
      discoveredTools[tool.id] = tool;
      console.log(`✅ Mapped: ${appName} -> ${tool.name}`);
    } else {
      console.log(`❓ No mapping found for: ${appName}`);
    }
  });
  
  return discoveredTools;
}