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
import { Play, Square, Loader2 } from 'lucide-react'

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
}

export default function WorkflowEditor({ 
  nodes: externalNodes, 
  edges: externalEdges, 
  onNodesChange: externalOnNodesChange,
  onEdgesChange: externalOnEdgesChange,
  onWorkflowChange 
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
  const [inputData, setInputData] = useState('Hello, please analyze this data and provide insights.')

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

  return (
    <div className="flex h-full w-full">
      <Sidebar />
      <div className="flex-1" ref={reactFlowWrapper}>
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
        >
          <Background />
          <Controls />
          
          {/* Workflow Execution Panel */}
          <Panel position="top-right" className="bg-white p-4 rounded-lg shadow-lg w-80">
            <h2 className="text-lg font-semibold mb-3">🤖 any-agent Executor</h2>
            
            {/* Input Data */}
            <div className="mb-3">
              <label className="block text-sm font-medium mb-1">Input Data:</label>
              <textarea
                value={inputData}
                onChange={(e) => setInputData(e.target.value)}
                className="w-full px-3 py-2 border rounded-md text-sm resize-none"
                rows={3}
                placeholder="Enter input for your workflow..."
                disabled={isExecuting}
              />
            </div>

            {/* Execution Controls */}
            <div className="flex gap-2 mb-3">
              {!isExecuting ? (
                <button
                  onClick={executeWorkflow}
                  className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm font-medium"
                  disabled={!nodes.length}
                >
                  <Play className="h-4 w-4" />
                  Execute Workflow
                </button>
              ) : (
                <button
                  onClick={stopExecution}
                  className="flex items-center gap-2 px-3 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm font-medium"
                >
                  <Square className="h-4 w-4" />
                  Stop
                </button>
              )}
              
              {isExecuting && (
                <div className="flex items-center gap-2 text-blue-600 text-sm">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Executing...
                </div>
              )}
            </div>

            {/* Execution Results */}
            {executionResult && (
              <div className="border-t pt-3">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm font-medium">Status:</span>
                  <span className={`px-2 py-1 rounded-md text-xs font-medium ${
                    executionResult.status === 'completed' ? 'bg-green-100 text-green-800' :
                    executionResult.status === 'failed' ? 'bg-red-100 text-red-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {executionResult.status}
                  </span>
                </div>

                {executionResult.result && (
                  <div className="mb-2">
                    <span className="text-sm font-medium">Result:</span>
                    <div className="bg-gray-50 p-2 rounded-md text-sm mt-1 max-h-24 overflow-y-auto">
                      {executionResult.result}
                    </div>
                  </div>
                )}

                {executionResult.error && (
                  <div className="mb-2">
                    <span className="text-sm font-medium text-red-600">Error:</span>
                    <div className="bg-red-50 p-2 rounded-md text-sm text-red-700 mt-1">
                      {executionResult.error}
                    </div>
                  </div>
                )}

                {executionResult.execution_id && executionResult.execution_id !== 'error' && (
                  <div className="text-xs text-gray-500">
                    ID: {executionResult.execution_id}
                  </div>
                )}
              </div>
            )}

            <div className="text-xs text-gray-500 mt-3">
              Powered by any-agent framework
            </div>
          </Panel>
        </ReactFlow>
      </div>
    </div>
  )
} 