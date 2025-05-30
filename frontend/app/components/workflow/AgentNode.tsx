'use client'

import { Handle, Position, NodeProps } from 'reactflow'
import { useState, useRef, useEffect } from 'react'
import { 
  Bot, 
  Settings, 
  Eye, 
  EyeOff, 
  AlertCircle, 
  CheckCircle, 
  Wrench,
  FileInput,
  FileOutput,
  ChevronDown,
  ChevronRight,
  Edit3,
  Save,
  X,
  Cpu,
  Zap
} from 'lucide-react'
import { NodeEditorModal } from './NodeEditorModal'
import { EnhancedNodeData, AgentFramework, POPULAR_MODELS, FRAMEWORK_INFO } from '../../types/workflow'

interface AgentNodeProps {
  data: EnhancedNodeData
  selected?: boolean
  id: string
  onNodeUpdate?: (nodeId: string, updatedData: EnhancedNodeData) => void
}

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

const getNodeBorderColor = (type: string) => {
  switch (type) {
    case 'agent': return 'border-blue-200 hover:border-blue-300'
    case 'tool': return 'border-green-200 hover:border-green-300'
    case 'input': return 'border-purple-200 hover:border-purple-300'
    case 'output': return 'border-orange-200 hover:border-orange-300'
    default: return 'border-gray-200 hover:border-gray-300'
  }
}

const getValidationStatus = (data: EnhancedNodeData) => {
  if (data.type === 'agent') {
    if (!data.agentConfig?.model_id && !data.model_id) {
      return { status: 'warning', message: 'Missing model configuration' }
    }
    if (!data.agentConfig?.instructions && !data.instructions) {
      return { status: 'warning', message: 'Missing instructions' }
    }
    if (!data.framework) {
      return { status: 'warning', message: 'Missing framework selection' }
    }
  }
  if (data.type === 'tool') {
    if (!data.tool_type) {
      return { status: 'warning', message: 'Tool type not specified' }
    }
  }
  return { status: 'valid', message: 'Node configured correctly' }
}

const getAIEnhancementStatus = (data: EnhancedNodeData) => {
  const enhancements = []
  
  if (data.type === 'agent') {
    if (data.agentConfig?.model_id || data.model_id) {
      enhancements.push('Agent AI')
    }
  }
  
  if (data.type === 'tool') {
    if (data.toolAI?.preProcessing?.enabled) {
      enhancements.push('Pre-processing')
    }
    if (data.toolAI?.postProcessing?.enabled) {
      enhancements.push('Post-processing')
    }
  }
  
  if (data.type === 'input') {
    if (data.inputAI?.validation?.enabled) {
      enhancements.push('Validation')
    }
    if (data.inputAI?.extraction?.enabled) {
      enhancements.push('Extraction')
    }
  }
  
  if (data.type === 'output') {
    if (data.outputAI?.formatting?.enabled) {
      enhancements.push('Formatting')
    }
    if (data.outputAI?.summarization?.enabled) {
      enhancements.push('Summarization')
    }
  }
  
  return enhancements
}

// Legacy model options for backward compatibility
const modelOptions = [
  'gpt-4.1',
  'gpt-4.1-mini',
  'gpt-4.1-nano',
  'o4-mini',
  'o3',
  'o3-mini',
  'o1',
  'o1-mini',
  'o1-preview',
  'gpt-4o-2024-11-20',
  'gpt-4o-2024-08-06',
  'gpt-4o',
  'gpt-4o-mini', 
  'gpt-4-turbo',
  'gpt-3.5-turbo',
  'claude-3-5-sonnet-20241022',
  'gemini-1.5-pro',
  'llama-3.1-70b-instruct'
]

const toolOptions = [
  'web_search',
  'file_read',
  'file_write',
  'api_call',
  'database_query',
  'image_generation'
]

function AgentNodeComponent({ data, selected, id, onNodeUpdate }: AgentNodeProps) {
  const [expanded, setExpanded] = useState(false)
  const [showInstructions, setShowInstructions] = useState(false)
  const [editingLabel, setEditingLabel] = useState(false)
  const [editingModel, setEditingModel] = useState(false)
  const [editingTool, setEditingTool] = useState(false)
  const [tempLabel, setTempLabel] = useState(data.label)
  const [tempModel, setTempModel] = useState(data.agentConfig?.model_id || data.model_id || '')
  const [tempTool, setTempTool] = useState(data.tool_type || '')
  const [showModal, setShowModal] = useState(false)
  
  const labelInputRef = useRef<HTMLInputElement>(null)
  const modelSelectRef = useRef<HTMLSelectElement>(null)
  const toolSelectRef = useRef<HTMLSelectElement>(null)
  
  const Icon = getNodeIcon(data.type)
  const validation = getValidationStatus(data)
  const aiEnhancements = getAIEnhancementStatus(data)
  
  // Get current model and framework info
  const currentModelId = data.agentConfig?.model_id || data.model_id
  const currentModel = POPULAR_MODELS.find(m => m.id === currentModelId)
  const currentFramework = data.framework ? FRAMEWORK_INFO[data.framework] : null
  
  const truncateText = (text: string, maxLength: number) => {
    if (text.length <= maxLength) return text
    return text.substring(0, maxLength) + '...'
  }

  // Focus input when editing starts
  useEffect(() => {
    if (editingLabel && labelInputRef.current) {
      labelInputRef.current.focus()
      labelInputRef.current.select()
    }
  }, [editingLabel])

  useEffect(() => {
    if (editingModel && modelSelectRef.current) {
      modelSelectRef.current.focus()
    }
  }, [editingModel])

  useEffect(() => {
    if (editingTool && toolSelectRef.current) {
      toolSelectRef.current.focus()
    }
  }, [editingTool])

  const handleLabelDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    setEditingLabel(true)
    setTempLabel(data.label)
  }

  const handleLabelSave = () => {
    if (onNodeUpdate && tempLabel.trim() !== data.label) {
      onNodeUpdate(id, { ...data, label: tempLabel.trim() })
    }
    setEditingLabel(false)
  }

  const handleLabelCancel = () => {
    setTempLabel(data.label)
    setEditingLabel(false)
  }

  const handleModelSave = () => {
    if (onNodeUpdate && tempModel !== currentModelId) {
      const updatedData = {
        ...data,
        agentConfig: {
          ...data.agentConfig,
          model_id: tempModel
        }
      }
      // Also update legacy field for backward compatibility
      if (data.model_id) {
        updatedData.model_id = tempModel
      }
      onNodeUpdate(id, updatedData)
    }
    setEditingModel(false)
  }

  const handleModelCancel = () => {
    setTempModel(currentModelId || '')
    setEditingModel(false)
  }

  const handleToolSave = () => {
    if (onNodeUpdate && tempTool !== data.tool_type) {
      onNodeUpdate(id, { ...data, tool_type: tempTool })
    }
    setEditingTool(false)
  }

  const handleToolCancel = () => {
    setTempTool(data.tool_type || '')
    setEditingTool(false)
  }

  const handleKeyPress = (e: React.KeyboardEvent, saveHandler: () => void, cancelHandler: () => void) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      saveHandler()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      cancelHandler()
    }
  }

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    console.log('AgentNode: Edit button clicked, opening modal')
    setShowModal(true)
  }

  const handleModalSave = (updatedData: EnhancedNodeData) => {
    if (onNodeUpdate) {
      onNodeUpdate(id, updatedData)
    }
  }

  const handleExpansionToggle = () => {
    setExpanded(!expanded)
  }

  // Debug modal state
  useEffect(() => {
    console.log('AgentNode: showModal state changed to', showModal)
  }, [showModal])

  return (
    <>
      <div 
        className={`
          relative bg-white rounded-xl shadow-lg border-2 transition-all duration-200 
          ${getNodeBorderColor(data.type)}
          ${selected ? 'ring-2 ring-blue-400 ring-opacity-75' : ''}
          ${expanded ? 'min-w-[500px]' : 'min-w-[300px]'}
          hover:shadow-xl
        `}
        style={{ 
          zIndex: data.zIndex || (selected ? 100 : 1),
          minHeight: expanded ? '400px' : '120px'
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${getNodeColor(data.type)} flex items-center justify-center shadow-sm flex-shrink-0`}>
              <Icon className="w-5 h-5 text-white" />
            </div>
            
            <div className="flex-1 min-w-0">
              {editingLabel ? (
                <div className="flex items-center gap-2">
                  <input
                    ref={labelInputRef}
                    type="text"
                    value={tempLabel}
                    onChange={(e) => setTempLabel(e.target.value)}
                    onKeyDown={(e) => handleKeyPress(e, handleLabelSave, handleLabelCancel)}
                    onBlur={handleLabelSave}
                    className="text-lg font-semibold text-gray-900 bg-transparent border-b-2 border-blue-500 focus:outline-none flex-1 min-w-0"
                  />
                  <button onClick={handleLabelSave} className="text-green-600 hover:text-green-700">
                    <Save className="w-4 h-4" />
                  </button>
                  <button onClick={handleLabelCancel} className="text-red-600 hover:text-red-700">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <h3 
                  className="text-lg font-semibold text-gray-900 cursor-pointer hover:text-blue-600 transition-colors truncate"
                  onDoubleClick={handleLabelDoubleClick}
                  title="Double-click to edit"
                >
                  {data.label}
                </h3>
              )}
              
              <div className="flex items-center gap-2 mt-1">
                <span className="text-sm text-gray-500 capitalize">{data.type}</span>
                
                {/* AI Enhancement Status */}
                {aiEnhancements.length > 0 && (
                  <>
                    <span className="text-gray-300">•</span>
                    <div className="flex items-center gap-1">
                      <Cpu className="w-3 h-3 text-blue-500" />
                      <span className="text-xs text-blue-600 font-medium">
                        {aiEnhancements.length} AI feature{aiEnhancements.length > 1 ? 's' : ''}
                      </span>
                    </div>
                  </>
                )}
                
                {/* Framework and Model Info */}
                {data.type === 'agent' && (currentFramework || currentModel) && (
                  <>
                    <span className="text-gray-300">•</span>
                    <div className="flex items-center gap-1">
                      {currentFramework && (
                        <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded">
                          {currentFramework.name}
                        </span>
                      )}
                      {currentModel && (
                        <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded">
                          {currentModel.name}
                        </span>
                      )}
                    </div>
                  </>
                )}
                
                {/* Validation Status */}
                <div className="flex items-center gap-1">
                  {validation.status === 'valid' ? (
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-amber-500" />
                  )}
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={handleEditClick}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              title="Edit node"
            >
              <Settings className="w-4 h-4" />
            </button>
            
            <button
              onClick={handleExpansionToggle}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              title={expanded ? "Collapse" : "Expand"}
            >
              {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Expanded Content */}
        {expanded && (
          <div className="p-4 space-y-4">
            {/* Description */}
            {data.description && (
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-1">Description</h4>
                <p className="text-sm text-gray-600">{data.description}</p>
              </div>
            )}

            {/* AI Enhancement Status */}
            {aiEnhancements.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                  <Cpu className="w-4 h-4" />
                  AI Enhancements
                </h4>
                <div className="flex flex-wrap gap-2">
                  {aiEnhancements.map((enhancement, index) => (
                    <span
                      key={index}
                      className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded-full"
                    >
                      {enhancement}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Agent-specific content */}
            {data.type === 'agent' && (
              <div className="space-y-4">
                {/* Model Selection */}
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                    <Cpu className="w-4 h-4" />
                    Model Configuration
                  </h4>
                  
                  {editingModel ? (
                    <div className="flex items-center gap-2">
                      <select
                        ref={modelSelectRef}
                        value={tempModel}
                        onChange={(e) => setTempModel(e.target.value)}
                        onKeyDown={(e) => handleKeyPress(e, handleModelSave, handleModelCancel)}
                        onBlur={handleModelSave}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="">Select a model</option>
                        {POPULAR_MODELS.map(model => (
                          <option key={model.id} value={model.id}>
                            {model.name} ({model.provider})
                          </option>
                        ))}
                      </select>
                      <button onClick={handleModelSave} className="text-green-600 hover:text-green-700">
                        <Save className="w-4 h-4" />
                      </button>
                      <button onClick={handleModelCancel} className="text-red-600 hover:text-red-700">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div 
                      className="p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors"
                      onDoubleClick={() => setEditingModel(true)}
                      title="Double-click to edit"
                    >
                      {currentModel ? (
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="font-medium text-gray-900">{currentModel.name}</span>
                            <span className="text-sm text-gray-500 ml-2">({currentModel.provider})</span>
                          </div>
                          <span className="text-sm text-green-600 font-medium">
                            ${currentModel.cost_per_1k_tokens.toFixed(4)}/1K tokens
                          </span>
                        </div>
                      ) : (
                        <span className="text-gray-500 italic">No model selected</span>
                      )}
                    </div>
                  )}
                </div>

                {/* Instructions */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-medium text-gray-700 flex items-center gap-2">
                      <Zap className="w-4 h-4" />
                      Instructions
                    </h4>
                    <button
                      onClick={() => setShowInstructions(!showInstructions)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      {showInstructions ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  
                  {showInstructions && (
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">
                        {data.agentConfig?.instructions || data.instructions || 'No instructions provided'}
                      </p>
                    </div>
                  )}
                </div>

                {/* Model Parameters */}
                {data.modelOptions && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Model Parameters</h4>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Temperature:</span>
                        <span className="font-medium">{data.modelOptions.temperature}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Max Tokens:</span>
                        <span className="font-medium">{data.modelOptions.max_tokens}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Tool-specific content */}
            {data.type === 'tool' && (
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">Tool Type</h4>
                
                {editingTool ? (
                  <div className="flex items-center gap-2">
                    <select
                      ref={toolSelectRef}
                      value={tempTool}
                      onChange={(e) => setTempTool(e.target.value)}
                      onKeyDown={(e) => handleKeyPress(e, handleToolSave, handleToolCancel)}
                      onBlur={handleToolSave}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Select a tool type</option>
                      {toolOptions.map(tool => (
                        <option key={tool} value={tool}>
                          {tool.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </option>
                      ))}
                    </select>
                    <button onClick={handleToolSave} className="text-green-600 hover:text-green-700">
                      <Save className="w-4 h-4" />
                    </button>
                    <button onClick={handleToolCancel} className="text-red-600 hover:text-red-700">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div 
                    className="p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors"
                    onDoubleClick={() => setEditingTool(true)}
                    title="Double-click to edit"
                  >
                    {data.tool_type ? (
                      <span className="font-medium text-gray-900">
                        {data.tool_type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </span>
                    ) : (
                      <span className="text-gray-500 italic">No tool type selected</span>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Validation Message */}
            {validation.status !== 'valid' && (
              <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                <span className="text-sm text-amber-700">{validation.message}</span>
              </div>
            )}
          </div>
        )}

        {/* Connection Handles */}
        <Handle
          type="target"
          position={Position.Left}
          className="w-3 h-3 !bg-gray-400 !border-2 !border-white"
        />
        <Handle
          type="source"
          position={Position.Right}
          className="w-3 h-3 !bg-gray-400 !border-2 !border-white"
        />
      </div>

      {/* Enhanced Node Editor Modal */}
      <NodeEditorModal
        isOpen={showModal}
        nodeData={data}
        onSave={handleModalSave}
        onClose={() => setShowModal(false)}
      />
    </>
  )
}

export default function AgentNode(props: NodeProps<EnhancedNodeData>) {
  return <AgentNodeComponent {...props} />
} 