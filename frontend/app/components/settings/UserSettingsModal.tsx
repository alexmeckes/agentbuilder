'use client'

import { useState, useEffect } from 'react'
import { useComposioErrorHandler } from '../../lib/composio-error-handler'
import ComposioErrorDisplay from '../composio/ComposioErrorDisplay'
import { createPortal } from 'react-dom'
import { X, Save, Key, Shield, Settings as SettingsIcon, ExternalLink, Eye, EyeOff, Lock } from 'lucide-react'
import { ClientSideEncryption } from '@/lib/encryption'

interface UserSettings {
  userId: string
  composioApiKey?: string
  encryptedComposioKey?: {
    encryptedData: string
    keyId: string
    salt: string
  }
  masterPasswordHash?: string
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
  const { handleError, executeWithErrorHandling } = useComposioErrorHandler()
  
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
  const [mcpUpdateStatus, setMcpUpdateStatus] = useState<string | null>(null)
  
  // Encryption-related state
  const [masterPassword, setMasterPassword] = useState('')
  const [confirmMasterPassword, setConfirmMasterPassword] = useState('')
  const [showMasterPassword, setShowMasterPassword] = useState(false)
  const [needsMasterPassword, setNeedsMasterPassword] = useState(false)
  const [encryptionSupported, setEncryptionSupported] = useState(false)
  const [decryptedApiKey, setDecryptedApiKey] = useState('')

  // Check encryption support on mount
  useEffect(() => {
    setEncryptionSupported(ClientSideEncryption.isSupported())
  }, [])

  // Load settings on mount
  useEffect(() => {
    if (isOpen) {
      loadUserSettings()
    }
  }, [isOpen])

  const loadUserSettings = async () => {
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
      
      // Check if we have encrypted API key
      if (parsed.encryptedComposioKey && encryptionSupported) {
        console.log('🔐 Found encrypted API key, attempting auto-decryption...')
        
        try {
          // Try auto-generated master password first
          const autoMasterPassword = await ClientSideEncryption.generateUserMasterPassword(userId)
          const apiKey = await ClientSideEncryption.decryptApiKey({
            encryptedData: parsed.encryptedComposioKey.encryptedData,
            salt: parsed.encryptedComposioKey.salt,
            masterKey: autoMasterPassword
          })
          
          setDecryptedApiKey(apiKey)
          console.log('✅ API key auto-decrypted successfully')
          
          // Auto-discover tools with decrypted key
          setTimeout(() => {
            discoverToolsForApiKey(apiKey, userId)
          }, 500)
          
        } catch (error) {
          console.log('🔐 Auto-decryption failed, user may have set custom master password')
          setNeedsMasterPassword(true)
        }
      }
      // Fallback to unencrypted key (legacy support)
      else if (parsed.composioApiKey) {
        console.log('🔍 Auto-discovering tools for existing API key...')
        setDecryptedApiKey(parsed.composioApiKey)
        setTimeout(() => {
          discoverToolsForApiKey(parsed.composioApiKey, userId)
        }, 500)
      }
    } else {
      setSettings(prev => ({ ...prev, userId }))
    }
  }

  const handleMasterPasswordSubmit = async () => {
    if (!masterPassword || !settings.encryptedComposioKey) {
      setTestResult({ success: false, message: 'Master password is required' })
      return
    }

    try {
      setIsLoading(true)
      
      // Decrypt the API key
      const apiKey = await ClientSideEncryption.decryptApiKey({
        encryptedData: settings.encryptedComposioKey.encryptedData,
        salt: settings.encryptedComposioKey.salt,
        masterKey: masterPassword
      })
      
      setDecryptedApiKey(apiKey)
      setNeedsMasterPassword(false)
      setMasterPassword('')
      
      // Auto-discover tools with decrypted key
      console.log('🔍 Auto-discovering tools with decrypted API key...')
      setTimeout(() => {
        discoverToolsForApiKey(apiKey, settings.userId)
      }, 500)
      
      setTestResult({ success: true, message: 'API key decrypted successfully!' })
      
    } catch (error) {
      console.error('Decryption failed:', error)
      setTestResult({ success: false, message: 'Invalid master password or corrupted data' })
    } finally {
      setIsLoading(false)
    }
  }

  const encryptAndStoreApiKey = async (apiKey: string, masterPassword: string): Promise<boolean> => {
    if (!encryptionSupported) {
      console.warn('Encryption not supported, storing in plaintext')
      return false
    }

    try {
      const encrypted = await ClientSideEncryption.encryptApiKey(apiKey, masterPassword)
      
      // Store encrypted data
      setSettings(prev => ({
        ...prev,
        encryptedComposioKey: encrypted,
        composioApiKey: undefined, // Remove plaintext version
        masterPasswordHash: btoa(masterPassword).substring(0, 16) // Simple hash for validation
      }))
      
      setDecryptedApiKey(apiKey)
      console.log('🔐 API key encrypted and stored successfully')
      return true
      
    } catch (error) {
      console.error('Encryption failed:', error)
      setTestResult({ success: false, message: 'Failed to encrypt API key' })
      return false
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
      
      // Log the complete API response for debugging
      console.log('🔍 FULL API RESPONSE:', JSON.stringify(result, null, 2))
      console.log('📱 Available Apps from API:', result.availableApps)
      console.log('🔗 Connected Accounts from API:', result.connectedAccounts)
      console.log('🐛 Debug Info:', result.debug)
      
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
    try {
      setIsLoading(true)
      
      // Handle API key encryption if needed
      let finalSettings = { ...settings }
      
      // If user entered a new API key and encryption is supported, auto-encrypt it
      if (settings.composioApiKey && encryptionSupported) {
        // Auto-generate master password based on user ID if not provided by user
        const effectiveMasterPassword = masterPassword || await ClientSideEncryption.generateUserMasterPassword(settings.userId)
        
        const encrypted = await encryptAndStoreApiKey(settings.composioApiKey, effectiveMasterPassword)
        if (encrypted) {
          finalSettings = { ...settings }
          // encryptAndStoreApiKey already updated settings state with encrypted data
        }
      }
      
      // Save settings to localStorage
      localStorage.setItem('userSettings', JSON.stringify(finalSettings))
      
      // Also call the save callback
      onSave(settings)
      
      // NEW: Update MCP Composio server configuration if API key is provided
      const effectiveApiKey = decryptedApiKey || settings.composioApiKey
      if (effectiveApiKey || settings.encryptedComposioKey) {
        try {
          console.log('🔧 Updating MCP Composio server configuration...')
          setMcpUpdateStatus('Updating server configuration...')
          
          // Prepare payload - send encrypted data if available
          const payload = settings.encryptedComposioKey ? {
            userId: settings.userId,
            encryptedApiKey: settings.encryptedComposioKey.encryptedData,
            keyId: settings.encryptedComposioKey.keyId,
            salt: settings.encryptedComposioKey.salt,
            enabledTools: settings.enabledTools,
            encrypted: true
          } : {
            userId: settings.userId,
            apiKey: effectiveApiKey,
            enabledTools: settings.enabledTools,
            encrypted: false
          }
          
          // Add timeout to prevent hanging
          const timeoutPromise = new Promise<never>((_, reject) => 
            setTimeout(() => reject(new Error('MCP update timeout')), 10000) // 10 second timeout
          )
          
          const fetchPromise = fetch('/api/mcp/update-composio-server', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
          })
          
          const mcpUpdateResponse = await Promise.race([fetchPromise, timeoutPromise]) as Response
          
          if (mcpUpdateResponse.ok) {
            const updateResult = await mcpUpdateResponse.json()
            console.log('✅ MCP Composio server updated:', updateResult)
            setMcpUpdateStatus('Server updated successfully')
          } else {
            console.warn('⚠️ Failed to update MCP Composio server:', mcpUpdateResponse.status)
            setMcpUpdateStatus('Server update failed - tools may need manual refresh')
            // Don't fail the save operation, just log the warning
          }
        } catch (mcpError: any) {
          console.warn('⚠️ MCP update failed (timeout or error):', mcpError)
          // Don't fail the save operation, just log the warning
          // Add user notification about MCP update issue
          if (mcpError?.message === 'MCP update timeout') {
            setMcpUpdateStatus('Server update timed out - settings saved, tools may need manual refresh')
            console.log('💡 MCP server update timed out - your settings are saved but tools may need manual refresh')
          } else {
            setMcpUpdateStatus('Server update failed - settings saved')
          }
        }
      }
      
      console.log('💾 User settings saved successfully')
      
      // Trigger event to refresh tool palette
      window.dispatchEvent(new CustomEvent('userSettingsUpdated'))
      
      // Reset MCP status after a brief delay
      setTimeout(() => setMcpUpdateStatus(null), 2000)
      
      onClose()
    } catch (error) {
      console.error('Failed to save settings:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const forceReconnectMCP = async () => {
    const effectiveApiKey = decryptedApiKey || settings.composioApiKey
    
    if (!effectiveApiKey) {
      setTestResult({ success: false, message: 'Please enter an API key first' })
      return
    }

    setIsLoading(true)
    setTestResult(null)

    try {
      const response = await fetch('/api/mcp/force-reconnect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          apiKey: effectiveApiKey,
          userId: settings.userId 
        })
      })

      const result = await response.json()
      
      if (response.ok && result.success) {
        setTestResult({
          success: true,
          message: `✅ MCP server reconnected! Status: ${result.serverStatus}, Tools: ${result.toolCount}`
        })
        
        // Refresh the page to reload tool palette
        setTimeout(() => {
          window.location.reload()
        }, 2000)
      } else {
        setTestResult({
          success: false,
          message: result.message || 'Failed to reconnect MCP server'
        })
      }
      
    } catch (error) {
      setTestResult({ success: false, message: 'Failed to reconnect MCP server' })
    } finally {
      setIsLoading(false)
    }
  }

  const testComposioConnection = async () => {
    const effectiveApiKey = decryptedApiKey || settings.composioApiKey
    
    if (!effectiveApiKey) {
      if (settings.encryptedComposioKey && !decryptedApiKey) {
        setTestResult({ success: false, message: 'Please enter your master password to decrypt the API key first' })
      } else {
        setTestResult({ success: false, message: 'Please enter an API key first' })
      }
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
          apiKey: effectiveApiKey,
          userId: settings.userId 
        })
      })

      const result = await response.json()
      
      // Log the complete API response for debugging
      console.log('🔍 FULL API RESPONSE:', JSON.stringify(result, null, 2))
      console.log('📱 Available Apps from API:', result.availableApps)
      console.log('🔗 Connected Accounts from API:', result.connectedAccounts)
      console.log('🐛 Debug Info:', result.debug)
      
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
      // Core apps - exact matches
      'github': { id: 'github_star_repo', name: 'GitHub Operations', icon: '🐙', category: 'Development' },
      'slack': { id: 'slack_send_message', name: 'Slack Messaging', icon: '💬', category: 'Communication' },
      'gmail': { id: 'gmail_send_email', name: 'Gmail Operations', icon: '📧', category: 'Communication' },
      'notion': { id: 'notion_create_page', name: 'Notion Pages', icon: '📝', category: 'Productivity' },
      'linear': { id: 'linear_create_issue', name: 'Linear Issues', icon: '📋', category: 'Productivity' },
      
      // Google apps - specific mappings
      'google': { id: 'gmail_send_email', name: 'Gmail Operations', icon: '📧', category: 'Communication' },
      'googledocs': { id: 'googledocs_create_doc', name: 'Google Docs', icon: '📄', category: 'Productivity' },
      'googlesheets': { id: 'googlesheets_create_sheet', name: 'Google Sheets', icon: '📊', category: 'Productivity' },
      'googledrive': { id: 'googledrive_upload', name: 'Google Drive', icon: '💾', category: 'Productivity' },
      'googlecalendar': { id: 'googlecalendar_create_event', name: 'Google Calendar', icon: '📅', category: 'Productivity' },
      
      // Microsoft apps
      'microsoft': { id: 'outlook_send_email', name: 'Outlook Operations', icon: '📮', category: 'Communication' },
      'outlook': { id: 'outlook_send_email', name: 'Outlook Operations', icon: '📮', category: 'Communication' },
      'teams': { id: 'teams_send_message', name: 'Microsoft Teams', icon: '👥', category: 'Communication' },
      'onedrive': { id: 'onedrive_upload', name: 'OneDrive', icon: '☁️', category: 'Productivity' },
      
      // Other productivity tools
      'trello': { id: 'trello_create_card', name: 'Trello Cards', icon: '📋', category: 'Productivity' },
      'asana': { id: 'asana_create_task', name: 'Asana Tasks', icon: '✅', category: 'Productivity' },
      'jira': { id: 'jira_create_issue', name: 'Jira Issues', icon: '🎯', category: 'Development' },
      'confluence': { id: 'confluence_create_page', name: 'Confluence Pages', icon: '📑', category: 'Productivity' },
      
      // Communication tools
      'discord': { id: 'discord_send_message', name: 'Discord Message', icon: '🎮', category: 'Communication' },
      'telegram': { id: 'telegram_send_message', name: 'Telegram Message', icon: '📱', category: 'Communication' },
      'whatsapp': { id: 'whatsapp_send_message', name: 'WhatsApp Message', icon: '💬', category: 'Communication' },
      
      // Development tools
      'gitlab': { id: 'gitlab_create_issue', name: 'GitLab Issues', icon: '🦊', category: 'Development' },
      'bitbucket': { id: 'bitbucket_create_issue', name: 'Bitbucket Issues', icon: '🪣', category: 'Development' },
      'jenkins': { id: 'jenkins_trigger_build', name: 'Jenkins Build', icon: '🔧', category: 'Development' },
      
      // CRM and business tools
      'hubspot': { id: 'hubspot_create_contact', name: 'HubSpot CRM', icon: '🎯', category: 'Business' },
      'salesforce': { id: 'salesforce_create_lead', name: 'Salesforce CRM', icon: '☁️', category: 'Business' },
      'airtable': { id: 'airtable_create_record', name: 'Airtable Records', icon: '🗃️', category: 'Productivity' },
      'zapier': { id: 'zapier_trigger_zap', name: 'Zapier Automation', icon: '⚡', category: 'Automation' }
    }
    
    const discoveredTools: any[] = []
    
    console.log(`🔍 Mapping ${availableApps.length} connected apps:`, availableApps)
    
    // Map available apps to tools
    availableApps.forEach(appName => {
      const normalizedName = appName.toLowerCase().replace(/[\s-_]/g, '')
      console.log(`📱 Processing app: "${appName}" -> "${normalizedName}"`)
      
      // Try exact match first
      if (toolMapping[normalizedName]) {
        console.log(`✅ Exact match found: ${normalizedName} -> ${toolMapping[normalizedName].name}`)
        discoveredTools.push(toolMapping[normalizedName])
        return
      }
      
      // Try partial matches (both directions)
      let matchFound = false
      Object.keys(toolMapping).forEach(key => {
        if (!matchFound && (normalizedName.includes(key) || key.includes(normalizedName))) {
          console.log(`🔍 Partial match found: ${normalizedName} contains/matches ${key} -> ${toolMapping[key].name}`)
          if (!discoveredTools.some(tool => tool.id === toolMapping[key].id)) {
            discoveredTools.push(toolMapping[key])
            matchFound = true
          }
        }
      })
      
      // If no match found, create a generic tool for this app
      if (!matchFound) {
        console.log(`❓ No mapping found for "${appName}", creating generic tool`)
        const genericTool = {
          id: `${normalizedName}_generic`,
          name: `${appName} Operations`,
          icon: '🔗',
          category: 'Generic'
        }
        discoveredTools.push(genericTool)
      }
    })
    
    // If no tools discovered, show all available tools as fallback
    if (discoveredTools.length === 0) {
      console.log('❌ No specific tools mapped, showing all available tools')
      return AVAILABLE_TOOLS
    }
    
    console.log(`✅ Discovered ${discoveredTools.length} tools from ${availableApps.length} connected apps:`)
    discoveredTools.forEach(tool => {
      console.log(`   - ${tool.name} (${tool.category})`)
    })
    
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

          {/* Encryption Status */}
          {encryptionSupported && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
              <div className="flex items-center space-x-2">
                <Lock className="w-4 h-4 text-green-600" />
                <span className="text-sm font-medium text-green-800">
                  🔐 Automatic Encryption Enabled
                </span>
              </div>
              <p className="text-xs text-green-700 mt-1">
                Your API keys are automatically encrypted using AES-256. No master password required!
              </p>
            </div>
          )}

          {/* Manual Master Password Entry for Custom Encrypted Keys */}
          {encryptionSupported && needsMasterPassword && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
              <label className="block text-sm font-medium text-amber-800 mb-2">
                <Lock className="w-4 h-4 inline mr-1" />
                Enter Custom Master Password
              </label>
              <p className="text-xs text-amber-700 mb-3">
                This key was encrypted with a custom master password. Enter it to decrypt.
              </p>
              <div className="flex space-x-2">
                <div className="flex-1 relative">
                  <input
                    type={showMasterPassword ? 'text' : 'password'}
                    value={masterPassword}
                    onChange={(e) => setMasterPassword(e.target.value)}
                    placeholder="Enter your custom master password..."
                    className="w-full px-3 py-2 border border-amber-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 pr-10"
                    onKeyPress={(e) => e.key === 'Enter' && handleMasterPasswordSubmit()}
                  />
                  <button
                    type="button"
                    onClick={() => setShowMasterPassword(!showMasterPassword)}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 text-amber-400 hover:text-amber-600"
                  >
                    {showMasterPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <button
                  onClick={handleMasterPasswordSubmit}
                  disabled={isLoading || !masterPassword}
                  className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                >
                  {isLoading ? 'Decrypting...' : 'Decrypt'}
                </button>
              </div>
            </div>
          )}

          {/* Optional: Custom Master Password for Enhanced Security */}
          {encryptionSupported && !settings.encryptedComposioKey && settings.composioApiKey && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <label className="block text-sm font-medium text-blue-800 mb-2">
                <Lock className="w-4 h-4 inline mr-1" />
                Optional: Custom Master Password
              </label>
              <p className="text-xs text-blue-700 mb-3">
                API keys are automatically encrypted. Optionally set a custom master password for enhanced security.
              </p>
              <div className="space-y-2">
                <div className="relative">
                  <input
                    type={showMasterPassword ? 'text' : 'password'}
                    value={masterPassword}
                    onChange={(e) => setMasterPassword(e.target.value)}
                    placeholder="Custom master password (optional)..."
                    className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowMasterPassword(!showMasterPassword)}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 text-blue-400 hover:text-blue-600"
                  >
                    {showMasterPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showMasterPassword ? 'text' : 'password'}
                    value={confirmMasterPassword}
                    onChange={(e) => setConfirmMasterPassword(e.target.value)}
                    placeholder="Confirm custom master password..."
                    className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                {masterPassword && confirmMasterPassword && masterPassword !== confirmMasterPassword && (
                  <p className="text-xs text-red-600">Passwords do not match</p>
                )}
                <p className="text-xs text-blue-600 mt-1">
                  Leave blank to use automatic encryption without a custom password
                </p>
              </div>
            </div>
          )}

          {/* Composio API Key */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Key className="w-4 h-4 inline mr-1" />
              Composio API Key
              {settings.encryptedComposioKey && (
                <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                  <Lock className="w-3 h-3 mr-1" />
                  Encrypted
                </span>
              )}
            </label>
            <div className="flex space-x-2">
              <div className="flex-1 relative">
                <input
                  type={showApiKey ? 'text' : 'password'}
                  value={settings.composioApiKey || ''}
                  onChange={(e) => setSettings(prev => ({ ...prev, composioApiKey: e.target.value }))}
                  placeholder={
                    settings.encryptedComposioKey 
                      ? "API key is encrypted and stored securely"
                      : "Enter your Composio API key..."
                  }
                  disabled={settings.encryptedComposioKey && !needsMasterPassword}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 pr-10 ${
                    settings.encryptedComposioKey && !needsMasterPassword
                      ? 'border-gray-200 bg-gray-50 text-gray-500' 
                      : 'border-gray-300'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={testComposioConnection}
                  disabled={isLoading || !settings.composioApiKey}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                >
                  {isLoading ? 'Testing...' : 'Test'}
                </button>
                <button
                  onClick={forceReconnectMCP}
                  disabled={isLoading || !settings.composioApiKey}
                  className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                  title="Force reconnect MCP server to detect tools"
                >
                  {isLoading ? 'Reconnecting...' : 'Force Reconnect'}
                </button>
              </div>
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

        {/* MCP Update Status */}
        {mcpUpdateStatus && (
          <div className="px-6 py-3 border-t border-gray-200 bg-blue-50">
            <div className="flex items-center gap-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600" />
              <span className="text-sm text-blue-700">{mcpUpdateStatus}</span>
            </div>
          </div>
        )}

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
            disabled={
              isLoading || 
              (encryptionSupported && 
               Boolean(settings.composioApiKey) && 
               !settings.encryptedComposioKey && 
               Boolean(masterPassword) && // Only require confirmation if user actually set a custom password
               (!confirmMasterPassword || masterPassword !== confirmMasterPassword))
            }
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>
                  {encryptionSupported && Boolean(settings.composioApiKey) && !settings.encryptedComposioKey 
                    ? (masterPassword ? 'Encrypting & Saving...' : 'Auto-Encrypting & Saving...') 
                    : 'Saving...'}
                </span>
              </>
            ) : (
              <>
                {encryptionSupported && Boolean(settings.composioApiKey) && !settings.encryptedComposioKey ? (
                  <>
                    <Lock className="w-4 h-4" />
                    <span>{masterPassword ? 'Encrypt & Save Settings' : 'Auto-Encrypt & Save Settings'}</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Save Settings</span>
                  </>
                )}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )

  return createPortal(modalContent, document.body)
} 