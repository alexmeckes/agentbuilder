// Node type definitions for manual workflow creation
export interface NodeTemplate {
  id: string
  type: 'agent' | 'tool' | 'input' | 'output' | 'logic'
  name: string
  description: string
  category: string
  icon: string
  defaultData: any
  configurable: string[] // Fields that user can configure
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
  return [...AGENT_TEMPLATES, ...TOOL_TEMPLATES, ...IO_TEMPLATES, ...LOGIC_TEMPLATES]
    .find(template => template.id === templateId)
}

export const getNodesByCategory = (categoryId: string): NodeTemplate[] => {
  const category = NODE_CATEGORIES.find(cat => cat.id === categoryId)
  return category?.nodes || []
}

export const getAllNodeTemplates = (): NodeTemplate[] => {
  return [...AGENT_TEMPLATES, ...TOOL_TEMPLATES, ...IO_TEMPLATES, ...LOGIC_TEMPLATES]
} 