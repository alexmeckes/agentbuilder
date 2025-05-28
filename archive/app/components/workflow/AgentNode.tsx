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
  X
} from 'lucide-react'
import NodeEditorModal from './NodeEditorModal'

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

interface AgentNodeProps {
  data: AgentNodeData
  selected?: boolean
  id: string
  onNodeUpdate?: (nodeId: string, updatedData: AgentNodeData) => void
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

const getValidationStatus = (data: AgentNodeData) => {
  if (data.type === 'agent') {
    if (!data.model_id || !data.instructions) {
      return { status: 'warning', message: 'Missing model or instructions' }
    }
  }
  if (data.type === 'tool') {
    if (!data.tool_type) {
      return { status: 'warning', message: 'Tool type not specified' }
    }
  }
  return { status: 'valid', message: 'Node configured correctly' }
}

const modelOptions = [
  'gpt-4o',
  'gpt-4o-mini', 
  'gpt-4-turbo',
  'gpt-4',
  'gpt-3.5-turbo',
  'claude-3-5-sonnet-20241022',
  'claude-3-haiku-20240307'
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
  const [tempModel, setTempModel] = useState(data.model_id || '')
  const [tempTool, setTempTool] = useState(data.tool_type || '')
  const [showModal, setShowModal] = useState(false)
  
  const labelInputRef = useRef<HTMLInputElement>(null)
  const modelSelectRef = useRef<HTMLSelectElement>(null)
  const toolSelectRef = useRef<HTMLSelectElement>(null)
  
  const Icon = getNodeIcon(data.type)
  const validation = getValidationStatus(data)
  
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
    if (onNodeUpdate && tempModel !== data.model_id) {
      onNodeUpdate(id, { ...data, model_id: tempModel })
    }
    setEditingModel(false)
  }

  const handleModelCancel = () => {
    setTempModel(data.model_id || '')
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
    setShowModal(true)
  }

  const handleModalSave = (nodeId: string, updatedData: AgentNodeData) => {
    if (onNodeUpdate) {
      onNodeUpdate(nodeId, updatedData)
    }
  }

  // Handle expansion state change
  const handleExpansionToggle = () => {
    setExpanded(!expanded)
  }

  return (
    <>
      <div 
        className={`
          relative bg-white rounded-lg border-2 transition-all duration-200
          ${getNodeBorderColor(data.type)}
          ${selected ? 'ring-2 ring-blue-400 ring-opacity-50 shadow-2xl' : 'shadow-lg'}
          ${expanded ? 'w-80' : 'w-64'}
          ${selected ? 'shadow-blue-200/50' : ''}
          hover:shadow-xl
          overflow-hidden
        `}
        style={{
          minHeight: expanded ? 'auto' : '120px',
          ...(selected && { 
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04), 0 0 0 1px rgba(59, 130, 246, 0.1)' 
          })
        }}
      >
        {/* Connection Handles */}
        <Handle 
          type="target" 
          position={Position.Top} 
          className="w-3 h-3 border-2 border-white shadow-md" 
        />
        
        {/* Header */}
        <div className="p-3">
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              {/* Node Type Icon */}
              <div className={`
                w-8 h-8 rounded-lg bg-gradient-to-br ${getNodeColor(data.type)} 
                flex items-center justify-center shadow-sm flex-shrink-0
              `}>
                <Icon className="w-4 h-4 text-white" />
              </div>
              
              {/* Node Label - Editable */}
              <div className="flex-1 min-w-0">
                {editingLabel ? (
                  <div className="flex items-center gap-1">
                    <input
                      ref={labelInputRef}
                      type="text"
                      value={tempLabel}
                      onChange={(e) => setTempLabel(e.target.value)}
                      onKeyDown={(e) => handleKeyPress(e, handleLabelSave, handleLabelCancel)}
                      onBlur={handleLabelCancel}
                      className="text-sm font-semibold text-gray-900 bg-white border border-blue-300 rounded px-1 py-0.5 min-w-0 flex-1"
                    />
                    <button
                      onClick={handleLabelSave}
                      className="p-0.5 text-green-600 hover:text-green-800 flex-shrink-0"
                    >
                      <Save className="w-3 h-3" />
                    </button>
                    <button
                      onClick={handleLabelCancel}
                      className="p-0.5 text-red-600 hover:text-red-800 flex-shrink-0"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <div 
                    className="font-semibold text-gray-900 text-sm cursor-pointer hover:bg-gray-50 rounded px-1 py-0.5 group flex items-center gap-1"
                    onDoubleClick={handleLabelDoubleClick}
                    title="Double-click to edit"
                  >
                    <span className="break-words">{data.label}</span>
                    <Edit3 className="w-3 h-3 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                  </div>
                )}
                <div className="text-xs text-gray-500 capitalize">
                  {data.type}
                </div>
              </div>
            </div>
            
            {/* Status and Controls */}
            <div className="flex items-center gap-1 flex-shrink-0 ml-2">
              {validation.status === 'valid' ? (
                <CheckCircle className="w-4 h-4 text-green-500" />
              ) : (
                <AlertCircle className="w-4 h-4 text-yellow-500" />
              )}
              
              {/* Expand/Collapse Button */}
              <button
                onClick={handleExpansionToggle}
                className="p-1 hover:bg-gray-100 rounded transition-colors"
                title={expanded ? 'Collapse details' : 'Expand details'}
              >
                {expanded ? (
                  <ChevronDown className="w-3 h-3 text-gray-400" />
                ) : (
                  <ChevronRight className="w-3 h-3 text-gray-400" />
                )}
              </button>
            </div>
          </div>
          
          {/* Quick Info - Always Visible */}
          <div className="mt-2 space-y-1">
            {data.model_id && (
              <div className="flex items-center gap-1 min-w-0">
                <div className="w-2 h-2 bg-blue-400 rounded-full flex-shrink-0"></div>
                {editingModel ? (
                  <div className="flex items-center gap-1 flex-1 min-w-0">
                    <select
                      ref={modelSelectRef}
                      value={tempModel}
                      onChange={(e) => setTempModel(e.target.value)}
                      onKeyDown={(e) => handleKeyPress(e, handleModelSave, handleModelCancel)}
                      onBlur={handleModelCancel}
                      className="text-xs text-gray-600 font-medium bg-white border border-blue-300 rounded px-1 py-0.5 flex-1 min-w-0"
                    >
                      {modelOptions.map(model => (
                        <option key={model} value={model}>{model}</option>
                      ))}
                    </select>
                    <button
                      onClick={handleModelSave}
                      className="p-0.5 text-green-600 hover:text-green-800 flex-shrink-0"
                    >
                      <Save className="w-3 h-3" />
                    </button>
                    <button
                      onClick={handleModelCancel}
                      className="p-0.5 text-red-600 hover:text-red-800 flex-shrink-0"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <span 
                    className="text-xs text-gray-600 font-medium cursor-pointer hover:bg-gray-50 rounded px-1 py-0.5 group flex items-center gap-1 flex-1 min-w-0"
                    onDoubleClick={(e) => {
                      e.stopPropagation()
                      setEditingModel(true)
                      setTempModel(data.model_id || '')
                    }}
                    title="Double-click to edit model"
                  >
                    <span className="truncate">{data.model_id}</span>
                    <Edit3 className="w-2 h-2 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                  </span>
                )}
              </div>
            )}
            
            {data.tool_type && (
              <div className="flex items-center gap-1 min-w-0">
                <div className="w-2 h-2 bg-green-400 rounded-full flex-shrink-0"></div>
                {editingTool ? (
                  <div className="flex items-center gap-1 flex-1 min-w-0">
                    <select
                      ref={toolSelectRef}
                      value={tempTool}
                      onChange={(e) => setTempTool(e.target.value)}
                      onKeyDown={(e) => handleKeyPress(e, handleToolSave, handleToolCancel)}
                      onBlur={handleToolCancel}
                      className="text-xs text-gray-600 font-medium bg-white border border-blue-300 rounded px-1 py-0.5 flex-1 min-w-0"
                    >
                      {toolOptions.map(tool => (
                        <option key={tool} value={tool}>{tool}</option>
                      ))}
                    </select>
                    <button
                      onClick={handleToolSave}
                      className="p-0.5 text-green-600 hover:text-green-800 flex-shrink-0"
                    >
                      <Save className="w-3 h-3" />
                    </button>
                    <button
                      onClick={handleToolCancel}
                      className="p-0.5 text-red-600 hover:text-red-800 flex-shrink-0"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <span 
                    className="text-xs text-gray-600 font-medium cursor-pointer hover:bg-gray-50 rounded px-1 py-0.5 group flex items-center gap-1 flex-1 min-w-0"
                    onDoubleClick={(e) => {
                      e.stopPropagation()
                      setEditingTool(true)
                      setTempTool(data.tool_type || '')
                    }}
                    title="Double-click to edit tool type"
                  >
                    <span className="truncate">{data.tool_type}</span>
                    <Edit3 className="w-2 h-2 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
        
        {/* Expanded Details */}
        {expanded && (
          <div 
            className="border-t border-gray-100 p-3 space-y-3 bg-gray-50/50 w-full"
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Description */}
            {data.description && (
              <div>
                <div className="text-xs font-medium text-gray-700 mb-1">Description</div>
                <div className="text-xs text-gray-600 bg-white p-2 rounded border">
                  {data.description}
                </div>
              </div>
            )}
            
            {/* Instructions Preview */}
            {data.instructions && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <div className="text-xs font-medium text-gray-700">Instructions</div>
                  <button
                    onClick={() => setShowInstructions(!showInstructions)}
                    className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700"
                  >
                    {showInstructions ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                    {showInstructions ? 'Hide' : 'Show'}
                  </button>
                </div>
                
                {showInstructions ? (
                  <div className="text-xs text-gray-600 bg-white p-2 rounded border max-h-24 overflow-y-auto">
                    {data.instructions}
                  </div>
                ) : (
                  <div className="text-xs text-gray-500 bg-white p-2 rounded border">
                    {truncateText(data.instructions, 60)}
                  </div>
                )}
              </div>
            )}
            
            {/* Validation Status */}
            <div className="flex items-center gap-2 text-xs">
              {validation.status === 'valid' ? (
                <CheckCircle className="w-3 h-3 text-green-500" />
              ) : (
                <AlertCircle className="w-3 h-3 text-yellow-500" />
              )}
              <span className={`
                ${validation.status === 'valid' ? 'text-green-600' : 'text-yellow-600'}
              `}>
                {validation.message}
              </span>
            </div>
            
            {/* Quick Actions */}
            <div className="flex gap-2 pt-2 border-t border-gray-200">
              <button 
                onClick={handleEditClick}
                className="flex items-center gap-1 text-xs text-gray-600 hover:text-gray-800 px-2 py-1 hover:bg-white rounded transition-colors"
              >
                <Settings className="w-3 h-3" />
                Edit
              </button>
              <button className="flex items-center gap-1 text-xs text-gray-600 hover:text-gray-800 px-2 py-1 hover:bg-white rounded transition-colors">
                <Eye className="w-3 h-3" />
                Test
              </button>
            </div>
          </div>
        )}
        
        <Handle 
          type="source" 
          position={Position.Bottom} 
          className="w-3 h-3 border-2 border-white shadow-md" 
        />
      </div>

      {/* Node Editor Modal */}
      <NodeEditorModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        nodeData={data}
        nodeId={id}
        onSave={handleModalSave}
      />
    </>
  )
}

// Wrapper component that receives ReactFlow node props
export default function AgentNode(props: NodeProps<AgentNodeData>) {
  return (
    <AgentNodeComponent 
      data={props.data} 
      selected={props.selected} 
      id={props.id}
      onNodeUpdate={props.data.onNodeUpdate}
    />
  )
} 