// Node type definitions for manual workflow creation
export interface NodeTemplate {
  id: string
  type: 'agent' | 'tool' | 'input' | 'output' | 'logic' | 'app'
  name: string
  description: string
  category: string
  icon: string
  defaultData: any
  configurable: string[] // Fields that user can configure
}

// App Node specific interface for Composio integrations
export interface AppNodeTemplate extends NodeTemplate {
  type: 'app'
  appId: string // The Composio app identifier (e.g., 'github', 'slack')
  availableActions: string[] // List of actions this app can perform
  defaultAction?: string // Default action when dropped
}

export interface NodeCategory {
  id: string
  name: string
  description: string
  icon: string
  nodes: NodeTemplate[]
}

// Pre-configured agent templates
export const AGENT_TEMPLATES: NodeTemplate[] = [
  {
    id: 'gpt4o-agent',
    type: 'agent',
    name: 'GPT-4o Agent',
    description: 'Advanced reasoning and analysis agent',
    category: 'ai-agents',
    icon: '🧠',
    defaultData: {
      type: 'agent',
      model_id: 'gpt-4o',
      instructions: 'You are a helpful AI assistant. Analyze the input and provide thoughtful, detailed responses.',
      name: 'GPT4oAgent',
      description: 'Advanced AI agent for complex reasoning tasks'
    },
    configurable: ['name', 'instructions', 'description']
  },
  {
    id: 'claude-agent',
    type: 'agent',
    name: 'Claude Agent',
    description: 'Thoughtful and detailed analysis agent',
    category: 'ai-agents',
    icon: '🎭',
    defaultData: {
      type: 'agent',
      model_id: 'claude-3-sonnet',
      instructions: 'You are Claude, an AI assistant focused on being helpful, harmless, and honest. Provide detailed analysis.',
      name: 'ClaudeAgent',
      description: 'Claude-powered analysis and reasoning agent'
    },
    configurable: ['name', 'instructions', 'description']
  },
  {
    id: 'custom-agent',
    type: 'agent',
    name: 'Custom Agent',
    description: 'Blank agent template for custom configuration',
    category: 'ai-agents',
    icon: '⚙️',
    defaultData: {
      type: 'agent',
      model_id: 'gpt-4o-mini',
      instructions: 'Configure this agent with your specific instructions and role.',
      name: 'CustomAgent',
      description: 'Custom configured AI agent'
    },
    configurable: ['name', 'instructions', 'description', 'model_id']
  },
  {
    id: 'researcher-agent',
    type: 'agent',
    name: 'Research Agent',
    description: 'Specialized for research and information gathering',
    category: 'ai-agents',
    icon: '🔍',
    defaultData: {
      type: 'agent',
      model_id: 'gpt-4o',
      instructions: 'You are a research specialist. Gather, analyze, and synthesize information on the given topic. Provide comprehensive insights with credible sources.',
      name: 'ResearchAgent',
      description: 'AI agent specialized in research and information analysis'
    },
    configurable: ['name', 'instructions', 'description']
  },
  {
    id: 'writer-agent',
    type: 'agent',
    name: 'Content Writer',
    description: 'Specialized for content creation and writing',
    category: 'ai-agents',
    icon: '✍️',
    defaultData: {
      type: 'agent',
      model_id: 'gpt-4o',
      instructions: 'You are a professional content writer. Create engaging, well-structured content that is clear, informative, and tailored to the target audience.',
      name: 'ContentWriter',
      description: 'AI agent specialized in content creation and writing'
    },
    configurable: ['name', 'instructions', 'description']
  }
]

// Tool templates  
export const TOOL_TEMPLATES: NodeTemplate[] = [
  {
    id: 'web-search',
    type: 'tool',
    name: 'Web Search',
    description: 'Search the internet for information',
    category: 'tools',
    icon: '🌐',
    defaultData: {
      type: 'tool',
      tool_type: 'web_search',
      name: 'WebSearch',
      description: 'Searches the web for relevant information'
    },
    configurable: ['name', 'description']
  },
  {
    id: 'file-reader',
    type: 'tool',
    name: 'File Reader',
    description: 'Read and process file contents',
    category: 'tools',
    icon: '📄',
    defaultData: {
      type: 'tool',
      tool_type: 'file_reader',
      name: 'FileReader',
      description: 'Reads and processes file contents'
    },
    configurable: ['name', 'description']
  },
  {
    id: 'github-tool',
    type: 'tool',
    name: 'GitHub Operations',
    description: 'Interact with GitHub repositories',
    category: 'tools',
    icon: '🐙',
    defaultData: {
      type: 'tool',
      tool_type: 'github',
      name: 'GitHubTool',
      description: 'Performs GitHub operations like repository management'
    },
    configurable: ['name', 'description', 'tool_type']
  },
  // 🚀 NEW: Composio Tools (lightweight addition)
  {
    id: 'composio-github-star',
    type: 'tool',
    name: 'GitHub Star (Composio)',
    description: 'Star GitHub repositories using Composio',
    category: 'composio-dev',
    icon: '⭐',
    defaultData: {
      type: 'tool',
      tool_type: 'composio_github_star_repo',
      name: 'GitHubStar',
      description: 'Star a GitHub repository',
      tool_source: 'composio'
    },
    configurable: ['name', 'description']
  },
  {
    id: 'composio-slack-message',
    type: 'tool',
    name: 'Slack Message (Composio)',
    description: 'Send Slack messages using Composio',
    category: 'composio-communication',
    icon: '💬',
    defaultData: {
      type: 'tool',
      tool_type: 'composio_slack_send_message',
      name: 'SlackMessage',
      description: 'Send message to Slack channel',
      tool_source: 'composio'
    },
    configurable: ['name', 'description']
  },
  {
    id: 'composio-notion-page',
    type: 'tool',
    name: 'Notion Page (Composio)',
    description: 'Create Notion pages using Composio',
    category: 'composio-productivity',
    icon: '📝',
    defaultData: {
      type: 'tool',
      tool_type: 'composio_notion_create_page',
      name: 'NotionPage',
      description: 'Create a new Notion page',
      tool_source: 'composio'
    },
    configurable: ['name', 'description']
  }
]

// Input/Output templates
export const IO_TEMPLATES: NodeTemplate[] = [
  {
    id: 'text-input',
    type: 'input',
    name: 'Text Input',
    description: 'Accept text input for the workflow',
    category: 'input-output',
    icon: '📝',
    defaultData: {
      type: 'input',
      name: 'TextInput',
      description: 'Text input for workflow processing'
    },
    configurable: ['name', 'description']
  },
  {
    id: 'file-input',
    type: 'input',
    name: 'File Input',
    description: 'Accept file input for the workflow',
    category: 'input-output',
    icon: '📁',
    defaultData: {
      type: 'input',
      name: 'FileInput',
      description: 'File input for workflow processing'
    },
    configurable: ['name', 'description']
  },
  {
    id: 'text-output',
    type: 'output',
    name: 'Text Output',
    description: 'Output text results from the workflow',
    category: 'input-output',
    icon: '📤',
    defaultData: {
      type: 'output',
      name: 'TextOutput',
      description: 'Text output from workflow processing'
    },
    configurable: ['name', 'description']
  },
  {
    id: 'json-output',
    type: 'output',
    name: 'JSON Output',
    description: 'Output structured JSON data',
    category: 'input-output',
    icon: '📊',
    defaultData: {
      type: 'output',
      name: 'JSONOutput',
      description: 'Structured JSON output from workflow'
    },
    configurable: ['name', 'description']
  }
]

// Logic templates (future expansion)
export const LOGIC_TEMPLATES: NodeTemplate[] = [
  {
    id: 'conditional',
    type: 'logic',
    name: 'Conditional',
    description: 'Branch workflow based on conditions',
    category: 'logic',
    icon: '🔀',
    defaultData: {
      type: 'logic',
      logic_type: 'conditional',
      name: 'Conditional',
      description: 'Conditional logic for workflow branching'
    },
    configurable: ['name', 'description', 'condition']
  }
]

// NEW: App Node templates for Composio integrations
export const APP_TEMPLATES: AppNodeTemplate[] = [
  {
    id: 'github-app',
    type: 'app',
    name: 'GitHub',
    description: 'GitHub repository operations and management',
    category: 'composio-apps',
    icon: '🐙',
    appId: 'github',
    availableActions: [
      'create_issue',
      'star_repo', 
      'fork_repo',
      'create_pull_request',
      'get_repo_info',
      'list_issues',
      'comment_on_issue',
      'create_repo'
    ],
    defaultAction: 'create_issue',
    defaultData: {
      type: 'app',
      appId: 'github',
      appName: 'GitHub',
      action: 'create_issue',
      name: 'GitHubApp',
      description: 'Performs GitHub operations as configured by the agent',
      isComposioApp: true
    },
    configurable: ['name', 'description', 'action']
  },
  {
    id: 'slack-app',
    type: 'app',
    name: 'Slack',
    description: 'Slack messaging and workspace operations',
    category: 'composio-apps',
    icon: '💬',
    appId: 'slack',
    availableActions: [
      'send_message',
      'create_channel',
      'list_channels',
      'get_user_info',
      'send_direct_message',
      'upload_file'
    ],
    defaultAction: 'send_message',
    defaultData: {
      type: 'app',
      appId: 'slack',
      appName: 'Slack',
      action: 'send_message',
      name: 'SlackApp',
      description: 'Performs Slack operations as configured by the agent',
      isComposioApp: true
    },
    configurable: ['name', 'description', 'action']
  },
  {
    id: 'gmail-app',
    type: 'app',
    name: 'Gmail',
    description: 'Gmail email operations and management',
    category: 'composio-apps',
    icon: '📧',
    appId: 'gmail',
    availableActions: [
      'send_email',
      'read_emails',
      'search_emails',
      'create_draft',
      'send_draft',
      'get_email_info'
    ],
    defaultAction: 'send_email',
    defaultData: {
      type: 'app',
      appId: 'gmail',
      appName: 'Gmail',
      action: 'send_email',
      name: 'GmailApp',
      description: 'Performs Gmail operations as configured by the agent',
      isComposioApp: true
    },
    configurable: ['name', 'description', 'action']
  },
  {
    id: 'googledocs-app',
    type: 'app',
    name: 'Google Docs',
    description: 'Google Docs document creation and management',
    category: 'composio-apps',
    icon: '📄',
    appId: 'googledocs',
    availableActions: [
      'create_doc',
      'update_doc',
      'get_doc_content',
      'share_doc',
      'create_from_template'
    ],
    defaultAction: 'create_doc',
    defaultData: {
      type: 'app',
      appId: 'googledocs',
      appName: 'Google Docs',
      action: 'create_doc',
      name: 'GoogleDocsApp',
      description: 'Performs Google Docs operations as configured by the agent',
      isComposioApp: true
    },
    configurable: ['name', 'description', 'action']
  },
  {
    id: 'notion-app',
    type: 'app',
    name: 'Notion',
    description: 'Notion page and database operations',
    category: 'composio-apps',
    icon: '📝',
    appId: 'notion',
    availableActions: [
      'create_page',
      'update_page',
      'create_database',
      'add_database_row',
      'search_pages'
    ],
    defaultAction: 'create_page',
    defaultData: {
      type: 'app',
      appId: 'notion',
      appName: 'Notion',
      action: 'create_page',
      name: 'NotionApp',
      description: 'Performs Notion operations as configured by the agent',
      isComposioApp: true
    },
    configurable: ['name', 'description', 'action']
  },
  {
    id: 'linear-app',
    type: 'app',
    name: 'Linear',
    description: 'Linear issue tracking and project management',
    category: 'composio-apps',
    icon: '📋',
    appId: 'linear',
    availableActions: [
      'create_issue',
      'update_issue',
      'list_issues',
      'create_project',
      'add_comment'
    ],
    defaultAction: 'create_issue',
    defaultData: {
      type: 'app',
      appId: 'linear',
      appName: 'Linear',
      action: 'create_issue',
      name: 'LinearApp',
      description: 'Performs Linear operations as configured by the agent',
      isComposioApp: true
    },
    configurable: ['name', 'description', 'action']
  }
]

// Organize templates by category
export const NODE_CATEGORIES: NodeCategory[] = [
  {
    id: 'ai-agents',
    name: 'AI Agents',
    description: 'Intelligent agents for processing and analysis',
    icon: '🤖',
    nodes: AGENT_TEMPLATES
  },
  {
    id: 'composio-apps',
    name: 'Connected Apps',
    description: 'Your connected Composio applications',
    icon: '🔗',
    nodes: APP_TEMPLATES
  },
  {
    id: 'tools',
    name: 'Tools',
    description: 'External tools and integrations',
    icon: '🔧',
    nodes: TOOL_TEMPLATES
  },
  {
    id: 'input-output',
    name: 'Input/Output',
    description: 'Data input and output nodes',
    icon: '📥',
    nodes: IO_TEMPLATES
  },
  {
    id: 'logic',
    name: 'Logic & Control',
    description: 'Workflow control and logic nodes',
    icon: '⚡',
    nodes: LOGIC_TEMPLATES
  }
]

// Helper functions
export const getNodeTemplate = (templateId: string): NodeTemplate | undefined => {
  return [...AGENT_TEMPLATES, ...APP_TEMPLATES, ...TOOL_TEMPLATES, ...IO_TEMPLATES, ...LOGIC_TEMPLATES]
    .find(template => template.id === templateId)
}

export const getAppTemplate = (appId: string): AppNodeTemplate | undefined => {
  return APP_TEMPLATES.find(template => template.appId === appId)
}

export const getNodesByCategory = (categoryId: string): NodeTemplate[] => {
  const category = NODE_CATEGORIES.find(cat => cat.id === categoryId)
  return category?.nodes || []
}

export const getAllNodeTemplates = (): NodeTemplate[] => {
  return [...AGENT_TEMPLATES, ...APP_TEMPLATES, ...TOOL_TEMPLATES, ...IO_TEMPLATES, ...LOGIC_TEMPLATES]
}

export const getAllAppTemplates = (): AppNodeTemplate[] => {
  return APP_TEMPLATES
} 