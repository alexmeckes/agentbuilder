'use client'

import { useState, useEffect, DragEvent } from 'react'
import { Search, ChevronDown, ChevronRight, Plus, Zap, Bot, Wrench, FileInput, FileOutput, Brain, Github, MessageSquare, Book, FileCode, Database, Link2, GitBranch, RefreshCw } from 'lucide-react'
import { NODE_CATEGORIES, NodeTemplate, getNodeTemplate, NodeCategory } from '../../types/NodeTypes'
import { useMCPTools, MCPTool } from '../../hooks/useMCPTools'

interface NodePaletteProps {
  className?: string
}

interface UserSettings {
  userId: string
  composioApiKey?: string
  enabledTools: string[]
  preferences: any
}

// Mapping from user-enabled tools to node templates
const createComposioNodeTemplate = (toolId: string, toolConfig: any): NodeTemplate => {
  return {
    id: `composio-${toolId}`,
    type: 'tool',
    name: toolConfig.name,
    description: toolConfig.description,
    category: `composio-${toolConfig.category.toLowerCase()}`,
    icon: toolConfig.icon,
    defaultData: {
      type: 'tool',
      tool_type: toolConfig.tool_type,
      name: toolConfig.name.replace(/\s+/g, ''),
      description: toolConfig.description,
      isComposio: true,
      category: toolConfig.category
    },
    configurable: ['name', 'description']
  }
}

const composioToolsMapping: Record<string, any> = {
  'github_star_repo': { 
    name: 'GitHub Star', 
    description: 'Star a GitHub repository', 
    icon: '⭐',
    category: 'Development',
    tool_type: 'composio_github_star_repo'
  },
  'github_create_issue': { 
    name: 'GitHub Issue', 
    description: 'Create a GitHub issue', 
    icon: '🐙',
    category: 'Development',
    tool_type: 'composio_github_create_issue'
  },
  'slack_send_message': { 
    name: 'Slack Message', 
    description: 'Send message to Slack', 
    icon: '💬',
    category: 'Communication',
    tool_type: 'composio_slack_send_message'
  },
  'gmail_send_email': { 
    name: 'Gmail Email', 
    description: 'Send email via Gmail', 
    icon: '📧',
    category: 'Communication',
    tool_type: 'composio_gmail_send_email'
  },
  'googledocs_create_doc': { 
    name: 'Google Docs', 
    description: 'Create a Google Docs document', 
    icon: '📄',
    category: 'Productivity',
    tool_type: 'composio_googledocs_create_doc'
  },
  'googlesheets_create_sheet': { 
    name: 'Google Sheets', 
    description: 'Create a Google Sheets spreadsheet', 
    icon: '📊',
    category: 'Productivity',
    tool_type: 'composio_googlesheets_create_sheet'
  },
  'googledrive_upload': { 
    name: 'Google Drive', 
    description: 'Upload file to Google Drive', 
    icon: '💾',
    category: 'Productivity',
    tool_type: 'composio_googledrive_upload'
  },
  'googlecalendar_create_event': { 
    name: 'Google Calendar', 
    description: 'Create a Google Calendar event', 
    icon: '📅',
    category: 'Productivity',
    tool_type: 'composio_googlecalendar_create_event'
  },
  'notion_create_page': { 
    name: 'Notion Page', 
    description: 'Create a Notion page', 
    icon: '📝',
    category: 'Productivity',
    tool_type: 'composio_notion_create_page'
  },
  'linear_create_issue': { 
    name: 'Linear Issue', 
    description: 'Create a Linear issue', 
    icon: '📋',
    category: 'Productivity',
    tool_type: 'composio_linear_create_issue'
  },
  'trello_create_card': { 
    name: 'Trello Card', 
    description: 'Create a Trello card', 
    icon: '🗃️',
    category: 'Productivity',
    tool_type: 'composio_trello_create_card'
  },
  'airtable_create_record': { 
    name: 'Airtable Record', 
    description: 'Create record in Airtable', 
    icon: '🗃️',
    category: 'Productivity',
    tool_type: 'composio_airtable_create_record'
  },
  'jira_create_issue': { 
    name: 'Jira Issue', 
    description: 'Create a Jira issue', 
    icon: '🎯',
    category: 'Development',
    tool_type: 'composio_jira_create_issue'
  }
}

// Define categories for better organization
const categories = {
  CORE: 'Core Components',
  CONTROL_FLOW: 'Logic & Control',
  TOOLS: 'Standard Tools',
  BETA: 'Beta Features',
}

// Define node templates with all necessary information
const nodeTemplates = [
  {
    category: categories.CORE,
    name: 'AI Agent',
    description: 'An autonomous agent that can reason and act.',
    icon: Bot,
    defaultData: {
      type: 'agent',
      name: 'AI_Agent',
      label: 'AI Agent',
      description: 'An AI agent that processes data and generates responses.',
      model_id: 'gpt-4o-mini',
      instructions: 'You are a helpful AI assistant.',
    },
  },
  {
    category: categories.CORE,
    name: 'Input Node',
    description: 'The starting point for your workflow data.',
    icon: FileInput,
    defaultData: {
      type: 'input',
      name: 'Input',
      label: 'Input Node',
      description: 'Receives and validates input data for the workflow.',
    },
  },
  {
    category: categories.CORE,
    name: 'Output Node',
    description: 'The final destination for your workflow results.',
    icon: FileOutput,
    defaultData: {
      type: 'output',
      name: 'Output',
      label: 'Output Node',
      description: 'Formats and presents the final workflow results.',
    },
  },
  {
    category: categories.CONTROL_FLOW,
    name: 'Conditional Router',
    description: 'Directs the workflow based on conditions.',
    icon: GitBranch,
    defaultData: {
      type: 'conditional',
      name: 'Router',
      label: 'Conditional Router',
      description: 'Routes the workflow to different branches based on rules.',
      conditions: [{ id: 'default', name: 'Default', is_default: true }],
    },
  },
  {
    category: categories.BETA,
    name: 'Webhook',
    description: 'Trigger this workflow from an external URL.',
    icon: Link2,
    defaultData: {
      type: 'webhook',
      name: 'Webhook',
      label: 'Webhook Trigger',
      description: 'Starts the workflow when a POST request is received.',
    },
  },
  {
    category: categories.TOOLS,
    name: 'Web Search',
    description: 'Searches the web for up-to-date information.',
    icon: Book,
    defaultData: {
      type: 'web_search',
      name: 'Web_Search',
      label: 'Web Search',
      description: 'Searches the web for up-to-date information.',
    },
  },
]

export default function NodePalette({ className = '' }: NodePaletteProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({
    [categories.CORE]: true,
    [categories.CONTROL_FLOW]: true,
    [categories.TOOLS]: true,
    [categories.BETA]: true,
  })
  const [hoveredNode, setHoveredNode] = useState<string | null>(null)
  const [userSettings, setUserSettings] = useState<UserSettings | null>(null)
  const [dynamicCategories, setDynamicCategories] = useState<NodeCategory[]>(NODE_CATEGORIES)
  const { tools: mcpTools, refresh: refreshTools } = useMCPTools(userSettings?.userId)
  const [composioCategories, setComposioCategories] = useState<any[]>([])
  const [builtInTools, setBuiltInTools] = useState<any[]>([])

  // Debug logging for MCP tools
  useEffect(() => {
    console.log('🎨 NodePalette: MCP Tools updated:', {
      totalTools: mcpTools.length,
      toolTypes: mcpTools.map(t => ({ id: t.id, type: t.type, source: t.source, status: t.server_status })),
      composioTools: mcpTools.filter(t => t.type === 'composio' || t.source === 'composio').length,
      builtInTools: mcpTools.filter(t => t.type === 'built-in' || t.source === 'built-in').length
    });
  }, [mcpTools]);

  // Load user settings and create dynamic Composio categories
  useEffect(() => {
    loadUserSettings()
    
    // Listen for localStorage changes (when user saves settings)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'userSettings') {
        console.log('🔄 User settings changed, refreshing tool palette...')
        loadUserSettings()
      }
    }
    
    // Listen for custom settings update events
    const handleSettingsUpdate = () => {
      console.log('🔄 Settings update event received, refreshing tool palette...')
      setTimeout(() => loadUserSettings(), 100) // Small delay to ensure localStorage is updated
    }
    
    window.addEventListener('storage', handleStorageChange)
    window.addEventListener('userSettingsUpdated', handleSettingsUpdate)
    
    return () => {
      window.removeEventListener('storage', handleStorageChange)
      window.removeEventListener('userSettingsUpdated', handleSettingsUpdate)
    }
  }, [])

  useEffect(() => {
    if (mcpTools.length > 0) {
      const composioTools = mcpTools.filter(tool => tool.type === 'composio' || tool.source === 'composio');
      const builtIn = mcpTools.filter(tool => tool.type === 'built-in' || tool.source === 'built-in');
      setBuiltInTools(builtIn);

      const grouped = composioTools.reduce((acc, tool) => {
        const categoryName = `Composio ${tool.category.charAt(0).toUpperCase() + tool.category.slice(1)}`;
        if (!acc[categoryName]) {
          acc[categoryName] = {
            id: `composio-${tool.category}`,
            name: categoryName,
            nodes: []
          };
        }
        acc[categoryName].nodes.push({
          id: tool.id,
          name: tool.name,
          description: tool.description,
          icon: '⚡️', // Placeholder icon
          type: 'tool',
          defaultData: {
            isComposio: true,
            tool_type: tool.id,
            label: tool.name,
            category: tool.category
          }
        });
        return acc;
      }, {} as any);
      
      setComposioCategories(Object.values(grouped));
      
      // Auto-expand the first Composio category if tools are found
      if (Object.keys(grouped).length > 0) {
        const firstCategory = Object.values(grouped)[0] as any;
        setExpandedCategories(prev => ({ ...prev, [firstCategory.id]: true }));
        console.log(`🎨 NodePalette: Found ${composioTools.length} Composio tools, auto-expanding ${firstCategory.name}`);
      }
    }
  }, [mcpTools]);

  const loadUserSettings = () => {
    try {
      const savedSettings = localStorage.getItem('userSettings')
      console.log('🔧 NodePalette: Raw localStorage userSettings:', savedSettings)
      
      if (savedSettings) {
        const settings = JSON.parse(savedSettings)
        setUserSettings(settings)
        
        console.log('🔧 NodePalette: Parsed user settings:', settings)
        console.log('🔧 NodePalette: User ID:', settings.userId)
        console.log('🔧 NodePalette: Composio API Key present:', !!settings.composioApiKey)
        console.log('🔧 NodePalette: Encrypted key present:', !!settings.encryptedComposioKey)
        console.log('🔧 NodePalette: Enabled tools:', settings.enabledTools)
        
        // Create dynamic Composio categories based on enabled tools
        if (settings.enabledTools && settings.enabledTools.length > 0) {
          console.log('🔧 NodePalette: Creating dynamic categories for enabled tools')
          createDynamicComposioCategories(settings.enabledTools)
        } else {
          console.log('🔧 NodePalette: No enabled tools found, showing default categories only')
          setDynamicCategories(NODE_CATEGORIES) // Reset to default if no tools enabled
        }
      } else {
        console.log('🔧 NodePalette: No user settings found in localStorage - user needs to set up Account settings first')
        setUserSettings(null)
        setDynamicCategories(NODE_CATEGORIES) // Reset to default
      }
    } catch (error) {
      console.error('Failed to load user settings:', error)
      setDynamicCategories(NODE_CATEGORIES) // Reset to default on error
    }
  }

  const createDynamicComposioCategories = (enabledTools: string[]) => {
    // Group enabled tools by category
    const toolsByCategory: Record<string, NodeTemplate[]> = {}
    
    enabledTools.forEach(toolId => {
      const toolConfig = composioToolsMapping[toolId]
      if (toolConfig) {
        const categoryKey = toolConfig.category.toLowerCase()
        if (!toolsByCategory[categoryKey]) {
          toolsByCategory[categoryKey] = []
        }
        toolsByCategory[categoryKey].push(createComposioNodeTemplate(toolId, toolConfig))
      }
    })

    // Create category objects for each category with tools
    const composioCategories: NodeCategory[] = Object.entries(toolsByCategory).map(([categoryKey, tools]) => ({
      id: `composio-${categoryKey}`,
      name: `Composio ${tools[0].defaultData.category}`,
      description: `${tools[0].defaultData.category} tools powered by Composio`,
      icon: '⚡',
      nodes: tools
    }))

    // Combine static categories with dynamic Composio categories
    const allCategories = [...NODE_CATEGORIES, ...composioCategories]
    setDynamicCategories(allCategories)

    // Auto-expand first Composio category if it exists
    if (composioCategories.length > 0) {
      setExpandedCategories(prev => ({ ...prev, [composioCategories[0].id]: true }))
    }
  }

  const onDragStart = (event: DragEvent<HTMLDivElement>, template: any) => {
    // Handle dynamic Composio tools
    if (template.defaultData?.isComposio) {
      const toolData = {
        isComposio: true,
        toolType: template.defaultData.tool_type,
        label: template.name,
        description: template.description,
      };
      event.dataTransfer.setData('application/reactflow', JSON.stringify(toolData));
    } else {
      // Handle static templates
      event.dataTransfer.setData('application/reactflow', 'agent'); // All are agent type visually
      event.dataTransfer.setData('application/template', JSON.stringify(template));
    }
    event.dataTransfer.effectAllowed = 'move';
  }

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => ({ ...prev, [category]: !prev[category] }))
  }

  const filteredTemplates = nodeTemplates.filter(template =>
    template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    template.description.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const groupedTemplates = filteredTemplates.reduce((acc, template) => {
    if (!acc[template.category]) {
      acc[template.category] = []
    }
    acc[template.category].push(template)
    return acc
  }, {} as Record<string, typeof nodeTemplates>)

  return (
    <div className={`h-full bg-white border-r border-gray-200 transition-all duration-300 ease-in-out w-72 flex flex-col ${className}`}>
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-center gap-2 mb-3">
            <Plus className="w-5 h-5 text-gray-700" />
            <h2 className="text-lg font-semibold text-gray-900">Node Palette</h2>
            <button
              onClick={refreshTools}
              className="ml-auto p-1 hover:bg-gray-100 rounded transition-colors"
              title="Refresh tools"
            >
              <RefreshCw className="w-4 h-4 text-gray-600" />
            </button>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search nodes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {Object.entries(groupedTemplates).map(([category, templates]) => (
          <div key={category} className="mb-4">
            <button
              onClick={() => toggleCategory(category)}
              className="w-full flex items-center justify-between text-left py-2 px-2 rounded-md hover:bg-gray-100"
            >
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">{category}</h3>
              {expandedCategories[category] ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>
            {expandedCategories[category] && (
              <div className="mt-2 space-y-2">
                {templates.map(template => {
                  const Icon = template.icon
                  return (
                    <div
                      key={template.name}
                      className="p-3 border border-gray-200 rounded-md cursor-move hover:border-blue-500 hover:bg-blue-50 transition-colors"
                      draggable
                      onDragStart={(e) => onDragStart(e, template)}
                    >
                      <div className="flex items-center gap-3 mb-1">
                        <Icon className="w-5 h-5 text-gray-600 flex-shrink-0" />
                        <div>
                          <div className="font-medium text-gray-900">{template.name}</div>
                          <div className="text-sm text-gray-500">{template.description}</div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        ))}
        {/* Render built-in tools in their own category */}
        {builtInTools.length > 0 && (
            <div className="mb-4">
                <button
                onClick={() => toggleCategory('built-in-tools')}
                className="w-full flex items-center justify-between text-left py-2 px-2 rounded-md hover:bg-gray-100"
                >
                <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">Standard Tools</h3>
                {expandedCategories['built-in-tools'] ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </button>
                {expandedCategories['built-in-tools'] && (
                <div className="mt-2 space-y-2">
                    {builtInTools.map((tool: any) => (
                    <div
                        key={tool.id}
                        className="p-3 border border-gray-200 rounded-md cursor-move hover:border-blue-500 hover:bg-blue-50 transition-colors"
                        draggable
                        onDragStart={(e) => onDragStart(e, { defaultData: { tool_type: tool.id, label: tool.name } })}
                    >
                        <div className="flex items-center gap-3 mb-1">
                        <Wrench className="w-5 h-5 text-gray-600 flex-shrink-0" />
                        <div>
                            <div className="font-medium text-gray-900">{tool.name}</div>
                            <div className="text-sm text-gray-500">{tool.description}</div>
                        </div>
                        </div>
                    </div>
                    ))}
                </div>
                )}
            </div>
        )}
        {composioCategories.map(category => (
          <div key={category.id} className="mb-4">
            <button
              onClick={() => toggleCategory(category.id)}
              className="w-full flex items-center justify-between text-left py-2 px-2 rounded-md hover:bg-gray-100"
            >
              <h3 className="text-sm font-semibold text-purple-700 uppercase tracking-wider">{category.name}</h3>
              {expandedCategories[category.id] ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>
            {expandedCategories[category.id] && (
              <div className="mt-2 space-y-2">
                {category.nodes.map((node: any) => (
                  <div
                    key={node.id}
                    className="p-3 border border-purple-200 rounded-md cursor-move hover:border-purple-500 hover:bg-purple-50 transition-colors"
                    draggable
                    onDragStart={(e) => onDragStart(e, node)}
                  >
                    <div className="flex items-center gap-3 mb-1">
                      <Zap className="w-5 h-5 text-purple-600 flex-shrink-0" />
                      <div>
                        <div className="font-medium text-gray-900">{node.name}</div>
                        <div className="text-sm text-gray-500">{node.description}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
} 