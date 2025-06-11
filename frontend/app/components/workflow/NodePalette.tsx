'use client'

import { useState, useEffect, DragEvent } from 'react'
import { Search, ChevronDown, ChevronRight, Plus, Zap, Bot, Wrench, FileInput, FileOutput, Brain, Github, MessageSquare, Book, FileCode, Database, Link2, GitBranch, RefreshCw } from 'lucide-react'
import { NODE_CATEGORIES, NodeTemplate, getNodeTemplate, NodeCategory } from '../../types/NodeTypes'
import { useMCPTools, MCPTool } from '../../hooks/useMCPTools'

interface NodePaletteProps {
  className?: string
  isManualMode?: boolean // Add support for mode indication
}

interface UserSettings {
  userId: string
  composioApiKey?: string
  enabledTools: string[]
  preferences: any
}


// Define categories for better organization
const categories = {
  CORE: 'Core Components',
  CONTROL_FLOW: 'Logic & Control',
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
]

export default function NodePalette({ className = '', isManualMode = true }: NodePaletteProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({
    [categories.CORE]: true,
    [categories.CONTROL_FLOW]: true,
    [categories.BETA]: true,
  })
  const [hoveredNode, setHoveredNode] = useState<string | null>(null)
  const [userSettings, setUserSettings] = useState<UserSettings | null>(null)
  const { tools: mcpTools, getAppNodes, getBuiltInTools, refresh: refreshTools } = useMCPTools(userSettings?.userId)
  const [builtInTools, setBuiltInTools] = useState<any[]>([])
  const [appNodes, setAppNodes] = useState<any[]>([])

  // Debug logging for MCP tools and App Nodes
  useEffect(() => {
    const appNodesData = getAppNodes();
    const builtInData = getBuiltInTools();
    
    console.log('🎨 NodePalette: Tools updated:', {
      totalTools: mcpTools.length,
      toolTypes: mcpTools.map(t => ({ id: t.id, type: t.type, source: t.source, status: t.server_status })),
      appNodes: appNodesData.length,
      composioTools: mcpTools.filter(t => t.type === 'composio' || t.source === 'composio').length,
      builtInTools: builtInData.length
    });
    
    setAppNodes(appNodesData);
    setBuiltInTools(builtInData);
    
    // Auto-expand Connected Apps if we have app nodes
    if (appNodesData.length > 0) {
      setExpandedCategories(prev => ({ ...prev, 'connected-apps': true }));
    }
  }, [mcpTools, getAppNodes, getBuiltInTools]);

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
        
        // Note: App Nodes are now handled by useMCPTools and user-tools endpoint
      } else {
        console.log('🔧 NodePalette: No user settings found in localStorage - user needs to set up Account settings first')
        setUserSettings(null)
      }
    } catch (error) {
      console.error('Failed to load user settings:', error)
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
            <div className="flex-1">
              <h2 className="text-lg font-semibold text-gray-900">Node Palette</h2>
              <div className="flex items-center gap-1 mt-0.5">
                <div className={`w-2 h-2 rounded-full ${isManualMode ? 'bg-green-500' : 'bg-blue-500'}`} />
                <span className="text-xs text-gray-500">
                  {isManualMode ? 'Manual Design Mode' : 'AI Assistant Mode'}
                </span>
              </div>
            </div>
            <button
              onClick={refreshTools}
              className="p-1 hover:bg-gray-100 rounded transition-colors"
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
        {/* NEW: Render App Nodes (Connected Apps) */}
        {appNodes.length > 0 && (
            <div className="mb-4">
                <button
                onClick={() => toggleCategory('connected-apps')}
                className="w-full flex items-center justify-between text-left py-2 px-2 rounded-md hover:bg-gray-100"
                >
                <h3 className="text-sm font-semibold text-blue-700 uppercase tracking-wider">
                  🔗 Connected Apps ({appNodes.length})
                </h3>
                {expandedCategories['connected-apps'] ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </button>
                {expandedCategories['connected-apps'] && (
                <div className="mt-2 space-y-2">
                    {appNodes.map((appNode: any) => (
                    <div
                        key={appNode.id}
                        className="p-3 border border-blue-200 rounded-md cursor-move hover:border-blue-500 hover:bg-blue-50 transition-colors"
                        draggable
                        onDragStart={(e) => onDragStart(e, { 
                          defaultData: { 
                            type: 'app',
                            appId: appNode.appId,
                            appName: appNode.name,
                            defaultAction: appNode.defaultAction,
                            availableActions: appNode.availableActions,
                            label: appNode.name,
                            isComposioApp: true
                          } 
                        })}
                        title={`${appNode.name} - Actions: ${appNode.availableActions?.join(', ')}`}
                    >
                        <div className="flex items-center gap-3 mb-1">
                        <div className="text-lg">{appNode.icon || '🔗'}</div>
                        <div className="flex-1">
                            <div className="font-medium text-gray-900">{appNode.name}</div>
                            <div className="text-sm text-gray-500">{appNode.description}</div>
                            <div className="text-xs text-blue-600 mt-1">
                              {appNode.availableActions?.length || 0} actions available
                            </div>
                        </div>
                        </div>
                    </div>
                    ))}
                </div>
                )}
            </div>
        )}
      </div>
    </div>
  )
} 