'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { 
  X, 
  Save, 
  RotateCcw, 
  Bot, 
  Wrench, 
  FileInput, 
  FileOutput,
  AlertCircle,
  CheckCircle,
  Eye,
  Play,
  Info,
  Zap,
  Settings,
  Cpu
} from 'lucide-react'
import { 
  AgentFramework, 
  AgentConfig, 
  EnhancedNodeData, 
  POPULAR_MODELS, 
  FRAMEWORK_INFO,
  getCompatibleFrameworks,
  getCompatibleModels,
  isModelFrameworkCompatible,
  ModelInfo,
  FrameworkInfo
} from '../../types/workflow'
import EnhancedToolSelector from './EnhancedToolSelector'

interface AgentNodeData {
  label: string
  type: 'agent' | 'tool' | 'input' | 'output'
  model_id?: string
  instructions?: string
  name?: string
  description?: string
  tool_type?: string
  zIndex?: number
  onNodeUpdate?: (nodeId: string, updatedData: AgentNodeData) => void
}

interface NodeEditorModalProps {
  isOpen: boolean
  nodeData: EnhancedNodeData | null
  onSave: (data: EnhancedNodeData) => void
  onClose: () => void
}

const modelOptions = [
  // Latest GPT-4.1 series (2025)
  { value: 'gpt-4.1', label: 'GPT-4.1 (Latest)', description: 'Latest GPT model with enhanced coding and instruction following' },
  { value: 'gpt-4.1-mini', label: 'GPT-4.1 Mini', description: 'Efficient GPT-4.1 variant for cost-effective applications' },
  { value: 'gpt-4.1-nano', label: 'GPT-4.1 Nano', description: 'Ultra-efficient GPT-4.1 for mobile and edge applications' },
  
  // o-series reasoning models
  { value: 'o4-mini', label: 'o4-mini (Latest Reasoning)', description: 'Latest reasoning model with enhanced problem-solving' },
  { value: 'o3', label: 'o3', description: 'Advanced reasoning model for complex problem-solving tasks' },
  { value: 'o3-mini', label: 'o3-mini', description: 'Efficient reasoning model for mathematical and logical tasks' },
  { value: 'o1', label: 'o1', description: 'Reasoning model with enhanced problem-solving for science and math' },
  { value: 'o1-mini', label: 'o1-mini', description: 'Faster, cost-efficient reasoning model ideal for coding tasks' },
  { value: 'o1-preview', label: 'o1-preview', description: 'Preview version of o1 reasoning model' },
  
  // GPT-4o series
  { value: 'gpt-4o-2024-11-20', label: 'GPT-4o (Nov 2024)', description: 'Latest GPT-4o with enhanced creative writing and accuracy' },
  { value: 'gpt-4o-2024-08-06', label: 'GPT-4o (Aug 2024)', description: 'GPT-4o with structured outputs and enhanced capabilities' },
  { value: 'gpt-4o', label: 'GPT-4o', description: 'Most capable model, best for complex tasks' },
  { value: 'gpt-4o-mini', label: 'GPT-4o Mini', description: 'Fast and efficient, good for most tasks' },
  
  // GPT-4 series
  { value: 'gpt-4-turbo', label: 'GPT-4 Turbo', description: 'High performance with large context window' },
  { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo', description: 'Fast and cost-effective for simple to moderate tasks' },
  
  // Non-OpenAI models
  { value: 'claude-3-5-sonnet-20241022', label: 'Claude 3.5 Sonnet', description: 'Excellent for analysis and writing' },
  { value: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro', description: 'Great for multimodal tasks and long context' },
  { value: 'llama-3.1-70b-instruct', label: 'Llama 3.1 70B', description: 'Open source model, good for general tasks' }
]

const toolOptions = [
  { value: 'web_search', label: 'Web Search', description: 'Search the internet for information' },
  { value: 'file_read', label: 'File Read', description: 'Read content from files' },
  { value: 'file_write', label: 'File Write', description: 'Write content to files' },
  { value: 'api_call', label: 'API Call', description: 'Make HTTP requests to external APIs' },
  { value: 'database_query', label: 'Database Query', description: 'Query databases for information' },
  { value: 'image_generation', label: 'Image Generation', description: 'Generate images using AI' }
]

const getNodeIcon = (type: string) => {
  switch (type) {
    case 'agent': return Bot
    case 'tool': return Wrench
    case 'input': return FileInput
    case 'output': return FileOutput
    default: return Bot
  }
}

const getNodeColor = (type: string) => {
  switch (type) {
    case 'agent': return 'from-blue-500 to-blue-600'
    case 'tool': return 'from-green-500 to-green-600'
    case 'input': return 'from-purple-500 to-purple-600'
    case 'output': return 'from-orange-500 to-orange-600'
    default: return 'from-gray-500 to-gray-600'
  }
}

const validateNodeData = (data: AgentNodeData) => {
  const errors: string[] = []
  
  if (!data.label.trim()) {
    errors.push('Label is required')
  }
  
  if (!data.name?.trim()) {
    errors.push('Name is required')
  }
  
  if (data.type === 'agent') {
    if (!data.model_id) {
      errors.push('Model selection is required for agent nodes')
    }
    if (!data.instructions?.trim()) {
      errors.push('Instructions are required for agent nodes')
    }
  }
  
  if (data.type === 'tool' && !data.tool_type) {
    errors.push('Tool type is required for tool nodes')
  }
  
  return errors
}

export function NodeEditorModal({ isOpen, nodeData, onSave, onClose }: NodeEditorModalProps) {
  const [formData, setFormData] = useState<EnhancedNodeData>({
    label: '',
    type: 'agent',
    name: '',
    description: '',
    instructions: '',
    framework: AgentFramework.OPENAI,
    agentConfig: {
      model_id: 'gpt-4o-mini',
      instructions: '',
      name: ''
    },
    modelOptions: {
      temperature: 0.7,
      max_tokens: 1000
    }
  })
  
  const [activeTab, setActiveTab] = useState<'basic' | 'model' | 'advanced'>('basic')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [isClient, setIsClient] = useState(false)

  // Ensure we're on the client side before rendering portal
  useEffect(() => {
    setIsClient(true)
    console.log('NodeEditorModal: Client side initialized')
  }, [])

  // Initialize form data when modal opens
  useEffect(() => {
    console.log('NodeEditorModal: isOpen changed to', isOpen, 'nodeData:', nodeData)
    if (isOpen && nodeData) {
      const defaultFramework = nodeData.framework || AgentFramework.OPENAI
      const defaultModelId = nodeData.agentConfig?.model_id || nodeData.model_id || 'gpt-4o-mini'
      
      // Prioritize saved data from agentConfig, then fallback to top-level properties
      const savedInstructions = nodeData.agentConfig?.instructions || nodeData.instructions || ''
      const savedName = nodeData.agentConfig?.name || nodeData.name || ''
      const savedDescription = nodeData.agentConfig?.description || nodeData.description || ''
      
      console.log('NodeEditorModal: Loading saved data -', {
        instructions: savedInstructions,
        name: savedName,
        description: savedDescription,
        agentConfig: nodeData.agentConfig
      })
      
      setFormData({
        ...nodeData,
        framework: defaultFramework,
        instructions: savedInstructions, // Ensure top-level instructions is set
        agentConfig: {
          model_id: defaultModelId,
          instructions: savedInstructions,
          name: savedName,
          description: savedDescription,
          ...nodeData.agentConfig
        },
        modelOptions: {
          temperature: 0.7,
          max_tokens: 1000,
          ...nodeData.modelOptions
        }
      })
      setHasUnsavedChanges(false)
      setErrors({})
      console.log('NodeEditorModal: Form data initialized with saved instructions:', savedInstructions)
    }
  }, [isOpen, nodeData])

  // Track changes (only after initial load)
  useEffect(() => {
    if (nodeData && isOpen) {
      // Small delay to avoid triggering on initial form data setup
      const timer = setTimeout(() => {
        setHasUnsavedChanges(true)
      }, 100)
      return () => clearTimeout(timer)
    }
  }, [formData, nodeData, isOpen])

  // Handle escape key to close modal
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      return () => document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen, onClose])

  // Get compatible models for selected framework
  const compatibleModels = getCompatibleModels(formData.framework || AgentFramework.OPENAI)
  
  // Get compatible frameworks for selected model
  const compatibleFrameworks = getCompatibleFrameworks(formData.agentConfig?.model_id || 'gpt-4o-mini')
  
  // Get current model info
  const currentModel = POPULAR_MODELS.find(m => m.id === formData.agentConfig?.model_id)
  const currentFramework = FRAMEWORK_INFO[formData.framework || AgentFramework.OPENAI]

  // Validation
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.label?.trim()) {
      newErrors.label = 'Label is required'
    }

    if (formData.type === 'agent') {
      if (!formData.agentConfig?.model_id) {
        newErrors.model_id = 'Model is required for agent nodes'
      }
      
      if (!formData.framework) {
        newErrors.framework = 'Framework is required for agent nodes'
      }
      
      // Check model/framework compatibility
      if (formData.agentConfig?.model_id && formData.framework) {
        if (!isModelFrameworkCompatible(formData.agentConfig.model_id, formData.framework)) {
          newErrors.compatibility = `${formData.agentConfig.model_id} is not compatible with ${formData.framework}`
        }
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSave = () => {
    if (validateForm()) {
      // Ensure agentConfig is properly structured for any-agent and data consistency
      const enhancedData: EnhancedNodeData = {
        ...formData,
        // Ensure top-level properties are synchronized with agentConfig
        instructions: formData.agentConfig?.instructions || formData.instructions,
        name: formData.agentConfig?.name || formData.name,
        description: formData.agentConfig?.description || formData.description,
        agentConfig: {
          ...formData.agentConfig!,
          model_args: formData.modelOptions
        }
      }
      
      console.log('NodeEditorModal: Saving enhanced data:', enhancedData)
      onSave(enhancedData)
      onClose()
    }
  }

  const handleModelChange = (modelId: string) => {
    const model = POPULAR_MODELS.find(m => m.id === modelId)
    if (model) {
      // Auto-select compatible framework if current one isn't compatible
      let newFramework = formData.framework
      if (!model.frameworks.includes(formData.framework!)) {
        newFramework = model.frameworks[0] // Use first compatible framework
      }
      
      setFormData(prev => ({
        ...prev,
        framework: newFramework,
        agentConfig: {
          ...prev.agentConfig!,
          model_id: modelId
        }
      }))
    }
  }

  const handleFrameworkChange = (framework: AgentFramework) => {
    const compatibleModels = getCompatibleModels(framework)
    let newModelId = formData.agentConfig?.model_id
    
    // Auto-select compatible model if current one isn't compatible
    if (newModelId && !compatibleModels.find(m => m.id === newModelId)) {
      newModelId = compatibleModels[0]?.id || 'gpt-4o-mini'
    }
    
    setFormData(prev => ({
      ...prev,
      framework,
      agentConfig: {
        ...prev.agentConfig!,
        model_id: newModelId!
      }
    }))
  }

  if (!isOpen || !isClient) return null

  console.log('NodeEditorModal: Rendering modal, isOpen:', isOpen, 'isClient:', isClient)

  const modalContent = (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center modal-overlay p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose()
        }
      }}
    >
      <div 
        className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden modal-content"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
              {formData.type === 'agent' && <Cpu className="w-4 h-4 text-blue-600" />}
              {formData.type === 'tool' && <Wrench className="w-4 h-4 text-green-600" />}
              {formData.type === 'input' && <Settings className="w-4 h-4 text-purple-600" />}
              {formData.type === 'output' && <Zap className="w-4 h-4 text-orange-600" />}
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                Edit {formData.type} Node
              </h2>
              <p className="text-sm text-gray-600">Configure node settings and AI model</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            {[
              { id: 'basic', label: 'Basic Info', icon: Settings },
              { id: 'model', label: 'AI Enhancement', icon: Cpu },
              { id: 'advanced', label: 'Advanced', icon: Zap }
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id as any)}
                className={`py-3 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                  activeTab === id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {/* Basic Info Tab */}
          {activeTab === 'basic' && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Node Label *
                </label>
                <input
                  type="text"
                  value={formData.label || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, label: e.target.value }))}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    errors.label ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="Enter a descriptive label for this node"
                />
                {errors.label && (
                  <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    {errors.label}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={formData.description || ''}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    description: e.target.value,
                    agentConfig: { ...prev.agentConfig!, description: e.target.value }
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  rows={3}
                  placeholder="Describe what this node does"
                />
              </div>

              {formData.type === 'agent' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Instructions
                  </label>
                  <textarea
                    value={formData.agentConfig?.instructions || ''}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev,
                      instructions: e.target.value,
                      agentConfig: { ...prev.agentConfig!, instructions: e.target.value }
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    rows={4}
                    placeholder="Enter the system prompt/instructions for this agent"
                  />
                  <p className="mt-1 text-sm text-gray-500">
                    This will be used as the system prompt for the AI agent
                  </p>
                </div>
              )}

              {formData.type === 'tool' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tool Type *
                  </label>
                  <EnhancedToolSelector
                    value={formData.tool_type || ''}
                    onChange={(toolId) => setFormData(prev => ({ 
                      ...prev, 
                      tool_type: toolId 
                    }))}
                    className="w-full"
                    nodeData={{
                      name: formData.name || formData.label,
                      instructions: formData.instructions,
                      type: formData.type
                    }}
                  />
                  <p className="mt-1 text-sm text-gray-500">
                    Select the type of tool this node will use. You can enhance it with AI capabilities in the AI Enhancement tab.
                  </p>
                  {errors.tool_type && (
                    <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                      <AlertCircle className="w-4 h-4" />
                      {errors.tool_type}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* AI Enhancement Tab */}
          {activeTab === 'model' && (
            <div className="space-y-6">
              {/* Agent Node Configuration */}
              {formData.type === 'agent' && (
                <>
                  {/* Framework Selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      AI Framework *
                    </label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {Object.values(FRAMEWORK_INFO).map((framework) => (
                        <div
                          key={framework.id}
                          onClick={() => handleFrameworkChange(framework.id)}
                          className={`p-4 border rounded-lg cursor-pointer transition-all ${
                            formData.framework === framework.id
                              ? 'border-blue-500 bg-blue-50'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <h3 className="font-medium text-gray-900">{framework.name}</h3>
                            {formData.framework === framework.id && (
                              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                            )}
                          </div>
                          <p className="text-sm text-gray-600 mb-2">{framework.description}</p>
                          <div className="flex flex-wrap gap-1">
                            {framework.features.slice(0, 3).map((feature) => (
                              <span
                                key={feature}
                                className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded"
                              >
                                {feature}
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                    {errors.framework && (
                      <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                        <AlertCircle className="w-4 h-4" />
                        {errors.framework}
                      </p>
                    )}
                  </div>

                  {/* Model Selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      AI Model *
                    </label>
                    <div className="space-y-3">
                      {compatibleModels.map((model) => (
                        <div
                          key={model.id}
                          onClick={() => handleModelChange(model.id)}
                          className={`p-4 border rounded-lg cursor-pointer transition-all ${
                            formData.agentConfig?.model_id === model.id
                              ? 'border-blue-500 bg-blue-50'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-3">
                              <h3 className="font-medium text-gray-900">{model.name}</h3>
                              <span className="text-sm text-gray-500">({model.provider})</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-green-600">
                                ${model.cost_per_1k_tokens.toFixed(4)}/1K tokens
                              </span>
                              {formData.agentConfig?.model_id === model.id && (
                                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                              )}
                            </div>
                          </div>
                          <p className="text-sm text-gray-600 mb-2">{model.description}</p>
                          <div className="flex items-center gap-4 text-xs text-gray-500">
                            <span>Max tokens: {model.max_tokens.toLocaleString()}</span>
                            {model.supports_tools && <span>✓ Tools</span>}
                            {model.supports_vision && <span>✓ Vision</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                    {errors.model_id && (
                      <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                        <AlertCircle className="w-4 h-4" />
                        {errors.model_id}
                      </p>
                    )}
                    {errors.compatibility && (
                      <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                        <AlertCircle className="w-4 h-4" />
                        {errors.compatibility}
                      </p>
                    )}
                  </div>

                  {/* Current Selection Summary */}
                  {currentModel && currentFramework && (
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h4 className="font-medium text-gray-900 mb-2">Current Configuration</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Framework:</span>
                          <span className="font-medium">{currentFramework.name}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Model:</span>
                          <span className="font-medium">{currentModel.name}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Estimated cost:</span>
                          <span className="font-medium text-green-600">
                            ${currentModel.cost_per_1k_tokens.toFixed(4)}/1K tokens
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Tool Node AI Enhancement */}
              {formData.type === 'tool' && (
                <div className="space-y-6">
                  <div className="bg-green-50 p-4 rounded-lg">
                    <h3 className="text-lg font-medium text-green-900 mb-2">🔧 Tool AI Enhancement</h3>
                    <p className="text-sm text-green-700">
                      Add AI capabilities to your tool for smarter query processing and result summarization.
                    </p>
                  </div>

                  {/* Pre-processing AI */}
                  <div className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium text-gray-900">Query Pre-processing</h4>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.toolAI?.preProcessing?.enabled || false}
                          onChange={(e) => setFormData(prev => ({
                            ...prev,
                            toolAI: {
                              ...prev.toolAI,
                              preProcessing: {
                                ...prev.toolAI?.preProcessing,
                                enabled: e.target.checked,
                                model_id: prev.toolAI?.preProcessing?.model_id || 'gpt-4o-mini',
                                instructions: prev.toolAI?.preProcessing?.instructions || 'Optimize and enhance the user query for better tool results.'
                              }
                            }
                          }))}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>
                    <p className="text-sm text-gray-600 mb-3">
                      Use AI to optimize queries before sending them to the tool
                    </p>
                    
                    {formData.toolAI?.preProcessing?.enabled && (
                      <div className="space-y-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Model</label>
                          <select
                            value={formData.toolAI?.preProcessing?.model_id || 'gpt-4o-mini'}
                            onChange={(e) => setFormData(prev => ({
                              ...prev,
                              toolAI: {
                                ...prev.toolAI,
                                preProcessing: {
                                  ...prev.toolAI?.preProcessing!,
                                  model_id: e.target.value
                                }
                              }
                            }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          >
                            {POPULAR_MODELS.map(model => (
                              <option key={model.id} value={model.id}>
                                {model.name} - ${(model.cost_per_1k_tokens * 1000).toFixed(3)}/1K tokens
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Instructions</label>
                          <textarea
                            value={formData.toolAI?.preProcessing?.instructions || ''}
                            onChange={(e) => setFormData(prev => ({
                              ...prev,
                              toolAI: {
                                ...prev.toolAI,
                                preProcessing: {
                                  ...prev.toolAI?.preProcessing!,
                                  instructions: e.target.value
                                }
                              }
                            }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            rows={2}
                            placeholder="Optimize and enhance the user query for better tool results."
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Post-processing AI */}
                  <div className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium text-gray-900">Result Post-processing</h4>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.toolAI?.postProcessing?.enabled || false}
                          onChange={(e) => setFormData(prev => ({
                            ...prev,
                            toolAI: {
                              ...prev.toolAI,
                              postProcessing: {
                                ...prev.toolAI?.postProcessing,
                                enabled: e.target.checked,
                                model_id: prev.toolAI?.postProcessing?.model_id || 'gpt-4o-mini',
                                instructions: prev.toolAI?.postProcessing?.instructions || 'Summarize and extract the most relevant information from the tool results.'
                              }
                            }
                          }))}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>
                    <p className="text-sm text-gray-600 mb-3">
                      Use AI to summarize and filter tool results
                    </p>
                    
                    {formData.toolAI?.postProcessing?.enabled && (
                      <div className="space-y-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Model</label>
                          <select
                            value={formData.toolAI?.postProcessing?.model_id || 'gpt-4o-mini'}
                            onChange={(e) => setFormData(prev => ({
                              ...prev,
                              toolAI: {
                                ...prev.toolAI,
                                postProcessing: {
                                  ...prev.toolAI?.postProcessing!,
                                  model_id: e.target.value
                                }
                              }
                            }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          >
                            {POPULAR_MODELS.map(model => (
                              <option key={model.id} value={model.id}>
                                {model.name} - ${(model.cost_per_1k_tokens * 1000).toFixed(3)}/1K tokens
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Instructions</label>
                          <textarea
                            value={formData.toolAI?.postProcessing?.instructions || ''}
                            onChange={(e) => setFormData(prev => ({
                              ...prev,
                              toolAI: {
                                ...prev.toolAI,
                                postProcessing: {
                                  ...prev.toolAI?.postProcessing!,
                                  instructions: e.target.value
                                }
                              }
                            }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            rows={2}
                            placeholder="Summarize and extract the most relevant information from the tool results."
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Input Node AI Enhancement */}
              {formData.type === 'input' && (
                <div className="space-y-6">
                  <div className="bg-purple-50 p-4 rounded-lg">
                    <h3 className="text-lg font-medium text-purple-900 mb-2">📥 Input AI Enhancement</h3>
                    <p className="text-sm text-purple-700">
                      Add AI capabilities to validate, clean, and extract information from input data.
                    </p>
                  </div>

                  {/* Input Validation */}
                  <div className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium text-gray-900">Input Validation</h4>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.inputAI?.validation?.enabled || false}
                          onChange={(e) => setFormData(prev => ({
                            ...prev,
                            inputAI: {
                              ...prev.inputAI,
                              validation: {
                                ...prev.inputAI?.validation,
                                enabled: e.target.checked,
                                model_id: prev.inputAI?.validation?.model_id || 'gpt-4o-mini',
                                instructions: prev.inputAI?.validation?.instructions || 'Validate and clean the input data. Check for completeness, format, and quality.'
                              }
                            }
                          }))}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>
                    <p className="text-sm text-gray-600 mb-3">
                      Use AI to validate and clean input data
                    </p>
                    
                    {formData.inputAI?.validation?.enabled && (
                      <div className="space-y-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Model</label>
                          <select
                            value={formData.inputAI?.validation?.model_id || 'gpt-4o-mini'}
                            onChange={(e) => setFormData(prev => ({
                              ...prev,
                              inputAI: {
                                ...prev.inputAI,
                                validation: {
                                  ...prev.inputAI?.validation!,
                                  model_id: e.target.value
                                }
                              }
                            }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          >
                            {POPULAR_MODELS.map(model => (
                              <option key={model.id} value={model.id}>
                                {model.name} - ${(model.cost_per_1k_tokens * 1000).toFixed(3)}/1K tokens
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Instructions</label>
                          <textarea
                            value={formData.inputAI?.validation?.instructions || ''}
                            onChange={(e) => setFormData(prev => ({
                              ...prev,
                              inputAI: {
                                ...prev.inputAI,
                                validation: {
                                  ...prev.inputAI?.validation!,
                                  instructions: e.target.value
                                }
                              }
                            }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            rows={2}
                            placeholder="Validate and clean the input data. Check for completeness, format, and quality."
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Content Extraction */}
                  <div className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium text-gray-900">Content Extraction</h4>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.inputAI?.extraction?.enabled || false}
                          onChange={(e) => setFormData(prev => ({
                            ...prev,
                            inputAI: {
                              ...prev.inputAI,
                              extraction: {
                                ...prev.inputAI?.extraction,
                                enabled: e.target.checked,
                                model_id: prev.inputAI?.extraction?.model_id || 'gpt-4o-mini',
                                instructions: prev.inputAI?.extraction?.instructions || 'Extract key information and structure the data for downstream processing.'
                              }
                            }
                          }))}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>
                    <p className="text-sm text-gray-600 mb-3">
                      Use AI to extract structured information from input
                    </p>
                    
                    {formData.inputAI?.extraction?.enabled && (
                      <div className="space-y-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Model</label>
                          <select
                            value={formData.inputAI?.extraction?.model_id || 'gpt-4o-mini'}
                            onChange={(e) => setFormData(prev => ({
                              ...prev,
                              inputAI: {
                                ...prev.inputAI,
                                extraction: {
                                  ...prev.inputAI?.extraction!,
                                  model_id: e.target.value
                                }
                              }
                            }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          >
                            {POPULAR_MODELS.map(model => (
                              <option key={model.id} value={model.id}>
                                {model.name} - ${(model.cost_per_1k_tokens * 1000).toFixed(3)}/1K tokens
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Instructions</label>
                          <textarea
                            value={formData.inputAI?.extraction?.instructions || ''}
                            onChange={(e) => setFormData(prev => ({
                              ...prev,
                              inputAI: {
                                ...prev.inputAI,
                                extraction: {
                                  ...prev.inputAI?.extraction!,
                                  instructions: e.target.value
                                }
                              }
                            }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            rows={2}
                            placeholder="Extract key information and structure the data for downstream processing."
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Output Node AI Enhancement */}
              {formData.type === 'output' && (
                <div className="space-y-6">
                  <div className="bg-orange-50 p-4 rounded-lg">
                    <h3 className="text-lg font-medium text-orange-900 mb-2">📤 Output AI Enhancement</h3>
                    <p className="text-sm text-orange-700">
                      Add AI capabilities to format, summarize, and present output data beautifully.
                    </p>
                  </div>

                  {/* Output Formatting */}
                  <div className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium text-gray-900">Smart Formatting</h4>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.outputAI?.formatting?.enabled || false}
                          onChange={(e) => setFormData(prev => ({
                            ...prev,
                            outputAI: {
                              ...prev.outputAI,
                              formatting: {
                                ...prev.outputAI?.formatting,
                                enabled: e.target.checked,
                                model_id: prev.outputAI?.formatting?.model_id || 'gpt-4o-mini',
                                instructions: prev.outputAI?.formatting?.instructions || 'Format the output data in a clear, professional, and user-friendly way.'
                              }
                            }
                          }))}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>
                    <p className="text-sm text-gray-600 mb-3">
                      Use AI to format output data professionally
                    </p>
                    
                    {formData.outputAI?.formatting?.enabled && (
                      <div className="space-y-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Model</label>
                          <select
                            value={formData.outputAI?.formatting?.model_id || 'gpt-4o-mini'}
                            onChange={(e) => setFormData(prev => ({
                              ...prev,
                              outputAI: {
                                ...prev.outputAI,
                                formatting: {
                                  ...prev.outputAI?.formatting!,
                                  model_id: e.target.value
                                }
                              }
                            }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          >
                            {POPULAR_MODELS.map(model => (
                              <option key={model.id} value={model.id}>
                                {model.name} - ${(model.cost_per_1k_tokens * 1000).toFixed(3)}/1K tokens
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Instructions</label>
                          <textarea
                            value={formData.outputAI?.formatting?.instructions || ''}
                            onChange={(e) => setFormData(prev => ({
                              ...prev,
                              outputAI: {
                                ...prev.outputAI,
                                formatting: {
                                  ...prev.outputAI?.formatting!,
                                  instructions: e.target.value
                                }
                              }
                            }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            rows={2}
                            placeholder="Format the output data in a clear, professional, and user-friendly way."
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Output Summarization */}
                  <div className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium text-gray-900">Content Summarization</h4>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.outputAI?.summarization?.enabled || false}
                          onChange={(e) => setFormData(prev => ({
                            ...prev,
                            outputAI: {
                              ...prev.outputAI,
                              summarization: {
                                ...prev.outputAI?.summarization,
                                enabled: e.target.checked,
                                model_id: prev.outputAI?.summarization?.model_id || 'gpt-4o-mini',
                                instructions: prev.outputAI?.summarization?.instructions || 'Create a concise summary highlighting the key points and insights.'
                              }
                            }
                          }))}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>
                    <p className="text-sm text-gray-600 mb-3">
                      Use AI to create summaries of output content
                    </p>
                    
                    {formData.outputAI?.summarization?.enabled && (
                      <div className="space-y-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Model</label>
                          <select
                            value={formData.outputAI?.summarization?.model_id || 'gpt-4o-mini'}
                            onChange={(e) => setFormData(prev => ({
                              ...prev,
                              outputAI: {
                                ...prev.outputAI,
                                summarization: {
                                  ...prev.outputAI?.summarization!,
                                  model_id: e.target.value
                                }
                              }
                            }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          >
                            {POPULAR_MODELS.map(model => (
                              <option key={model.id} value={model.id}>
                                {model.name} - ${(model.cost_per_1k_tokens * 1000).toFixed(3)}/1K tokens
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Instructions</label>
                          <textarea
                            value={formData.outputAI?.summarization?.instructions || ''}
                            onChange={(e) => setFormData(prev => ({
                              ...prev,
                              outputAI: {
                                ...prev.outputAI,
                                summarization: {
                                  ...prev.outputAI?.summarization!,
                                  instructions: e.target.value
                                }
                              }
                            }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            rows={2}
                            placeholder="Create a concise summary highlighting the key points and insights."
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Advanced Tab */}
          {activeTab === 'advanced' && (
            <div className="space-y-6">
              {/* Model Parameters - Available for all node types with AI enhancement */}
              {(formData.type === 'agent' || 
                formData.toolAI?.preProcessing?.enabled || formData.toolAI?.postProcessing?.enabled ||
                formData.inputAI?.validation?.enabled || formData.inputAI?.extraction?.enabled ||
                formData.outputAI?.formatting?.enabled || formData.outputAI?.summarization?.enabled) && (
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Model Parameters</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Temperature
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="2"
                        step="0.1"
                        value={formData.modelOptions?.temperature || 0.7}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          modelOptions: {
                            ...prev.modelOptions,
                            temperature: parseFloat(e.target.value)
                          }
                        }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                      <p className="mt-1 text-xs text-gray-500">
                        Controls randomness (0 = deterministic, 2 = very random)
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Max Tokens
                      </label>
                      <input
                        type="number"
                        min="1"
                        max={currentModel?.max_tokens || 4000}
                        value={formData.modelOptions?.max_tokens || 1000}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          modelOptions: {
                            ...prev.modelOptions,
                            max_tokens: parseInt(e.target.value)
                          }
                        }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                      <p className="mt-1 text-xs text-gray-500">
                        Maximum tokens in the response
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Agent-specific Framework Settings */}
              {formData.type === 'agent' && currentFramework && (
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Framework Settings</h3>
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <div className="flex items-start gap-3">
                      <Info className="w-5 h-5 text-blue-600 mt-0.5" />
                      <div>
                        <h4 className="font-medium text-blue-900">
                          {currentFramework.name} Configuration
                        </h4>
                        <p className="text-sm text-blue-700 mt-1">
                          {currentFramework.description}
                        </p>
                        <div className="mt-2">
                          <p className="text-sm font-medium text-blue-900">Features:</p>
                          <ul className="text-sm text-blue-700 mt-1">
                            {currentFramework.features.map((feature) => (
                              <li key={feature}>• {feature}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Tool-specific Advanced Settings */}
              {formData.type === 'tool' && (
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Tool Configuration</h3>
                  <div className="bg-green-50 p-4 rounded-lg">
                    <div className="flex items-start gap-3">
                      <Info className="w-5 h-5 text-green-600 mt-0.5" />
                      <div>
                        <h4 className="font-medium text-green-900">Tool Type: {formData.tool_type || 'Not specified'}</h4>
                        <p className="text-sm text-green-700 mt-1">
                          Configure how this tool processes data and interacts with external services.
                        </p>
                        <div className="mt-3 space-y-2">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-green-900">AI Pre-processing:</span>
                            <span className={`text-sm ${formData.toolAI?.preProcessing?.enabled ? 'text-green-700' : 'text-gray-500'}`}>
                              {formData.toolAI?.preProcessing?.enabled ? 'Enabled' : 'Disabled'}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-green-900">AI Post-processing:</span>
                            <span className={`text-sm ${formData.toolAI?.postProcessing?.enabled ? 'text-green-700' : 'text-gray-500'}`}>
                              {formData.toolAI?.postProcessing?.enabled ? 'Enabled' : 'Disabled'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Input-specific Advanced Settings */}
              {formData.type === 'input' && (
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Input Processing</h3>
                  <div className="bg-purple-50 p-4 rounded-lg">
                    <div className="flex items-start gap-3">
                      <Info className="w-5 h-5 text-purple-600 mt-0.5" />
                      <div>
                        <h4 className="font-medium text-purple-900">Input Node Configuration</h4>
                        <p className="text-sm text-purple-700 mt-1">
                          Configure how this input node processes and validates incoming data.
                        </p>
                        <div className="mt-3 space-y-2">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-purple-900">AI Validation:</span>
                            <span className={`text-sm ${formData.inputAI?.validation?.enabled ? 'text-purple-700' : 'text-gray-500'}`}>
                              {formData.inputAI?.validation?.enabled ? 'Enabled' : 'Disabled'}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-purple-900">AI Extraction:</span>
                            <span className={`text-sm ${formData.inputAI?.extraction?.enabled ? 'text-purple-700' : 'text-gray-500'}`}>
                              {formData.inputAI?.extraction?.enabled ? 'Enabled' : 'Disabled'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Output-specific Advanced Settings */}
              {formData.type === 'output' && (
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Output Processing</h3>
                  <div className="bg-orange-50 p-4 rounded-lg">
                    <div className="flex items-start gap-3">
                      <Info className="w-5 h-5 text-orange-600 mt-0.5" />
                      <div>
                        <h4 className="font-medium text-orange-900">Output Node Configuration</h4>
                        <p className="text-sm text-orange-700 mt-1">
                          Configure how this output node formats and presents final results.
                        </p>
                        <div className="mt-3 space-y-2">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-orange-900">AI Formatting:</span>
                            <span className={`text-sm ${formData.outputAI?.formatting?.enabled ? 'text-orange-700' : 'text-gray-500'}`}>
                              {formData.outputAI?.formatting?.enabled ? 'Enabled' : 'Disabled'}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-orange-900">AI Summarization:</span>
                            <span className={`text-sm ${formData.outputAI?.summarization?.enabled ? 'text-orange-700' : 'text-gray-500'}`}>
                              {formData.outputAI?.summarization?.enabled ? 'Enabled' : 'Disabled'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Cost Estimation */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Cost Estimation</h3>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Estimated Costs</h4>
                      <div className="space-y-1 text-sm">
                        {formData.type === 'agent' && currentModel && (
                          <div className="flex justify-between">
                            <span className="text-gray-600">Agent Model:</span>
                            <span className="font-medium text-green-600">
                              ${currentModel.cost_per_1k_tokens.toFixed(4)}/1K tokens
                            </span>
                          </div>
                        )}
                        {formData.toolAI?.preProcessing?.enabled && (
                          <div className="flex justify-between">
                            <span className="text-gray-600">Tool Pre-processing:</span>
                            <span className="font-medium text-green-600">
                              ${(POPULAR_MODELS.find(m => m.id === formData.toolAI?.preProcessing?.model_id)?.cost_per_1k_tokens || 0.00015).toFixed(4)}/1K tokens
                            </span>
                          </div>
                        )}
                        {formData.toolAI?.postProcessing?.enabled && (
                          <div className="flex justify-between">
                            <span className="text-gray-600">Tool Post-processing:</span>
                            <span className="font-medium text-green-600">
                              ${(POPULAR_MODELS.find(m => m.id === formData.toolAI?.postProcessing?.model_id)?.cost_per_1k_tokens || 0.00015).toFixed(4)}/1K tokens
                            </span>
                          </div>
                        )}
                        {formData.inputAI?.validation?.enabled && (
                          <div className="flex justify-between">
                            <span className="text-gray-600">Input Validation:</span>
                            <span className="font-medium text-green-600">
                              ${(POPULAR_MODELS.find(m => m.id === formData.inputAI?.validation?.model_id)?.cost_per_1k_tokens || 0.00015).toFixed(4)}/1K tokens
                            </span>
                          </div>
                        )}
                        {formData.inputAI?.extraction?.enabled && (
                          <div className="flex justify-between">
                            <span className="text-gray-600">Input Extraction:</span>
                            <span className="font-medium text-green-600">
                              ${(POPULAR_MODELS.find(m => m.id === formData.inputAI?.extraction?.model_id)?.cost_per_1k_tokens || 0.00015).toFixed(4)}/1K tokens
                            </span>
                          </div>
                        )}
                        {formData.outputAI?.formatting?.enabled && (
                          <div className="flex justify-between">
                            <span className="text-gray-600">Output Formatting:</span>
                            <span className="font-medium text-green-600">
                              ${(POPULAR_MODELS.find(m => m.id === formData.outputAI?.formatting?.model_id)?.cost_per_1k_tokens || 0.00015).toFixed(4)}/1K tokens
                            </span>
                          </div>
                        )}
                        {formData.outputAI?.summarization?.enabled && (
                          <div className="flex justify-between">
                            <span className="text-gray-600">Output Summarization:</span>
                            <span className="font-medium text-green-600">
                              ${(POPULAR_MODELS.find(m => m.id === formData.outputAI?.summarization?.model_id)?.cost_per_1k_tokens || 0.00015).toFixed(4)}/1K tokens
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Performance Tips</h4>
                      <ul className="text-sm text-gray-600 space-y-1">
                        <li>• Use GPT-4o Mini for cost-effective processing</li>
                        <li>• Enable AI features only when needed</li>
                        <li>• Lower temperature for consistent results</li>
                        <li>• Set appropriate max tokens to control costs</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            {hasUnsavedChanges && (
              <>
                <div className="w-2 h-2 bg-orange-400 rounded-full"></div>
                <span>Unsaved changes</span>
              </>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  )

  return createPortal(modalContent, document.body)
} 