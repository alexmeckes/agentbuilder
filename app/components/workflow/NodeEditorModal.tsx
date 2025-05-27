'use client'

import { useState, useEffect } from 'react'
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
  Play
} from 'lucide-react'

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
  onClose: () => void
  nodeData: AgentNodeData
  nodeId: string
  onSave: (nodeId: string, updatedData: AgentNodeData) => void
}

const modelOptions = [
  { value: 'gpt-4o', label: 'GPT-4o (Latest)', description: 'Most capable model, best for complex tasks' },
  { value: 'gpt-4o-mini', label: 'GPT-4o Mini', description: 'Fast and efficient, good for most tasks' },
  { value: 'gpt-4-turbo', label: 'GPT-4 Turbo', description: 'High performance with large context' },
  { value: 'gpt-4', label: 'GPT-4', description: 'Reliable and capable for complex reasoning' },
  { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo', description: 'Fast and cost-effective' },
  { value: 'claude-3-5-sonnet-20241022', label: 'Claude 3.5 Sonnet', description: 'Excellent for analysis and writing' },
  { value: 'claude-3-haiku-20240307', label: 'Claude 3 Haiku', description: 'Fast and efficient for simple tasks' }
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

export default function NodeEditorModal({ isOpen, onClose, nodeData, nodeId, onSave }: NodeEditorModalProps) {
  const [formData, setFormData] = useState<AgentNodeData>(nodeData)
  const [errors, setErrors] = useState<string[]>([])
  const [hasChanges, setHasChanges] = useState(false)

  // Reset form when modal opens with new data
  useEffect(() => {
    if (isOpen) {
      setFormData(nodeData)
      setErrors([])
      setHasChanges(false)
    }
  }, [isOpen, nodeData])

  // Track changes
  useEffect(() => {
    const hasChanged = JSON.stringify(formData) !== JSON.stringify(nodeData)
    setHasChanges(hasChanged)
    
    // Validate on change
    const validationErrors = validateNodeData(formData)
    setErrors(validationErrors)
  }, [formData, nodeData])

  const handleInputChange = (field: keyof AgentNodeData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleSave = () => {
    const validationErrors = validateNodeData(formData)
    if (validationErrors.length > 0) {
      setErrors(validationErrors)
      return
    }
    
    console.log('Saving node data:', { nodeId, formData })
    onSave(nodeId, formData)
    onClose()
  }

  const handleReset = () => {
    setFormData(nodeData)
    setErrors([])
    setHasChanges(false)
  }

  const handleClose = () => {
    if (hasChanges) {
      if (confirm('You have unsaved changes. Are you sure you want to close?')) {
        onClose()
      }
    } else {
      onClose()
    }
  }

  if (!isOpen) return null

  const Icon = getNodeIcon(formData.type)
  const isValid = errors.length === 0

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-[100]">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${getNodeColor(formData.type)} flex items-center justify-center shadow-sm flex-shrink-0`}>
              <Icon className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-xl font-bold text-gray-900">Edit Node</h2>
              <div className="flex items-center gap-2 min-w-0">
                <p className="text-sm text-gray-500 capitalize">{formData.type} Node Configuration</p>
                {formData.name && (
                  <>
                    <span className="text-gray-300">•</span>
                    <span className="text-sm font-medium text-blue-600 truncate">{formData.name}</span>
                  </>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2 flex-shrink-0 ml-4">
            {/* Validation Status */}
            <div className="flex items-center gap-1">
              {isValid ? (
                <CheckCircle className="w-4 h-4 text-green-500" />
              ) : (
                <AlertCircle className="w-4 h-4 text-red-500" />
              )}
              <span className={`text-xs ${isValid ? 'text-green-600' : 'text-red-600'}`}>
                {isValid ? 'Valid' : `${errors.length} error${errors.length > 1 ? 's' : ''}`}
              </span>
            </div>
            
            <button
              onClick={handleClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Error Messages */}
          {errors.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="w-4 h-4 text-red-500" />
                <span className="text-sm font-medium text-red-800">Please fix the following issues:</span>
              </div>
              <ul className="text-sm text-red-700 space-y-1">
                {errors.map((error, index) => (
                  <li key={index} className="flex items-center gap-1">
                    <span className="w-1 h-1 bg-red-500 rounded-full"></span>
                    {error}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Basic Information</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Label <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.label}
                  onChange={(e) => handleInputChange('label', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter node label"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name || ''}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter node name"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                value={formData.description || ''}
                onChange={(e) => handleInputChange('description', e.target.value)}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Describe what this node does"
              />
            </div>
          </div>

          {/* Type-Specific Configuration */}
          {formData.type === 'agent' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Agent Configuration</h3>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Model <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.model_id || ''}
                  onChange={(e) => handleInputChange('model_id', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select a model</option>
                  {modelOptions.map(model => (
                    <option key={model.value} value={model.value}>
                      {model.label}
                    </option>
                  ))}
                </select>
                {formData.model_id && (
                  <p className="text-xs text-gray-500 mt-1">
                    {modelOptions.find(m => m.value === formData.model_id)?.description}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Instructions <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={formData.instructions || ''}
                  onChange={(e) => handleInputChange('instructions', e.target.value)}
                  rows={6}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter detailed instructions for this agent..."
                />
                <p className="text-xs text-gray-500 mt-1">
                  Be specific about what the agent should do, its role, and any constraints.
                </p>
              </div>
            </div>
          )}

          {formData.type === 'tool' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Tool Configuration</h3>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tool Type <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.tool_type || ''}
                  onChange={(e) => handleInputChange('tool_type', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select a tool type</option>
                  {toolOptions.map(tool => (
                    <option key={tool.value} value={tool.value}>
                      {tool.label}
                    </option>
                  ))}
                </select>
                {formData.tool_type && (
                  <p className="text-xs text-gray-500 mt-1">
                    {toolOptions.find(t => t.value === formData.tool_type)?.description}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 p-4 bg-gray-50 flex-shrink-0">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              {hasChanges && (
                <span className="text-xs text-amber-600 flex items-center gap-1">
                  <span className="w-2 h-2 bg-amber-400 rounded-full"></span>
                  Unsaved changes
                </span>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={handleReset}
                disabled={!hasChanges}
                className="flex items-center gap-1 px-3 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <RotateCcw className="w-3 h-3" />
                Reset
              </button>
              
              <button
                onClick={handleClose}
                className="px-3 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Cancel
              </button>
              
              <button
                onClick={handleSave}
                disabled={!isValid || !hasChanges}
                className="flex items-center gap-1 px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save className="w-3 h-3" />
                Save
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 