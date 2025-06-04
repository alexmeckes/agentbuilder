'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X, Save, Key, Shield, Settings as SettingsIcon, ExternalLink, Eye, EyeOff } from 'lucide-react'

interface UserSettings {
  userId: string
  composioApiKey?: string
  enabledTools: string[]
  preferences: {
    defaultFramework: string
    autoSaveWorkflows: boolean
  }
}

interface UserSettingsModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (settings: UserSettings) => void
}

const AVAILABLE_TOOLS = [
  { id: 'github_star_repo', name: 'GitHub Operations', icon: '🐙', category: 'Development' },
  { id: 'slack_send_message', name: 'Slack Messaging', icon: '💬', category: 'Communication' },
  { id: 'gmail_send_email', name: 'Gmail Operations', icon: '📧', category: 'Communication' },
  { id: 'notion_create_page', name: 'Notion Pages', icon: '📝', category: 'Productivity' },
  { id: 'linear_create_issue', name: 'Linear Issues', icon: '📋', category: 'Productivity' }
]

const FRAMEWORKS = [
  { id: 'openai', name: 'OpenAI GPT' },
  { id: 'claude', name: 'Anthropic Claude' },
  { id: 'gemini', name: 'Google Gemini' },
  { id: 'llama', name: 'Meta Llama' }
]

export default function UserSettingsModal({ isOpen, onClose, onSave }: UserSettingsModalProps) {
  const [settings, setSettings] = useState<UserSettings>({
    userId: '',
    composioApiKey: '',
    enabledTools: [],
    preferences: {
      defaultFramework: 'openai',
      autoSaveWorkflows: true
    }
  })
  
  const [showApiKey, setShowApiKey] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null)
  const [availableTools, setAvailableTools] = useState(AVAILABLE_TOOLS)
  const [isDiscoveringTools, setIsDiscoveringTools] = useState(false)

  // Load settings on mount
  useEffect(() => {
    if (isOpen) {
      loadUserSettings()
    }
  }, [isOpen])

  const loadUserSettings = () => {
    // Get or create user ID
    let userId = localStorage.getItem('userId')
    if (!userId) {
      userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      localStorage.setItem('userId', userId)
    }

    // Load existing settings
    const savedSettings = localStorage.getItem('userSettings')
    if (savedSettings) {
      const parsed = JSON.parse(savedSettings)
      setSettings({ ...parsed, userId })
      
      // Auto-discover tools if API key exists
      if (parsed.composioApiKey) {
        console.log('🔍 Auto-discovering tools for existing API key...')
        setTimeout(() => {
          discoverToolsForApiKey(parsed.composioApiKey, userId)
        }, 500) // Small delay to let UI settle
      }
    } else {
      setSettings(prev => ({ ...prev, userId }))
    }
  }

  const discoverToolsForApiKey = async (apiKey: string, userId: string) => {
    setIsDiscoveringTools(true)
    
    try {
      const response = await fetch('/api/test-composio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey, userId })
      })

      const result = await response.json()
      
      if (response.ok && result.success && result.availableApps) {
        const discoveredTools = mapComposioAppsToTools(result.availableApps, result.userInfo)
        setAvailableTools(discoveredTools)
        console.log(`🔍 Auto-discovered ${discoveredTools.length} tools from saved API key`)
      }
    } catch (error) {
      console.error('Failed to auto-discover tools:', error)
    } finally {
      setIsDiscoveringTools(false)
    }
  }

  const handleSave = async () => {
    setIsLoading(true)
    try {
      // Save to localStorage
      localStorage.setItem('userSettings', JSON.stringify(settings))
      
      // Save to backend (optional - for sync across devices)
      try {
        await fetch('/api/user-settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(settings)
        })
      } catch (e) {
        console.warn('Could not sync settings to backend:', e)
      }

      onSave(settings)
      onClose()
    } catch (error) {
      console.error('Failed to save settings:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const testComposioConnection = async () => {
    if (!settings.composioApiKey) {
      setTestResult({ success: false, message: 'Please enter an API key first' })
      return
    }

    setIsLoading(true)
    setIsDiscoveringTools(true)
    setTestResult(null)

    try {
      const response = await fetch('/api/test-composio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          apiKey: settings.composioApiKey,
          userId: settings.userId 
        })
      })

      const result = await response.json()
      
      if (response.ok && result.success) {
        // Map Composio apps to our tool definitions
        const discoveredTools = mapComposioAppsToTools(result.availableApps || [], result.userInfo)
        
        setAvailableTools(discoveredTools)
        
        // Update enabled tools to only include tools that are actually available
        setSettings(prev => ({
          ...prev,
          enabledTools: prev.enabledTools.filter(toolId => 
            discoveredTools.some(tool => tool.id === toolId)
          )
        }))
        
        const message = result.fallback 
          ? result.message 
          : `✅ Connected successfully! Found ${discoveredTools.length} available tools${result.userInfo?.email ? ` for ${result.userInfo.email}` : ''}`
        
        setTestResult({
          success: true,
          message
        })
      } else {
        setTestResult({
          success: false,
          message: result.message || 'Connection failed'
        })
        
        // Fallback to default tools if connection fails
        setAvailableTools(AVAILABLE_TOOLS)
      }
      
    } catch (error) {
      setTestResult({ success: false, message: 'Failed to test connection' })
      setAvailableTools(AVAILABLE_TOOLS)
    } finally {
      setIsLoading(false)
      setIsDiscoveringTools(false)
    }
  }

  const mapComposioAppsToTools = (availableApps: string[], userInfo?: any) => {
    const toolMapping: Record<string, any> = {
      'github': { id: 'github_star_repo', name: 'GitHub Operations', icon: '🐙', category: 'Development' },
      'slack': { id: 'slack_send_message', name: 'Slack Messaging', icon: '💬', category: 'Communication' },
      'gmail': { id: 'gmail_send_email', name: 'Gmail Operations', icon: '📧', category: 'Communication' },
      'notion': { id: 'notion_create_page', name: 'Notion Pages', icon: '📝', category: 'Productivity' },
      'linear': { id: 'linear_create_issue', name: 'Linear Issues', icon: '📋', category: 'Productivity' },
      // Add more mappings as needed
      'google': { id: 'gmail_send_email', name: 'Gmail Operations', icon: '📧', category: 'Communication' },
      'microsoft': { id: 'outlook_send_email', name: 'Outlook Operations', icon: '📮', category: 'Communication' },
      'trello': { id: 'trello_create_card', name: 'Trello Cards', icon: '📋', category: 'Productivity' },
      'asana': { id: 'asana_create_task', name: 'Asana Tasks', icon: '✅', category: 'Productivity' }
    }
    
    const discoveredTools: any[] = []
    
    // Map available apps to tools
    availableApps.forEach(appName => {
      const normalizedName = appName.toLowerCase()
      
      // Try exact match first
      if (toolMapping[normalizedName]) {
        discoveredTools.push(toolMapping[normalizedName])
        return
      }
      
      // Try partial matches
      Object.keys(toolMapping).forEach(key => {
        if (normalizedName.includes(key) || key.includes(normalizedName)) {
          if (!discoveredTools.some(tool => tool.id === toolMapping[key].id)) {
            discoveredTools.push(toolMapping[key])
          }
        }
      })
    })
    
    // If no tools discovered, show all available tools as fallback
    if (discoveredTools.length === 0) {
      console.log('No specific tools mapped, showing all available tools')
      return AVAILABLE_TOOLS
    }
    
    console.log(`🔍 Discovered ${discoveredTools.length} tools from ${availableApps.length} connected apps:`, 
      discoveredTools.map(t => t.name))
    
    return discoveredTools
  }

  const toggleTool = (toolId: string) => {
    setSettings(prev => ({
      ...prev,
      enabledTools: prev.enabledTools.includes(toolId)
        ? prev.enabledTools.filter(id => id !== toolId)
        : [...prev.enabledTools, toolId]
    }))
  }

  if (!isOpen) return null

  const modalContent = (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-2">
            <SettingsIcon className="w-5 h-5 text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-900">User Settings</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* User ID Display */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              User ID
            </label>
            <div className="bg-gray-50 px-3 py-2 rounded-lg text-sm text-gray-600 font-mono">
              {settings.userId}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              This unique ID identifies your settings and tool connections
            </p>
          </div>

          {/* Composio API Key */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Key className="w-4 h-4 inline mr-1" />
              Composio API Key
            </label>
            <div className="flex space-x-2">
              <div className="flex-1 relative">
                <input
                  type={showApiKey ? 'text' : 'password'}
                  value={settings.composioApiKey || ''}
                  onChange={(e) => setSettings(prev => ({ ...prev, composioApiKey: e.target.value }))}
                  placeholder="Enter your Composio API key..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <button
                onClick={testComposioConnection}
                disabled={isLoading || !settings.composioApiKey}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                {isLoading ? 'Testing...' : 'Test'}
              </button>
            </div>
            
            {testResult && (
              <div className={`mt-2 p-2 rounded-lg text-sm ${
                testResult.success 
                  ? 'bg-green-50 text-green-700 border border-green-200' 
                  : 'bg-red-50 text-red-700 border border-red-200'
              }`}>
                {testResult.message}
              </div>
            )}

            <div className="mt-2 text-xs text-gray-500">
              <a 
                href="https://app.composio.dev/settings" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 inline-flex items-center"
              >
                Get your API key from Composio Dashboard
                <ExternalLink className="w-3 h-3 ml-1" />
              </a>
            </div>
          </div>

          {/* Available Tools */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="block text-sm font-medium text-gray-700">
                <Shield className="w-4 h-4 inline mr-1" />
                Available Tools
              </label>
              {isDiscoveringTools && (
                <div className="flex items-center text-sm text-blue-600">
                  <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mr-2"></div>
                  Discovering tools...
                </div>
              )}
            </div>
            
            {availableTools.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Shield className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                <p>No tools available</p>
                <p className="text-xs">Connect apps in your Composio dashboard</p>
              </div>
            ) : (
              <div className="space-y-2">
                {availableTools.map(tool => (
                  <div key={tool.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <span className="text-xl">{tool.icon}</span>
                      <div>
                        <div className="font-medium text-gray-900">{tool.name}</div>
                        <div className="text-xs text-gray-500">{tool.category}</div>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.enabledTools.includes(tool.id)}
                        onChange={() => toggleTool(tool.id)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                ))}
                
                {testResult?.success && availableTools.length > 0 && (
                  <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm">
                    <div className="text-blue-800">
                      <strong>✨ Dynamic Discovery:</strong> These tools were discovered from your connected Composio apps.
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Preferences */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Preferences
            </label>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Default Framework</label>
                <select
                  value={settings.preferences.defaultFramework}
                  onChange={(e) => setSettings(prev => ({
                    ...prev,
                    preferences: { ...prev.preferences, defaultFramework: e.target.value }
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {FRAMEWORKS.map(framework => (
                    <option key={framework.id} value={framework.id}>
                      {framework.name}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Auto-save workflows</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.preferences.autoSaveWorkflows}
                    onChange={(e) => setSettings(prev => ({
                      ...prev,
                      preferences: { ...prev.preferences, autoSaveWorkflows: e.target.checked }
                    }))}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isLoading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Save Settings</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )

  return createPortal(modalContent, document.body)
} 