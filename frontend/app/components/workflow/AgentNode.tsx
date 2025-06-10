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
  Zap,
  Trash2,
  Clock,
  Loader2,
  XCircle
} from 'lucide-react'
import { NodeEditorModal } from './NodeEditorModal'
import { EnhancedNodeData, AgentFramework, POPULAR_MODELS, FRAMEWORK_INFO, NodeExecutionStatus, NodeExecutionState } from '../../types/workflow'
import EnhancedToolSelector from './EnhancedToolSelector'
import { useExecutionContext } from '../../contexts/ExecutionContext'
import AttachedToolNode from './AttachedToolNode'

interface AgentNodeProps {
  data: EnhancedNodeData
  selected?: boolean
  id: string
  onNodeUpdate?: (nodeId: string, updatedData: EnhancedNodeData) => void
  onNodeDelete?: (nodeId: string) => void
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

const getNodeBorderColor = (type: string, executionStatus?: NodeExecutionStatus) => {
  if (executionStatus) {
    switch (executionStatus) {
      case 'running': return 'border-blue-400 border-2 shadow-lg'
      case 'completed': return 'border-green-400 border-2 shadow-lg'
      case 'failed': return 'border-red-400 border-2 shadow-lg'
      case 'waiting': return 'border-yellow-400 border-2 shadow-lg'
      case 'pending': return 'border-gray-400 border-2'
      default: break
    }
  }
  
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
    // Framework is optional - it can be inferred from model selection or defaulted by backend
    // if (!data.framework) {
    //   return { status: 'warning', message: 'Missing framework selection' }
    // }
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

const getExecutionStatusIcon = (status?: NodeExecutionStatus) => {
  switch (status) {
    case 'running': return <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
    case 'completed': return <CheckCircle className="w-4 h-4 text-green-600" />
    case 'failed': return <XCircle className="w-4 h-4 text-red-600" />
    case 'waiting': return <Clock className="w-4 h-4 text-yellow-600" />
    case 'pending': return <Clock className="w-4 h-4 text-gray-400" />
    default: return null
  }
}

const getExecutionStatusText = (status?: NodeExecutionStatus) => {
  switch (status) {
    case 'running': return 'Running...'
    case 'completed': return 'Completed'
    case 'failed': return 'Failed'
    case 'waiting': return 'Waiting'
    case 'pending': return 'Pending'
    case 'idle':
    default: return null
  }
}

function AgentNodeComponent({ data, selected, id, onNodeUpdate, onNodeDelete }: AgentNodeProps) {
  // Debug: Log what callbacks this node receives
  console.log(`🔧 AgentNode ${id} received callbacks:`, {
    hasOnNodeUpdate: !!onNodeUpdate,
    hasOnNodeDelete: !!onNodeDelete,
    nodeType: data.type,
    nodeLabel: data.label
  })
  
  // Get execution state from context
  const { getNodeExecutionState } = useExecutionContext()
  const executionState = getNodeExecutionState(id)
  const [expanded, setExpanded] = useState(false)
  const [showInstructions, setShowInstructions] = useState(false)
  const [editingLabel, setEditingLabel] = useState(false)
  const [editingModel, setEditingModel] = useState(false)
  const [editingTool, setEditingTool] = useState(false)
  const [tempLabel, setTempLabel] = useState(data.label || '')
  const [tempModel, setTempModel] = useState(data.agentConfig?.model_id || data.model_id || '')
  const [tempTool, setTempTool] = useState(data.tool_type || '')
  const [showModal, setShowModal] = useState(false)
  
  const labelInputRef = useRef<HTMLInputElement>(null)
  const modelSelectRef = useRef<HTMLSelectElement>(null)
  const toolSelectRef = useRef<HTMLSelectElement>(null)
  
  const Icon = getNodeIcon(data.type)
  const validation = getValidationStatus(data)
  const aiEnhancements = getAIEnhancementStatus(data)
  const statusIcon = getExecutionStatusIcon(executionState?.status)
  const statusText = getExecutionStatusText(executionState?.status)
  
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
    e.preventDefault()
    setEditingLabel(true)
    setTempLabel(data.label || '')
  }

  const handleLabelSave = () => {
    if (onNodeUpdate && tempLabel.trim() !== data.label) {
      onNodeUpdate(id, { ...data, label: tempLabel.trim() })
    }
    setEditingLabel(false)
  }

  const handleLabelCancel = () => {
    setTempLabel(data.label || '')
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
    e.preventDefault()
    console.log('AgentNode: Edit button clicked, opening modal')
    setShowModal(true)
  }

  const handleModalSave = (updatedData: EnhancedNodeData) => {
    console.log('🔧 AgentNode handleModalSave called for node:', id)
    console.log('📊 Updated data being saved:', updatedData)
    console.log('📊 Current node data before update:', data)
    
    if (onNodeUpdate) {
      onNodeUpdate(id, updatedData)
      console.log('✅ onNodeUpdate called successfully')
    } else {
      console.error('❌ No onNodeUpdate callback available!')
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
          ${getNodeBorderColor(data.type, executionState?.status)}
          ${selected ? 'ring-2 ring-blue-400 ring-opacity-75 border-blue-300' : ''}
          ${expanded ? 'min-w-[500px]' : 'min-w-[300px]'}
          ${executionState?.status === 'running' ? 'animate-pulse' : ''}
          hover:shadow-xl
        `}
        style={{ 
          zIndex: data.zIndex || (selected ? 100 : 1),
          minHeight: expanded ? '400px' : '120px'
        }}
      >
        {/* Execution Status Indicator - Top Right Corner */}
        {statusIcon && (
          <div className="absolute -top-2 -right-2 bg-white rounded-full p-1 shadow-lg border-2 border-gray-100 z-10">
            {statusIcon}
          </div>
        )}

        {/* Progress Bar - Bottom Edge */}
        {executionState?.status === 'running' && executionState?.progress !== undefined && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-200 rounded-b-lg overflow-hidden">
            <div 
              className="h-full bg-blue-500 transition-all duration-300 ease-out"
              style={{ width: `${executionState.progress}%` }}
            />
          </div>
        )}

        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div 
              className={`w-10 h-10 rounded-xl bg-gradient-to-br ${getNodeColor(data.type)} flex items-center justify-center shadow-sm flex-shrink-0`}
              title="Drag to move node"
            >
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
                
                {/* Composio Tool Indicator */}
                {data.isComposio && (
                  <>
                    <span className="text-gray-300">•</span>
                    <div className="flex items-center gap-1">
                      <Zap className="w-3 h-3 text-purple-500" />
                      <span className="text-xs text-purple-600 font-medium">
                        Composio
                      </span>
                    </div>
                  </>
                )}
                
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
          
          <div className="flex items-center gap-2 flex-shrink-0 nodrag">
            <button
              onClick={handleEditClick}
              onMouseDown={(e) => e.stopPropagation()}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              title="Edit node"
            >
              <Settings className="w-4 h-4" />
            </button>
            
            <button
              onClick={handleExpansionToggle}
              onMouseDown={(e) => e.stopPropagation()}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              title={expanded ? "Collapse" : "Expand"}
            >
              {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Execution Status Display */}
        {statusText && (
          <div className="px-3 py-1 bg-gray-50 border-b border-gray-200">
            <div className="flex items-center gap-2 text-xs">
              {statusIcon}
              <span className="font-medium">{statusText}</span>
              {executionState?.cost && (
                <span className="text-gray-600 ml-auto">
                  ${executionState.cost.toFixed(4)}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Expanded Content */}
        {expanded && (
          <div className="p-4 space-y-4 nodrag">
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
                <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                  <Wrench className="w-4 h-4" />
                  Tool Selection
                </h4>
                
                {editingTool ? (
                  <div className="flex items-center gap-2">
                    <EnhancedToolSelector
                      value={tempTool}
                      onChange={setTempTool}
                      onKeyDown={(e) => handleKeyPress(e, handleToolSave, handleToolCancel)}
                      onBlur={handleToolSave}
                      className="flex-1"
                      nodeData={{
                        name: data.name || data.label,
                        instructions: data.instructions,
                        type: data.type
                      }}
                    />
                    <button onClick={handleToolSave} className="text-green-600 hover:text-green-700">
                      <Save className="w-4 h-4" />
                    </button>
                    <button onClick={handleToolCancel} className="text-red-600 hover:text-red-700">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div 
                    className="cursor-pointer"
                    onDoubleClick={() => setEditingTool(true)}
                    title="Double-click to edit"
                  >
                    <EnhancedToolSelector
                      value={data.tool_type || ''}
                      onChange={() => {}} // Read-only when not editing
                      disabled={true}
                    />
                  </div>
                )}
              </div>
            )}

            {/* Attached Tools Shelf */}
            {data.type === 'agent' && data.tools && data.tools.length > 0 && (
              <div className="border-t pt-4">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Attached Tools</h4>
                <div className="space-y-1">
                  {data.tools.map(tool => (
                    <AttachedToolNode
                      key={tool.id}
                      tool={tool}
                      onDelete={(toolId) => {
                        if (onNodeUpdate) {
                          const updatedTools = data.tools?.filter(t => t.id !== toolId)
                          onNodeUpdate(id, { ...data, tools: updatedTools })
                        }
                      }}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Validation Message */}
            {validation.status !== 'valid' && (
              <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                <span className="text-sm text-amber-700">{validation.message}</span>
              </div>
            )}

            {/* Node Actions */}
            <div className="border-t pt-4">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Node Actions</h4>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleEditClick}
                  className="flex items-center gap-2 px-3 py-2 text-sm bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg transition-colors"
                >
                  <Settings className="w-4 h-4" />
                  Edit Settings
                </button>
                
                {onNodeDelete ? (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      e.preventDefault()
                      if (window.confirm(`Delete "${data.label}" node?`)) {
                        onNodeDelete(id)
                      }
                    }}
                    className="flex items-center gap-2 px-3 py-2 text-sm bg-red-50 text-red-700 hover:bg-red-100 rounded-lg transition-colors border border-red-200"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete Node
                  </button>
                ) : (
                  <div className="flex items-center gap-2 px-3 py-2 text-sm text-gray-400 rounded-lg border border-gray-200">
                    <Trash2 className="w-4 h-4" />
                    Delete Not Available
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Connection Handles */}
        <Handle
          type="target"
          position={Position.Left}
          className="!w-4 !h-4 !bg-gray-500 !border-2 !border-white !shadow-lg hover:!bg-gray-600 !transition-all !duration-200"
          style={{
            left: -10, // Position slightly outside the node
            zIndex: 10,
          }}
          title="Input connection point"
        />
        <Handle
          type="source"
          position={Position.Right}
          className="!w-4 !h-4 !bg-gray-500 !border-2 !border-white !shadow-lg hover:!bg-gray-600 !transition-all !duration-200"
          style={{
            right: -10, // Position slightly outside the node
            zIndex: 10,
          }}
          title="Output connection point"
        />
        {data.type === 'agent' && (
          <Handle
            type="target"
            position={Position.Bottom}
            id="tool"
            className="!w-4 !h-4 !bg-yellow-500 !border-2 !border-white !shadow-lg hover:!bg-yellow-600 !transition-all !duration-200"
            style={{
              bottom: -10,
              zIndex: 10,
            }}
            title="Tool connection point"
          />
        )}
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

export default function AgentNode(props: NodeProps<EnhancedNodeData & {
  onNodeUpdate?: (nodeId: string, updatedData: EnhancedNodeData) => void
  onNodeDelete?: (nodeId: string) => void
}>) {
  // Extract callbacks from data and pass them as separate props
  const { data, ...otherProps } = props
  const { onNodeUpdate, onNodeDelete, ...nodeData } = data
  
  // Debug logging to see if callbacks are present
  console.log(`🔍 AgentNode ${props.id} - onNodeUpdate:`, !!onNodeUpdate, 'onNodeDelete:', !!onNodeDelete)
  console.log(`🔍 AgentNode ${props.id} - data.onNodeUpdate:`, !!data.onNodeUpdate, 'data.onNodeDelete:', !!data.onNodeDelete)
  
  // Provide fallback callbacks if they're missing
  const safeOnNodeUpdate = onNodeUpdate || data.onNodeUpdate || ((nodeId: string, updatedData: EnhancedNodeData) => {
    console.warn(`🚨 No onNodeUpdate callback for node ${nodeId}, update ignored:`, updatedData)
  })
  
  const safeOnNodeDelete = onNodeDelete || data.onNodeDelete || ((nodeId: string) => {
    console.warn(`🚨 No onNodeDelete callback for node ${nodeId}, using simple fallback deletion`)
    
    // Simple fallback - just try to remove the node element
    setTimeout(() => {
      const nodeElement = document.querySelector(`[data-id="${nodeId}"]`)
      if (nodeElement && nodeElement instanceof HTMLElement) {
        console.log(`🗑️ Fallback: Removing AgentNode ${nodeId} from DOM`)
        nodeElement.remove()
      }
    }, 100)
  })
  
  return <AgentNodeComponent 
    key={`${props.id}-${data.revision || 0}`}
    {...otherProps} 
    data={nodeData as EnhancedNodeData}
    onNodeUpdate={safeOnNodeUpdate}
    onNodeDelete={safeOnNodeDelete}
  />
} 