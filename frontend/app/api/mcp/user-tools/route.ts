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

    console.log(`🔍 Getting user-specific app nodes for: ${userId}`)
    
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

    // NEW: If user has Composio API key, discover their connected apps and create App Nodes
    if (userSettings?.composioApiKey || userSettings?.encryptedComposioKey) {
      try {
        console.log('🔍 User has Composio key, discovering connected apps...');
        
        // Use the existing test-composio endpoint to get connected apps
        let apiKey = userSettings.composioApiKey;
        
        // Handle encrypted keys (simplified for now)
        if (!apiKey && userSettings.encryptedComposioKey) {
          console.log('🔐 User has encrypted key but no decryption available in this context');
          // In a full implementation, we'd decrypt here or ask for master password
        }
        
        if (apiKey) {
          const connectedApps = await discoverComposioApps(apiKey, userId);
          
          // Create App Nodes for each connected app
          connectedApps.forEach((appName: string) => {
            const appNode = createAppNode(appName);
            if (appNode) {
              tools[appNode.id] = appNode;
              console.log(`✅ Added app node: ${appNode.name}`);
            }
          });
          
          console.log(`🎯 Added ${connectedApps.length} connected app nodes`);
        }
      } catch (discoveryError) {
        console.warn('⚠️ Failed to discover Composio apps:', discoveryError);
        // Continue without Composio apps
      }
    }

    // FALLBACK: If user has enabled tools in settings but no API key, create app nodes for those
    if (userSettings?.enabledTools && Array.isArray(userSettings.enabledTools) && userSettings.enabledTools.length > 0) {
      console.log(`🔧 Creating app nodes from ${userSettings.enabledTools.length} enabled tools`);
      
      // Extract unique app names from enabled tool IDs
      const appNames = extractAppNamesFromTools(userSettings.enabledTools);
      
      appNames.forEach(appName => {
        const appNodeId = `${appName}-app`;
        if (!tools[appNodeId]) { // Don't override discovered apps
          const appNode = createAppNode(appName);
          if (appNode) {
            tools[appNode.id] = appNode;
            console.log(`✅ Added fallback app node: ${appNode.name}`);
          }
        }
      });
    }
    
    console.log(`🎯 Final user nodes summary:`, {
      totalNodes: Object.keys(tools).length,
      nodeIds: Object.keys(tools),
      appNodes: Object.values(tools).filter(t => t.type === 'app').length,
      builtInTools: Object.values(tools).filter(t => t.type === 'built-in').length
    });
    
    return NextResponse.json({ 
      success: true,
      tools: Object.values(tools), // Keep 'tools' for backwards compatibility
      summary: {
        totalNodes: Object.keys(tools).length,
        appNodes: Object.values(tools).filter(t => t.type === 'app').length,
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

// Helper function to discover connected Composio apps
async function discoverComposioApps(apiKey: string, userId: string): Promise<string[]> {
  try {
    console.log('🔍 Discovering connected apps via test-composio endpoint...');
    
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
      console.log(`✅ Discovered ${result.availableApps.length} connected apps:`, result.availableApps);
      return result.availableApps;
    }
    
    return [];
  } catch (error) {
    console.error('Failed to discover Composio apps:', error);
    return [];
  }
}

// Helper function to create App Node from app name
function createAppNode(appName: string): any {
  const normalizedName = appName.toLowerCase().replace(/[\s-_]/g, '');
  
  const appMapping: Record<string, any> = {
    'github': {
      id: 'github-app',
      name: 'GitHub',
      description: 'GitHub repository operations and management',
      icon: '🐙',
      appId: 'github',
      availableActions: ['create_issue', 'star_repo', 'fork_repo', 'create_pull_request', 'get_repo_info']
    },
    'slack': {
      id: 'slack-app',
      name: 'Slack',
      description: 'Slack messaging and workspace operations',
      icon: '💬',
      appId: 'slack',
      availableActions: ['send_message', 'create_channel', 'list_channels', 'send_direct_message']
    },
    'gmail': {
      id: 'gmail-app',
      name: 'Gmail',
      description: 'Gmail email operations and management',
      icon: '📧',
      appId: 'gmail',
      availableActions: ['send_email', 'read_emails', 'search_emails', 'create_draft']
    },
    'google': {
      id: 'gmail-app',
      name: 'Gmail',
      description: 'Gmail email operations and management',
      icon: '📧',
      appId: 'gmail',
      availableActions: ['send_email', 'read_emails', 'search_emails', 'create_draft']
    },
    'googledocs': {
      id: 'googledocs-app',
      name: 'Google Docs',
      description: 'Google Docs document creation and management',
      icon: '📄',
      appId: 'googledocs',
      availableActions: ['create_doc', 'update_doc', 'get_doc_content', 'share_doc']
    },
    'googlesheets': {
      id: 'googlesheets-app',
      name: 'Google Sheets',
      description: 'Google Sheets spreadsheet operations',
      icon: '📊',
      appId: 'googlesheets',
      availableActions: ['create_sheet', 'update_sheet', 'get_sheet_data', 'share_sheet']
    },
    'notion': {
      id: 'notion-app',
      name: 'Notion',
      description: 'Notion page and database operations',
      icon: '📝',
      appId: 'notion',
      availableActions: ['create_page', 'update_page', 'create_database', 'add_database_row']
    },
    'linear': {
      id: 'linear-app',
      name: 'Linear',
      description: 'Linear issue tracking and project management',
      icon: '📋',
      appId: 'linear',
      availableActions: ['create_issue', 'update_issue', 'list_issues', 'add_comment']
    }
  };
  
  const appConfig = appMapping[normalizedName];
  if (!appConfig) {
    console.log(`❓ No app mapping found for: ${appName}`);
    return null;
  }
  
  return {
    id: appConfig.id,
    type: 'app',
    source: 'composio',
    name: appConfig.name,
    description: appConfig.description,
    category: 'composio-apps',
    icon: appConfig.icon,
    appId: appConfig.appId,
    availableActions: appConfig.availableActions,
    defaultAction: appConfig.availableActions[0],
    server_id: 'composio-tools',
    server_name: 'Composio Universal Tools',
    server_status: 'connected',
    isComposioApp: true
  };
}

// Helper function to extract app names from tool IDs (for fallback)
function extractAppNamesFromTools(toolIds: string[]): string[] {
  const appNames = new Set<string>();
  
  toolIds.forEach(toolId => {
    // Extract app name from tool ID patterns like "github_star_repo", "slack_send_message"
    const parts = toolId.split('_');
    if (parts.length > 0) {
      appNames.add(parts[0]); // First part is usually the app name
    }
  });
  
  return Array.from(appNames);
}