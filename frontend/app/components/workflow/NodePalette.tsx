'use client'

import { useState, useEffect, DragEvent } from 'react'
import { Search, ChevronDown, ChevronRight, Plus, Zap } from 'lucide-react'
import { NODE_CATEGORIES, NodeTemplate, getNodeTemplate, NodeCategory } from '../../types/NodeTypes'

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

export default function NodePalette({ className = '' }: NodePaletteProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['ai-agents']))
  const [hoveredNode, setHoveredNode] = useState<string | null>(null)
  const [userSettings, setUserSettings] = useState<UserSettings | null>(null)
  const [dynamicCategories, setDynamicCategories] = useState<NodeCategory[]>(NODE_CATEGORIES)

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
      if (savedSettings) {
        const settings = JSON.parse(savedSettings)
        setUserSettings(settings)
        
        console.log('🔧 NodePalette: Loading user settings:', settings)
        console.log('🔧 NodePalette: Enabled tools:', settings.enabledTools)
        
        // Create dynamic Composio categories based on enabled tools
        if (settings.enabledTools && settings.enabledTools.length > 0) {
          createDynamicComposioCategories(settings.enabledTools)
        } else {
          console.log('🔧 NodePalette: No enabled tools found, showing default categories only')
          setDynamicCategories(NODE_CATEGORIES) // Reset to default if no tools enabled
        }
      } else {
        console.log('🔧 NodePalette: No user settings found in localStorage')
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
      setExpandedCategories(prev => new Set([...prev, composioCategories[0].id]))
    }
  }

  // Filter categories based on search term
  const filteredCategories = dynamicCategories.map(category => ({
    ...category,
    nodes: category.nodes.filter(node =>
      node.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      node.description.toLowerCase().includes(searchTerm.toLowerCase())
    )
  })).filter(category => category.nodes.length > 0)

  const toggleCategory = (categoryId: string) => {
    const newExpanded = new Set(expandedCategories)
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId)
    } else {
      newExpanded.add(categoryId)
    }
    setExpandedCategories(newExpanded)
  }

  const onDragStart = (event: DragEvent<HTMLDivElement>, templateId: string) => {
    event.dataTransfer.setData('application/reactflow', templateId)
    event.dataTransfer.effectAllowed = 'move'
    
    // Set custom drag image
    const template = getNodeTemplate(templateId)
    if (template) {
      event.dataTransfer.setData('application/template', JSON.stringify(template))
    }
  }

  return (
    <div className={`w-80 h-full bg-white border-r border-slate-200 flex flex-col ${className}`}>
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-200 bg-slate-50">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-6 h-6 bg-blue-100 rounded-lg flex items-center justify-center">
            <Plus className="w-4 h-4 text-blue-600" />
          </div>
          <h2 className="text-lg font-semibold text-slate-900">Node Palette</h2>
        </div>
        
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search nodes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Categories */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-2">
          {filteredCategories.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No nodes found</p>
              <p className="text-xs">Try a different search term</p>
            </div>
          ) : (
            filteredCategories.map((category) => (
              <div key={category.id} className="mb-2">
                {/* Category Header */}
                <button
                  onClick={() => toggleCategory(category.id)}
                  className={`w-full flex items-center gap-2 px-3 py-2 text-left rounded-lg hover:bg-slate-50 transition-colors ${
                    category.id.startsWith('composio-') ? 'bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200' : ''
                  }`}
                >
                  {expandedCategories.has(category.id) ? (
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  )}
                  <span className="text-lg">{category.icon}</span>
                  <div className="flex-1">
                    <h3 className={`text-sm font-medium ${
                      category.id.startsWith('composio-') ? 'text-purple-900' : 'text-slate-900'
                    }`}>
                      {category.name}
                    </h3>
                    <p className={`text-xs ${
                      category.id.startsWith('composio-') ? 'text-purple-600' : 'text-slate-600'
                    }`}>
                      {category.description}
                    </p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    category.id.startsWith('composio-') 
                      ? 'text-purple-600 bg-purple-100' 
                      : 'text-slate-400 bg-slate-100'
                  }`}>
                    {category.nodes.length}
                  </span>
                </button>

                {/* Category Nodes */}
                {expandedCategories.has(category.id) && (
                  <div className="ml-6 mt-1 space-y-1">
                    {category.nodes.map((node) => (
                      <div
                        key={node.id}
                        className="group relative"
                        onMouseEnter={() => setHoveredNode(node.id)}
                        onMouseLeave={() => setHoveredNode(null)}
                      >
                        <div
                          className={`p-3 border border-slate-200 rounded-lg cursor-move hover:border-blue-300 hover:bg-blue-50/50 transition-all duration-200 bg-white ${
                            node.defaultData?.isComposio ? 'border-purple-200 bg-gradient-to-r from-purple-50/50 to-blue-50/50' : ''
                          }`}
                          draggable
                          onDragStart={(e) => onDragStart(e, node.id)}
                        >
                          <div className="flex items-start gap-3">
                            <span className="text-lg flex-shrink-0">{node.icon}</span>
                            <div className="flex-1 min-w-0">
                              <h4 className="text-sm font-medium text-slate-900 truncate">
                                {node.name}
                              </h4>
                              <p className="text-xs text-slate-600 mt-1 line-clamp-2">
                                {node.description}
                              </p>
                              
                              {/* Node Type Badge */}
                              <div className="flex items-center gap-2 mt-2">
                                <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                                  node.type === 'agent' ? 'bg-blue-100 text-blue-700' :
                                  node.type === 'tool' ? 'bg-green-100 text-green-700' :
                                  node.type === 'input' ? 'bg-purple-100 text-purple-700' :
                                  node.type === 'output' ? 'bg-orange-100 text-orange-700' :
                                  'bg-slate-100 text-slate-700'
                                }`}>
                                  {node.type}
                                </span>
                                
                                {/* Composio indicator */}
                                {node.defaultData?.isComposio && (
                                  <div className="flex items-center gap-1">
                                    <Zap className="w-3 h-3 text-purple-500" />
                                    <span className="text-xs text-purple-600 font-medium">
                                      Composio
                                    </span>
                                  </div>
                                )}
                                
                                {/* Configurable indicator */}
                                {node.configurable.length > 0 && (
                                  <span className="text-xs text-slate-500">
                                    {node.configurable.length} configurable
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Hover Tooltip */}
                        {hoveredNode === node.id && (
                          <div className="absolute left-full top-0 ml-2 z-50 w-64 p-3 bg-white border border-slate-200 rounded-lg shadow-lg">
                            <h4 className="font-medium text-slate-900 mb-2">{node.name}</h4>
                            <p className="text-sm text-slate-600 mb-3">{node.description}</p>
                            
                            {/* Composio Badge in Tooltip */}
                            {node.defaultData?.isComposio && (
                              <div className="flex items-center gap-1 mb-3 px-2 py-1 bg-purple-100 text-purple-700 rounded-md text-xs">
                                <Zap className="w-3 h-3" />
                                <span>Powered by Composio</span>
                              </div>
                            )}
                            
                            {/* Default Configuration Preview */}
                            <div className="space-y-2">
                              <h5 className="text-xs font-medium text-slate-700 uppercase tracking-wide">
                                Default Configuration:
                              </h5>
                              <div className="space-y-1">
                                {node.type === 'agent' && (
                                  <div className="flex justify-between text-xs">
                                    <span className="text-slate-600">Model:</span>
                                    <span className="text-slate-900 font-mono">
                                      {node.defaultData.model_id}
                                    </span>
                                  </div>
                                )}
                                <div className="flex justify-between text-xs">
                                  <span className="text-slate-600">Name:</span>
                                  <span className="text-slate-900 font-mono">
                                    {node.defaultData.name}
                                  </span>
                                </div>
                                {node.defaultData?.tool_type && (
                                  <div className="flex justify-between text-xs">
                                    <span className="text-slate-600">Tool Type:</span>
                                    <span className="text-slate-900 font-mono">
                                      {node.defaultData.tool_type}
                                    </span>
                                  </div>
                                )}
                              </div>
                              
                              {/* Configurable Fields */}
                              {node.configurable.length > 0 && (
                                <div className="mt-2 pt-2 border-t border-slate-100">
                                  <h5 className="text-xs font-medium text-slate-700 mb-1">
                                    Configurable Fields:
                                  </h5>
                                  <div className="flex flex-wrap gap-1">
                                    {node.configurable.map((field) => (
                                      <span 
                                        key={field}
                                        className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded"
                                      >
                                        {field}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-slate-200 bg-slate-50">
        <div className="text-xs text-slate-600 text-center">
          <p>💡 <strong>Tip:</strong> Drag nodes to the canvas to add them</p>
          <p className="mt-1">Double-click nodes after adding to configure</p>
        </div>
      </div>
    </div>
  )
} 