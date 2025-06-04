'use client'

import { useState, useEffect } from 'react'
import type { DragEvent } from 'react'
import { ChevronLeft, ChevronRight, Bot, Wrench, FileInput, FileOutput, Zap, Settings } from 'lucide-react'

const nodeTypes = [
  { type: 'agent', label: 'Agent', description: 'An AI agent node', icon: Bot },
  { type: 'tool', label: 'Tool', description: 'A tool node', icon: Wrench },
  { type: 'input', label: 'Input', description: 'An input node', icon: FileInput },
  { type: 'output', label: 'Output', description: 'An output node', icon: FileOutput },
]

const composioToolsMapping: Record<string, any> = {
  'github_star_repo': { 
    name: 'GitHub Star', 
    description: 'Star a GitHub repository', 
    icon: '🐙',
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
  }
}

interface UserSettings {
  userId: string
  composioApiKey?: string
  enabledTools: string[]
  preferences: any
}

export default function Sidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [activeTab, setActiveTab] = useState<'basic' | 'composio'>('basic')
  const [userSettings, setUserSettings] = useState<UserSettings | null>(null)
  const [composioTools, setComposioTools] = useState<any[]>([])

  // Load user settings and enabled Composio tools
  useEffect(() => {
    loadUserSettings()
  }, [])

  const loadUserSettings = () => {
    try {
      const savedSettings = localStorage.getItem('userSettings')
      if (savedSettings) {
        const settings = JSON.parse(savedSettings)
        setUserSettings(settings)
        
        // Map enabled tools to draggable tool definitions
        const enabledComposioTools = settings.enabledTools?.map((toolId: string) => {
          const toolDef = composioToolsMapping[toolId]
          if (toolDef) {
            return {
              id: toolId,
              type: 'tool', // Will be a tool node type
              label: toolDef.name,
              description: toolDef.description,
              icon: toolDef.icon,
              category: toolDef.category,
              tool_type: toolDef.tool_type,
              isComposio: true
            }
          }
          return null
        }).filter(Boolean) || []
        
        setComposioTools(enabledComposioTools)
      }
    } catch (error) {
      console.error('Failed to load user settings:', error)
    }
  }

  const onDragStart = (event: DragEvent<HTMLDivElement>, nodeType: string, toolData?: any) => {
    // For Composio tools, pass additional data
    if (toolData?.isComposio) {
      event.dataTransfer.setData('application/reactflow', JSON.stringify({
        type: 'tool',
        toolType: toolData.tool_type,
        label: toolData.label,
        description: toolData.description,
        category: toolData.category,
        isComposio: true
      }))
    } else {
      event.dataTransfer.setData('application/reactflow', nodeType)
    }
    event.dataTransfer.effectAllowed = 'move'
  }

  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed)
  }

  const tabs = [
    { id: 'basic', name: 'Basic', icon: Bot },
    { id: 'composio', name: 'Composio', icon: Zap, count: composioTools.length }
  ]

  return (
    <div className={`h-full bg-white border-r border-gray-200 transition-all duration-300 ease-in-out ${
      isCollapsed ? 'w-12' : 'w-64'
    }`}>
      {/* Header with toggle button */}
      <div className="flex items-center justify-between p-4 border-b border-gray-100">
        {!isCollapsed && (
          <h2 className="text-lg font-semibold text-gray-900">Node Library</h2>
        )}
        <button
          onClick={toggleCollapse}
          className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
          title={isCollapsed ? 'Expand Node Library' : 'Collapse Node Library'}
        >
          {isCollapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <ChevronLeft className="w-4 h-4" />
          )}
        </button>
      </div>

      {!isCollapsed && (
        /* Tabs */
        <div className="flex border-b border-gray-100">
          {tabs.map((tab) => {
            const TabIcon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as 'basic' | 'composio')}
                className={`flex-1 flex items-center justify-center gap-1 py-2 px-3 text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                <TabIcon className="w-4 h-4" />
                <span>{tab.name}</span>
                {tab.count !== undefined && tab.count > 0 && (
                  <span className="bg-blue-100 text-blue-600 text-xs px-1.5 py-0.5 rounded-full ml-1">
                    {tab.count}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      )}

      {/* Node items */}
      <div className="p-4 flex-1 overflow-y-auto">
        {isCollapsed ? (
          // Collapsed view - show only icons
          <div className="space-y-3">
            {activeTab === 'basic' ? (
              nodeTypes.map((node) => {
                const IconComponent = node.icon
                return (
                  <div
                    key={node.type}
                    className="p-2 border border-gray-200 rounded-md cursor-move hover:border-blue-500 hover:bg-blue-50 transition-colors flex items-center justify-center"
                    draggable
                    onDragStart={(e) => onDragStart(e, node.type)}
                    title={`${node.label} - ${node.description}`}
                  >
                    <IconComponent className="w-5 h-5 text-gray-600" />
                  </div>
                )
              })
            ) : (
              composioTools.map((tool) => (
                <div
                  key={tool.id}
                  className="p-2 border border-blue-200 rounded-md cursor-move hover:border-blue-500 hover:bg-blue-50 transition-colors flex items-center justify-center bg-gradient-to-r from-blue-50 to-purple-50"
                  draggable
                  onDragStart={(e) => onDragStart(e, 'tool', tool)}
                  title={`${tool.label} - ${tool.description}`}
                >
                  <span className="text-lg">{tool.icon}</span>
                </div>
              ))
            )}
          </div>
        ) : (
          // Expanded view - show full cards
          <div className="space-y-2">
            {activeTab === 'basic' ? (
              nodeTypes.map((node) => {
                const IconComponent = node.icon
                return (
                  <div
                    key={node.type}
                    className="p-3 border border-gray-200 rounded-md cursor-move hover:border-blue-500 hover:bg-blue-50 transition-colors"
                    draggable
                    onDragStart={(e) => onDragStart(e, node.type)}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <IconComponent className="w-4 h-4 text-gray-600" />
                      <div className="font-medium text-gray-900">{node.label}</div>
                    </div>
                    <div className="text-sm text-gray-500">{node.description}</div>
                  </div>
                )
              })
            ) : (
              <>
                {composioTools.length > 0 ? (
                  composioTools.map((tool) => (
                    <div
                      key={tool.id}
                      className="p-3 border border-blue-200 rounded-md cursor-move hover:border-blue-500 hover:bg-blue-50 transition-colors bg-gradient-to-r from-blue-50 to-purple-50"
                      draggable
                      onDragStart={(e) => onDragStart(e, 'tool', tool)}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-lg">{tool.icon}</span>
                        <div className="font-medium text-gray-900">{tool.label}</div>
                      </div>
                      <div className="text-sm text-gray-500">{tool.description}</div>
                      <div className="text-xs text-blue-600 mt-1 font-medium">
                        {tool.category} • Composio
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Settings className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                    <p className="text-sm font-medium">No Composio tools enabled</p>
                    <p className="text-xs">Configure tools in Account settings</p>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* Helpful tip when collapsed */}
      {isCollapsed && (
        <div className="px-2 py-1">
          <div className="text-xs text-gray-400 text-center transform rotate-90 whitespace-nowrap">
            Drag to add
          </div>
        </div>
      )}
    </div>
  )
} 