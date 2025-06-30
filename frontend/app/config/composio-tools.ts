export const COMPOSIO_TOOL_MAPPINGS = {
  'github_star_repo': { 
    name: 'GitHub Star', 
    tool_type: 'composio_github_star_repo',
    keywords: ['github', 'star', 'repository']
  },
  'github_create_issue': { 
    name: 'GitHub Issue', 
    tool_type: 'composio_github_create_issue',
    keywords: ['github', 'issue']
  },
  'slack_send_message': { 
    name: 'Slack Message', 
    tool_type: 'composio_slack_send_message',
    keywords: ['slack', 'message']
  },
  'gmail_send_email': { 
    name: 'Gmail Email', 
    tool_type: 'composio_gmail_send_email',
    keywords: ['gmail', 'email']
  },
  'notion_create_page': { 
    name: 'Notion Page', 
    tool_type: 'composio_notion_create_page',
    keywords: ['notion', 'page']
  },
  'linear_create_issue': { 
    name: 'Linear Issue', 
    tool_type: 'composio_linear_create_issue',
    keywords: ['linear', 'issue']
  }
};

export type ComposioToolId = keyof typeof COMPOSIO_TOOL_MAPPINGS;

export function detectComposioToolFromName(toolName: string, enabledTools: string[]): string | null {
  const lowerName = toolName.toLowerCase();
  
  // Check each Composio tool mapping
  for (const [toolId, config] of Object.entries(COMPOSIO_TOOL_MAPPINGS)) {
    // Check if this tool is enabled
    if (!enabledTools.includes(toolId)) {
      continue;
    }
    
    // Check if any keywords match
    const hasKeywordMatch = config.keywords.some(keyword => 
      lowerName.includes(keyword.toLowerCase())
    );
    
    if (hasKeywordMatch) {
      return config.tool_type;
    }
  }
  
  return null;
}

export function isComposioTool(toolType: string): boolean {
  return toolType.startsWith('composio_');
}

export function getComposioToolInfo(toolType: string) {
  // Remove 'composio_' prefix to get the tool ID
  const toolId = toolType.replace('composio_', '');
  return COMPOSIO_TOOL_MAPPINGS[toolId as ComposioToolId];
} 