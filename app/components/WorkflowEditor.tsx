'use client'

import { useCallback, useRef, useState, useEffect } from 'react'
import ReactFlow, {
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Panel,
} from 'reactflow'
import type { Node, Edge, Connection, ReactFlowInstance } from 'reactflow'
import 'reactflow/dist/style.css'
import AgentNode from './workflow/AgentNode'
import Sidebar from './workflow/Sidebar'
import { WorkflowService, type ExecutionResponse } from '../services/workflow'
import { Play, Square, Loader2, Maximize2, Copy, CheckCircle } from 'lucide-react'

const nodeTypes = {
  agent: AgentNode,
}

const initialNodes: Node[] = [
  {
    id: '1',
    type: 'agent',
    data: { 
      label: 'Input Agent', 
      type: 'input',
      model_id: 'gpt-3.5-turbo',
      instructions: 'You are a helpful assistant that processes input data.',
      name: 'InputAgent'
    },
    position: { x: 250, y: 25 },
  },
]

const initialEdges: Edge[] = []

interface WorkflowEditorProps {
  nodes?: Node[]
  edges?: Edge[]
  onNodesChange?: (nodes: Node[]) => void
  onEdgesChange?: (edges: Edge[]) => void
  onWorkflowChange?: (nodes: Node[], edges: Edge[]) => void
  executionInput?: string
  onExecutionInputChange?: (input: string) => void
}

export default function WorkflowEditor({ 
  nodes: externalNodes, 
  edges: externalEdges, 
  onNodesChange: externalOnNodesChange,
  onEdgesChange: externalOnEdgesChange,
  onWorkflowChange,
  executionInput: externalExecutionInput,
  onExecutionInputChange
}: WorkflowEditorProps = {}) {
  // Use external state if provided, otherwise use internal state
  const [internalNodes, setInternalNodes, onInternalNodesChange] = useNodesState(externalNodes || initialNodes)
  const [internalEdges, setInternalEdges, onInternalEdgesChange] = useEdgesState(externalEdges || initialEdges)
  
  // Determine which state to use
  const nodes = externalNodes || internalNodes
  const edges = externalEdges || internalEdges
  
  const reactFlowWrapper = useRef<HTMLDivElement>(null)
  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance | null>(null)
  
  // Execution state
  const [isExecuting, setIsExecuting] = useState(false)
  const [executionResult, setExecutionResult] = useState<ExecutionResponse | null>(null)
  const [internalInputData, setInternalInputData] = useState('Hello, please analyze this data and provide insights.')
  const [showFullResults, setShowFullResults] = useState(false)
  const [copySuccess, setCopySuccess] = useState(false)

  // Use external input data if provided, otherwise use internal
  const inputData = externalExecutionInput !== undefined ? externalExecutionInput : internalInputData
  const setInputData = onExecutionInputChange || setInternalInputData
  const [inputHighlight, setInputHighlight] = useState(false)

  // Highlight input when it changes from external source
  useEffect(() => {
    if (externalExecutionInput !== undefined && externalExecutionInput !== internalInputData) {
      setInputHighlight(true)
      const timer = setTimeout(() => setInputHighlight(false), 2000)
      return () => clearTimeout(timer)
    }
  }, [externalExecutionInput, internalInputData])

  // Sync external state changes to internal state
  useEffect(() => {
    if (externalNodes) {
      setInternalNodes(externalNodes)
    }
  }, [externalNodes, setInternalNodes])

  useEffect(() => {
    if (externalEdges) {
      setInternalEdges(externalEdges)
    }
  }, [externalEdges, setInternalEdges])

  // Handle node changes
  const handleNodesChange = useCallback((changes: any) => {
    if (externalOnNodesChange && externalNodes) {
      // Apply changes to external nodes and update parent
      onInternalNodesChange(changes)
      // The changes will be applied to internalNodes, then we sync to parent
      // This is a bit complex because ReactFlow changes are incremental
      // For now, let ReactFlow handle the changes internally and sync later
    } else {
      onInternalNodesChange(changes)
    }
  }, [externalOnNodesChange, externalNodes, onInternalNodesChange])

  // Handle edge changes  
  const handleEdgesChange = useCallback((changes: any) => {
    if (externalOnEdgesChange && externalEdges) {
      // Apply changes to external edges and update parent
      onInternalEdgesChange(changes)
    } else {
      onInternalEdgesChange(changes)
    }
  }, [externalOnEdgesChange, externalEdges, onInternalEdgesChange])

  const onConnect = useCallback(
    (params: Connection) => {
      if (externalOnEdgesChange) {
        const newEdges = addEdge(params, edges)
        externalOnEdgesChange(newEdges)
        if (onWorkflowChange) {
          onWorkflowChange(nodes, newEdges)
        }
      } else {
        setInternalEdges((eds) => addEdge(params, eds))
      }
    },
    [edges, nodes, externalOnEdgesChange, setInternalEdges, onWorkflowChange],
  )

  const onDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
  }, [])

  const onDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault()

      const reactFlowBounds = reactFlowWrapper.current?.getBoundingClientRect()
      const type = event.dataTransfer.getData('application/reactflow')

      if (typeof type === 'undefined' || !type || !reactFlowBounds || !reactFlowInstance) {
        return
      }

      const position = reactFlowInstance.project({
        x: event.clientX - reactFlowBounds.left,
        y: event.clientY - reactFlowBounds.top,
      })

      const newNode: Node = {
        id: `${type}-${nodes.length + 1}`,
        type,
        position,
        data: { 
          label: `${type} Node`, 
          type,
          model_id: type === 'agent' ? 'gpt-4.1' : undefined,
          instructions: type === 'agent' ? 'You are a helpful assistant.' : undefined,
          name: type === 'agent' ? `${type}Agent` : undefined,
        },
      }

      if (externalOnNodesChange) {
        // If external state management, update through parent
        const newNodes = [...nodes, newNode]
        externalOnNodesChange(newNodes)
        if (onWorkflowChange) {
          onWorkflowChange(newNodes, edges)
        }
      } else {
        // Use internal state management
        setInternalNodes((nds) => nds.concat(newNode))
      }
    },
    [reactFlowInstance, nodes, edges, externalOnNodesChange, setInternalNodes, onWorkflowChange],
  )

  const executeWorkflow = async () => {
    if (!nodes.length) {
      alert('Please add at least one agent node to execute the workflow.')
      return
    }

    setIsExecuting(true)
    setExecutionResult(null)

    try {
      const workflow = WorkflowService.convertToWorkflowDefinition(nodes, edges)
      
      const result = await WorkflowService.executeWorkflow({
        workflow,
        input_data: inputData,
        framework: 'openai' // Default framework
      })

      setExecutionResult(result)
      
      // If execution is still running, we could set up WebSocket here
      if (result.status === 'running') {
        // TODO: Set up WebSocket for real-time updates
        console.log('Execution started:', result.execution_id)
      }

    } catch (error) {
      console.error('Execution failed:', error)
      setExecutionResult({
        execution_id: 'error',
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      })
    } finally {
      setIsExecuting(false)
    }
  }

  const stopExecution = () => {
    // TODO: Implement execution stopping
    setIsExecuting(false)
  }

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopySuccess(true)
      setTimeout(() => setCopySuccess(false), 2000)
    } catch (err) {
      console.error('Failed to copy text: ', err)
    }
  }

  const formatResultText = (result: any): string => {
    if (typeof result === 'string') {
      return result
    }
    return JSON.stringify(result, null, 2)
  }

  return (
    <div className="h-full w-full bg-slate-50">
      <div className="h-full" ref={reactFlowWrapper}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={handleNodesChange}
          onEdgesChange={handleEdgesChange}
          onConnect={onConnect}
          onInit={setReactFlowInstance}
          onDrop={onDrop}
          onDragOver={onDragOver}
          nodeTypes={nodeTypes}
          fitView
          className="bg-gradient-to-br from-slate-50 to-blue-50"
        >
          <Background color="#e2e8f0" />
          <Controls className="bg-white border border-slate-200 shadow-sm" />
          
          {/* Floating Execution Panel - Only show if we have nodes */}
          {nodes.length > 0 && (
            <Panel position="top-right" className="bg-white/95 backdrop-blur-sm p-4 rounded-xl shadow-lg border border-slate-200 w-80">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center">
                  <Play className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900">Execute Workflow</h3>
                  <p className="text-xs text-slate-500">Run your AI workflow</p>
                </div>
              </div>
              
              {/* Input Data */}
              <div className="mb-3">
                <label className="block text-sm font-medium text-slate-700 mb-1">Input:</label>
                <textarea
                  value={inputData}
                  onChange={(e) => setInputData(e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg text-sm resize-none bg-white/80 focus:bg-white transition-all ${
                    inputHighlight 
                      ? 'border-blue-400 bg-blue-50/50 shadow-sm' 
                      : 'border-slate-200 focus:border-blue-300'
                  }`}
                  rows={2}
                  placeholder="Enter your workflow input..."
                  disabled={isExecuting}
                />
                {inputHighlight && (
                  <p className="text-xs text-blue-600 mt-1 flex items-center gap-1">
                    <span className="w-1 h-1 bg-blue-400 rounded-full"></span>
                    Updated from AI suggestion
                  </p>
                )}
              </div>

              {/* Execution Button */}
              <button
                onClick={executeWorkflow}
                disabled={isExecuting || !nodes.length}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg text-sm font-medium hover:from-green-700 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {isExecuting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Running...
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4" />
                    Execute Workflow
                  </>
                )}
              </button>

              {/* Quick Results Preview */}
              {executionResult && (
                <div className="mt-3 p-3 bg-slate-50 rounded-lg border">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-slate-700">Results:</span>
                    <div className="flex gap-1">
                      <button
                        onClick={() => copyToClipboard(formatResultText(executionResult.result))}
                        className="p-1 text-slate-400 hover:text-slate-600 rounded"
                        title="Copy"
                      >
                        {copySuccess ? <CheckCircle className="w-3 h-3 text-green-600" /> : <Copy className="w-3 h-3" />}
                      </button>
                      <button
                        onClick={() => setShowFullResults(true)}
                        className="p-1 text-slate-400 hover:text-slate-600 rounded"
                        title="Expand"
                      >
                        <Maximize2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                  <div className="text-xs text-slate-600 max-h-16 overflow-y-auto">
                    {formatResultText(executionResult.result).substring(0, 150)}...
                  </div>
                </div>
              )}
            </Panel>
          )}
        </ReactFlow>
      </div>

      {/* Full-Screen Results Modal */}
      {showFullResults && executionResult?.result && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl h-full max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center">
                  <Play className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Workflow Results</h2>
                  <p className="text-sm text-slate-500">Complete execution output</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => copyToClipboard(formatResultText(executionResult.result))}
                  className="flex items-center gap-2 px-4 py-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  {copySuccess ? <CheckCircle className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                  {copySuccess ? 'Copied!' : 'Copy'}
                </button>
                <button
                  onClick={() => setShowFullResults(false)}
                  className="px-4 py-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  ✕ Close
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-hidden p-6">
              <div className="h-full bg-slate-50 rounded-lg p-6 overflow-y-auto">
                <pre className="text-sm text-slate-800 whitespace-pre-wrap leading-relaxed font-mono">
                  {formatResultText(executionResult.result)}
                </pre>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="border-t border-slate-200 p-4 text-xs text-slate-500 flex justify-between bg-slate-50">
              <div>
                {executionResult.execution_id && executionResult.execution_id !== 'error' && (
                  <span>🆔 {executionResult.execution_id}</span>
                )}
              </div>
              <div>⏱️ {new Date().toLocaleTimeString()}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 