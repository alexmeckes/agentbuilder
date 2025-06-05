'use client'

import { useCallback, useRef, useState, useEffect } from 'react'
import ReactFlow, {
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Panel,
  applyNodeChanges,
  applyEdgeChanges,
} from 'reactflow'
import type { Node, Edge, Connection, ReactFlowInstance } from 'reactflow'
import 'reactflow/dist/style.css'
import AgentNode from './workflow/AgentNode'
import DeletableEdge from './workflow/DeletableEdge'
import Sidebar from './workflow/Sidebar'
import NodePalette from './workflow/NodePalette'
import { WorkflowService, type ExecutionResponse } from '../services/workflow'
import { Play, Square, Loader2, Maximize2, Copy, CheckCircle, Settings, Brain, X } from 'lucide-react'
import { WorkflowManager } from '../services/workflowManager'
import { ExecutionProvider, useExecutionContext } from '../contexts/ExecutionContext'

const nodeTypes = {
  agent: AgentNode,
  tool: AgentNode,
  input: AgentNode,
  output: AgentNode,
}

const edgeTypes = {
  default: DeletableEdge,
}

const initialNodes: Node[] = []

const initialEdges: Edge[] = []

interface WorkflowEditorProps {
  nodes?: Node[]
  edges?: Edge[]
  onNodesChange?: (nodes: Node[]) => void
  onEdgesChange?: (edges: Edge[]) => void
  onWorkflowChange?: (nodes: Node[], edges: Edge[]) => void
  executionInput?: string
  onExecutionInputChange?: (input: string) => void
  workflowIdentity?: any
  initialManualMode?: boolean
  onManualModeChange?: (manualMode: boolean) => void
  receivedWorkflowIdentity?: any
}

function WorkflowEditorInner({ 
  nodes: externalNodes, 
  edges: externalEdges, 
  onNodesChange: externalOnNodesChange,
  onEdgesChange: externalOnEdgesChange,
  onWorkflowChange,
  executionInput: externalExecutionInput,
  onExecutionInputChange,
  workflowIdentity: externalWorkflowIdentity,
  initialManualMode = false,
  onManualModeChange,
  receivedWorkflowIdentity
}: WorkflowEditorProps) {
  // Get execution context
  const { 
    executionState, 
    isExecuting: contextIsExecuting, 
    startExecution, 
    stopExecution: contextStopExecution 
  } = useExecutionContext()
  // DRAG SYSTEM ARCHITECTURE:
  // 1. HTML5 Drag & Drop: Sidebar → Canvas (onDrop, onDragOver)
  // 2. ReactFlow Drag: Move nodes within canvas (onNodeDrag*, nodesDraggable)
  // Use external state if provided, otherwise use internal state
  const [internalNodes, setInternalNodes, onInternalNodesChange] = useNodesState(externalNodes || initialNodes)
  const [internalEdges, setInternalEdges, onInternalEdgesChange] = useEdgesState(externalEdges || initialEdges)
  
  // Determine which state to use
  const baseNodes = externalNodes || internalNodes
  const edges = externalEdges || internalEdges
  
  const reactFlowWrapper = useRef<HTMLDivElement>(null)
  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance | null>(null)
  
  // Store ReactFlow instance globally for fallback updates
  useEffect(() => {
    if (reactFlowInstance) {
      (window as any).reactFlowInstance = reactFlowInstance
    }
  }, [reactFlowInstance])
  
  // Legacy execution state for compatibility
  const [isExecuting, setIsExecuting] = useState(false)
  const [executionResult, setExecutionResult] = useState<ExecutionResponse | null>(null)
  const [internalInputData, setInternalInputData] = useState('Hello, please analyze this data and provide insights.')
  const [showFullResults, setShowFullResults] = useState(false)
  const [copySuccess, setCopySuccess] = useState(false)
  const [currentWorkflowIdentity, setCurrentWorkflowIdentity] = useState<any>(null)

  // Sync execution state from context
  useEffect(() => {
    setIsExecuting(contextIsExecuting)
  }, [contextIsExecuting])

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

  // Set workflow identity from external prop
  useEffect(() => {
    if (externalWorkflowIdentity) {
      console.log(`🎯 Setting workflow identity from external: "${externalWorkflowIdentity.name}"`)
      setCurrentWorkflowIdentity(externalWorkflowIdentity)
    }
  }, [externalWorkflowIdentity])
  
  // Update workflow identity when received from backend via WebSocket
  useEffect(() => {
    if (receivedWorkflowIdentity) {
      console.log(`🏷️ Updating workflow identity from backend: "${receivedWorkflowIdentity.name}"`)
      setCurrentWorkflowIdentity(receivedWorkflowIdentity)
    }
  }, [receivedWorkflowIdentity])

  // Listen for execution completion from context to update results
  useEffect(() => {
    if (executionState?.status === 'completed' && !executionResult?.result) {
      // Execution completed via WebSocket/polling, but we don't have result set
      // This happens when the execution runs async and completes through ExecutionContext
      console.log('🔄 Execution completed via context, updating result state')
      
      // We need to fetch the final execution data to get the result
      if (executionState.id) {
        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000'
        fetch(`${backendUrl}/executions/${executionState.id}`)
          .then(response => response.json())
          .then(data => {
            console.log('📦 Fetched final execution data:', data)
            
            // Update execution result with complete data
            setExecutionResult({
              execution_id: data.execution_id,
              status: data.status,
              result: data.result || data.trace?.final_output,
              trace: data.trace,
              error: data.error,
              workflow_name: data.workflow_name,
              workflow_id: data.workflow_id
            })
            
            // Update workflow identity if we have it and it's meaningful
            if (data.workflow_identity && data.workflow_identity.name && data.workflow_identity.name !== 'Unknown Workflow') {
              console.log('📝 Updating workflow identity from execution result:', data.workflow_identity)
              setCurrentWorkflowIdentity(data.workflow_identity)
            }
          })
          .catch(error => {
            console.error('❌ Failed to fetch final execution data:', error)
          })
      }
    }
      }, [executionState?.status, executionState?.id, executionResult?.result])

  // Manual node creation mode state
  const [useManualMode, setUseManualMode] = useState(initialManualMode)
  
  // Sync external manual mode changes to internal state
  useEffect(() => {
    setUseManualMode(initialManualMode)
  }, [initialManualMode])
  
  // Sync manual mode changes to parent
  const handleManualModeChange = useCallback((newMode: boolean) => {
    setUseManualMode(newMode)
    if (onManualModeChange) {
      onManualModeChange(newMode)
    }
  }, [onManualModeChange])

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

  // Handle node changes (including position updates from dragging)
  const handleNodesChange = useCallback((changes: any) => {
    console.log('🔄 handleNodesChange called with:', changes)
    
    if (externalOnNodesChange && externalNodes) {
      // Apply ReactFlow changes to external nodes and sync to parent
      const updatedNodes = applyNodeChanges(changes, externalNodes)
      console.log('📤 Syncing updated nodes to external state:', updatedNodes.map((n: Node) => ({ id: n.id, position: n.position })))
      externalOnNodesChange(updatedNodes)
      
      if (onWorkflowChange) {
        onWorkflowChange(updatedNodes, edges)
      }
    } else {
      // Use internal state management
      onInternalNodesChange(changes)
    }
  }, [externalOnNodesChange, externalNodes, onInternalNodesChange, onWorkflowChange, edges])

  // Handle node deletion
  const handleNodesDelete = useCallback(
    (nodesToDelete: Node[]) => {
      const nodeIdsToDelete = nodesToDelete.map(node => node.id)
      console.log('🗑️ Deleting nodes:', nodeIdsToDelete)
      
      try {
        if (externalOnNodesChange && externalOnEdgesChange) {
          // Verify nodes exist before attempting deletion
          const existingNodeIds = baseNodes.map(node => node.id)
          const validNodeIdsToDelete = nodeIdsToDelete.filter(id => existingNodeIds.includes(id))
          
          if (validNodeIdsToDelete.length === 0) {
            console.log('ℹ️ No valid nodes to delete, all already removed')
            return
          }
          
          // Filter out deleted nodes and their connected edges
          const updatedNodes = baseNodes.filter(node => !validNodeIdsToDelete.includes(node.id))
          const updatedEdges = edges.filter(edge => 
            !validNodeIdsToDelete.includes(edge.source) && !validNodeIdsToDelete.includes(edge.target)
          )
          
          console.log(`🗑️ Removing ${validNodeIdsToDelete.length} nodes and ${edges.length - updatedEdges.length} connected edges`)
          
          externalOnNodesChange(updatedNodes)
          externalOnEdgesChange(updatedEdges)
          
          if (onWorkflowChange) {
            onWorkflowChange(updatedNodes, updatedEdges)
          }
        } else {
          // Update internal state with safety checks
          setInternalNodes(currentNodes => {
            const existingNodeIds = currentNodes.map(node => node.id)
            const validNodeIdsToDelete = nodeIdsToDelete.filter(id => existingNodeIds.includes(id))
            
            if (validNodeIdsToDelete.length === 0) {
              console.log('ℹ️ No valid internal nodes to delete')
              return currentNodes
            }
            
            return currentNodes.filter(node => !validNodeIdsToDelete.includes(node.id))
          })
          
          setInternalEdges(currentEdges => 
            currentEdges.filter(edge => 
              !nodeIdsToDelete.includes(edge.source) && !nodeIdsToDelete.includes(edge.target)
            )
          )
        }
      } catch (error) {
        console.error(`❌ Error deleting multiple nodes:`, error)
        // Don't throw - just log the error and continue
      }
    },
    [baseNodes, edges, externalOnNodesChange, externalOnEdgesChange, setInternalNodes, setInternalEdges, onWorkflowChange]
  )

  // Handle individual node deletion (from delete button)
  const handleNodeDelete = useCallback(
    (nodeId: string) => {
      console.log('🗑️ Deleting single node:', nodeId)
      
      try {
        if (externalOnNodesChange && externalOnEdgesChange) {
          // Verify node exists before attempting deletion
          const nodeToDelete = baseNodes.find(node => node.id === nodeId)
          if (!nodeToDelete) {
            console.log(`ℹ️ Node ${nodeId} not found, already deleted`)
            return
          }
          
          // Filter out deleted node and its connected edges
          const updatedNodes = baseNodes.filter(node => node.id !== nodeId)
          const updatedEdges = edges.filter(edge => 
            edge.source !== nodeId && edge.target !== nodeId
          )
          
          console.log(`🗑️ Removing node ${nodeId} and ${edges.length - updatedEdges.length} connected edges`)
          
          externalOnNodesChange(updatedNodes)
          externalOnEdgesChange(updatedEdges)
          
          if (onWorkflowChange) {
            onWorkflowChange(updatedNodes, updatedEdges)
          }
        } else {
          // Update internal state with safety checks
          setInternalNodes(currentNodes => {
            const nodeExists = currentNodes.find(node => node.id === nodeId)
            if (!nodeExists) {
              console.log(`ℹ️ Node ${nodeId} not found in internal state, already deleted`)
              return currentNodes
            }
            return currentNodes.filter(node => node.id !== nodeId)
          })
          
          setInternalEdges(currentEdges => 
            currentEdges.filter(edge => 
              edge.source !== nodeId && edge.target !== nodeId
            )
          )
        }
      } catch (error) {
        console.error(`❌ Error deleting node ${nodeId}:`, error)
        // Don't throw - just log the error and continue
      }
    },
    [baseNodes, edges, externalOnNodesChange, externalOnEdgesChange, setInternalNodes, setInternalEdges, onWorkflowChange]
  )

  // Handle node data updates from the node components
  const handleNodeUpdate = useCallback((nodeId: string, updatedData: any) => {
    console.log(`🔧 WorkflowEditor handleNodeUpdate called for node: ${nodeId}`)
    console.log(`📊 Updated data received:`, updatedData)
    
    const updateNodes = (currentNodes: Node[]) => {
      const nodeExists = currentNodes.find(node => node.id === nodeId)
      if (!nodeExists) {
        // Silently ignore updates to deleted nodes to prevent React errors
        console.log(`ℹ️ Node ${nodeId} no longer exists (likely deleted), skipping update`)
        return currentNodes // Return unchanged if node doesn't exist
      }
      
      console.log(`📊 Current node data before update:`, nodeExists.data)
      
      const updatedNodes = currentNodes.map(node => 
        node.id === nodeId 
          ? { ...node, data: { ...node.data, ...updatedData } }
          : node
      )
      
      // Log the updated node to verify the merge
      const updatedNode = updatedNodes.find(n => n.id === nodeId)
      console.log(`📊 Node data after update:`, updatedNode?.data)
      console.log(`✅ Node ${nodeId} updated successfully`)
      
      return updatedNodes
    }

    try {
      if (externalOnNodesChange) {
        // Try to update external nodes first
        if (externalNodes && externalNodes.find(node => node.id === nodeId)) {
          console.log(`✅ Found node ${nodeId} in externalNodes, updating...`)
          const updatedNodes = updateNodes(externalNodes)
          if (updatedNodes !== externalNodes) {
            externalOnNodesChange(updatedNodes)
            if (onWorkflowChange) {
              onWorkflowChange(updatedNodes, edges)
            }
          }
        } else if (baseNodes.find(node => node.id === nodeId)) {
          console.log(`✅ Found node ${nodeId} in baseNodes, updating...`)
          const updatedNodes = updateNodes(baseNodes)
          if (updatedNodes !== baseNodes) {
            externalOnNodesChange(updatedNodes)
            if (onWorkflowChange) {
              onWorkflowChange(updatedNodes, edges)
            }
          }
        } else {
          console.error(`❌ Node ${nodeId} not found in any node array!`)
          console.log(`📊 externalNodes:`, externalNodes?.map(n => n.id))
          console.log(`📊 baseNodes:`, baseNodes.map(n => n.id))
          console.log(`📊 Looking for nodeId: ${nodeId}`)
          
          // Last resort: try to force update by using the current React Flow nodes
          const reactFlowNodes = (window as any).reactFlowInstance?.getNodes?.()
          if (reactFlowNodes) {
            console.log(`🚨 Attempting fallback update using ReactFlow nodes`)
            const foundNode = reactFlowNodes.find((n: any) => n.id === nodeId)
            if (foundNode) {
              const updatedReactFlowNodes = reactFlowNodes.map((node: any) => 
                node.id === nodeId 
                  ? { ...node, data: { ...node.data, ...updatedData } }
                  : node
              )
              externalOnNodesChange(updatedReactFlowNodes)
              console.log(`✅ Fallback update successful`)
              return
            }
          }
          
          console.error(`❌ All update strategies failed for node ${nodeId}`)
          return
        }
      } else {
        // Update internal state
        setInternalNodes(currentNodes => {
          // Double-check node exists in current state
          if (!currentNodes.find(node => node.id === nodeId)) {
            console.log(`ℹ️ Node ${nodeId} not found in internal nodes, skipping update`)
            return currentNodes
          }
          return updateNodes(currentNodes)
        })
      }
    } catch (error) {
      console.error(`❌ Error updating node ${nodeId}:`, error)
      // Don't throw or cause further errors - just silently fail
    }
  }, [baseNodes, edges, externalOnNodesChange, setInternalNodes, onWorkflowChange])

  // Ensure all nodes have the onNodeUpdate and onNodeDelete callbacks
  useEffect(() => {
    const updateNodesWithCallback = (currentNodes: Node[]) => {
      if (!currentNodes || currentNodes.length === 0) {
        return currentNodes
      }
      
      return currentNodes.map(node => {
        const hasCallbacks = node.data.onNodeUpdate && node.data.onNodeDelete
        if (!hasCallbacks) {
          console.log(`🔧 Adding callbacks to node: ${node.id}`)
        }
        
        // CRITICAL: Preserve existing data when adding callbacks
        const updatedNode = {
          ...node,
          data: {
            ...node.data,
            onNodeUpdate: handleNodeUpdate,
            onNodeDelete: handleNodeDelete
          }
        }
        
        // Debug: Log data preservation
        if (node.data.agentConfig?.instructions) {
          console.log(`🔍 Preserving instructions for node ${node.id}:`, node.data.agentConfig.instructions)
          console.log(`🔍 Updated node data:`, updatedNode.data.agentConfig?.instructions)
        }
        
        return updatedNode
      })
    }

    try {
      // Always update nodes to ensure callbacks are fresh
      if (externalOnNodesChange && externalNodes && externalNodes.length > 0) {
        console.log('🔧 Updating external nodes with callbacks:', externalNodes.length)
        const updatedNodes = updateNodesWithCallback(externalNodes)
        
        // Safety check: ensure we don't lose any nodes
        if (updatedNodes.length !== externalNodes.length) {
          console.error(`❌ Node count mismatch! Original: ${externalNodes.length}, Updated: ${updatedNodes.length}`)
          return // Don't update if we lost nodes
        }
        
        // Only call externalOnNodesChange if something actually changed
        const hasChanges = externalNodes.some((node, index) => 
          !updatedNodes[index]?.data?.onNodeUpdate || !updatedNodes[index]?.data?.onNodeDelete
        )
        
        if (hasChanges) {
          console.log(`🔧 Applying callback updates to ${externalNodes.length} nodes`)
          externalOnNodesChange(updatedNodes)
        }
      } else if (internalNodes.length > 0) {
        console.log('🔧 Updating internal nodes with callbacks:', internalNodes.length)
        const updatedNodes = updateNodesWithCallback(internalNodes)
        
        // Safety check for internal nodes too
        if (updatedNodes.length === internalNodes.length) {
          setInternalNodes(updatedNodes)
        } else {
          console.error(`❌ Internal node count mismatch! Original: ${internalNodes.length}, Updated: ${updatedNodes.length}`)
        }
      }
    } catch (error) {
      console.error('❌ Error updating nodes with callbacks:', error)
      // Don't update anything if there's an error
    }
  }, [externalNodes, internalNodes, handleNodeUpdate, handleNodeDelete, externalOnNodesChange, setInternalNodes])

  // Separate effect to handle when nodes array changes (new nodes added)
  useEffect(() => {
    if (baseNodes.length > 0) {
      console.log('📊 Checking nodes for callbacks:', baseNodes.map(n => ({ 
        id: n.id, 
        hasUpdate: !!n.data.onNodeUpdate, 
        hasDelete: !!n.data.onNodeDelete 
      })))
      
      // Ensure callbacks are present on all nodes
      const needsCallbacks = baseNodes.some(node => 
        !node.data.onNodeUpdate || !node.data.onNodeDelete
      )
      
      if (needsCallbacks && externalOnNodesChange) {
        console.log('🔧 Some nodes missing callbacks, updating...')
        const updatedNodes = baseNodes.map(node => ({
          ...node,
          data: {
            ...node.data,
            onNodeUpdate: node.data.onNodeUpdate || handleNodeUpdate,
            onNodeDelete: node.data.onNodeDelete || handleNodeDelete
          }
        }))
        externalOnNodesChange(updatedNodes)
      }
    }
  }, [baseNodes, handleNodeUpdate, handleNodeDelete, externalOnNodesChange])

  // Handle edge deletion from custom delete button
  const handleEdgeDelete = useCallback((edgeId: string) => {
    console.log('🗑️ Deleting edge via button:', edgeId)
    
    if (externalOnEdgesChange) {
      // Filter out deleted edge and update parent
      const updatedEdges = edges.filter(edge => edge.id !== edgeId)
      externalOnEdgesChange(updatedEdges)
      
      if (onWorkflowChange) {
        onWorkflowChange(baseNodes, updatedEdges)
      }
    } else {
      // Update internal state
      setInternalEdges(currentEdges => 
        currentEdges.filter(edge => edge.id !== edgeId)
      )
    }
  }, [edges, baseNodes, externalOnEdgesChange, setInternalEdges, onWorkflowChange])

  // Handle edge changes  
  const handleEdgesChange = useCallback((changes: any) => {
    console.log('🔄 Edge changes:', changes)
    
    if (externalOnEdgesChange) {
      // Apply changes to external edges using React Flow's utility
      const updatedEdges = applyEdgeChanges(changes, edges)
      console.log('📊 Updated edges after changes:', updatedEdges.map((e: Edge) => ({ id: e.id, selected: e.selected })))
      externalOnEdgesChange(updatedEdges)
      
      if (onWorkflowChange) {
        onWorkflowChange(baseNodes, updatedEdges)
      }
    } else {
      // Use internal state management
      onInternalEdgesChange(changes)
    }
  }, [externalOnEdgesChange, edges, baseNodes, onInternalEdgesChange, onWorkflowChange])

  const onConnect = useCallback(
    (params: Connection) => {
      console.log('🔗 Creating new edge:', params)
      
      if (externalOnEdgesChange) {
        const newEdges = addEdge(params, edges).map(edge => ({
          ...edge,
          selectable: true,
          focusable: true,
        }))
        console.log('🔗 New edges array:', newEdges)
        externalOnEdgesChange(newEdges)
        if (onWorkflowChange) {
          onWorkflowChange(baseNodes, newEdges)
        }
      } else {
        setInternalEdges((eds) => addEdge(params, eds).map(edge => ({
          ...edge,
          selectable: true,
          focusable: true,
        })))
      }
    },
    [edges, baseNodes, externalOnEdgesChange, setInternalEdges, onWorkflowChange],
  )

  const onDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
  }, [])

  // Handle clicking on empty canvas to deselect nodes and edges and reset any stuck drag state
  const onPaneClick = useCallback(() => {
    console.log('🖱️ Pane clicked - deselecting all nodes and edges and resetting drag state')
    
    // Reset any potential stuck drag state
    document.body.style.cursor = ''
    
    // Deselect all nodes
    const updatedNodes = baseNodes.map(node => ({
      ...node,
      selected: false
    }))
    
    // Deselect all edges
    const updatedEdges = edges.map(edge => ({
      ...edge,
      selected: false
    }))
    
    if (externalOnNodesChange && externalOnEdgesChange) {
      externalOnNodesChange(updatedNodes)
      externalOnEdgesChange(updatedEdges)
      if (onWorkflowChange) {
        onWorkflowChange(updatedNodes, updatedEdges)
      }
    } else {
      setInternalNodes(currentNodes => 
        currentNodes.map(node => ({
          ...node,
          selected: false
        }))
      )
      setInternalEdges(currentEdges => 
        currentEdges.map(edge => ({
          ...edge,
          selected: false
        }))
      )
    }
  }, [baseNodes, edges, externalOnNodesChange, externalOnEdgesChange, setInternalNodes, setInternalEdges, onWorkflowChange])

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        // Deselect all nodes on Escape key
        onPaneClick()
        // Also reset any stuck drag state
        if (reactFlowInstance) {
          // Force reset ReactFlow's internal state
          reactFlowInstance.viewportInitialized = true
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [onPaneClick, reactFlowInstance])

  // Simplified drag state management - let ReactFlow handle its own state
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      // Simple global reset without DOM manipulation
      setTimeout(() => {
        document.body.style.cursor = ''
        console.log('🌍 Global mouseup - reset body cursor')
      }, 10)
    }

    const handleGlobalMouseMove = (event: MouseEvent) => {
      // Reset drag state if mouse moves without any buttons pressed
      if (event.buttons === 0) {
        document.body.style.cursor = ''
      }
    }

    document.addEventListener('mouseup', handleGlobalMouseUp)
    document.addEventListener('mousemove', handleGlobalMouseMove)
    
    return () => {
      document.removeEventListener('mouseup', handleGlobalMouseUp)
      document.removeEventListener('mousemove', handleGlobalMouseMove)
    }
  }, [])

  // HTML5 Drag & Drop: Handle dropping nodes FROM sidebar TO canvas
  const onDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault()
      console.log('🟡 HTML5: Drop event on canvas (from sidebar)')

      const reactFlowBounds = reactFlowWrapper.current?.getBoundingClientRect()
      const type = event.dataTransfer.getData('application/reactflow')
      const templateData = event.dataTransfer.getData('application/template')

      if (typeof type === 'undefined' || !type || !reactFlowBounds || !reactFlowInstance) {
        return
      }

      const targetElement = event.target as HTMLElement;
      const nodeElement = targetElement.closest('.react-flow__node') as HTMLElement;
      const droppedOnNodeId = nodeElement?.dataset?.id;
      const droppedOnNode = droppedOnNodeId ? reactFlowInstance.getNode(droppedOnNodeId) : null;

      // Check if it's a Composio tool (JSON format)
      let composioToolData = null
      try {
        const parsedType = JSON.parse(type)
        if (parsedType?.isComposio) {
          composioToolData = parsedType
        }
      } catch {
        // Not JSON, proceed normally
      }

      const position = reactFlowInstance.project({
        x: event.clientX - reactFlowBounds.left,
        y: event.clientY - reactFlowBounds.top,
      })

      // Smart overlap detection with reasonable dimensions
      const adjustedPosition = { ...position }
      const nodeWidth = 250  // Realistic node width
      const nodeHeight = 150 // Realistic node height
      const padding = 50     // Reasonable padding between nodes

      // Only adjust position if there's an actual overlap
      let attempts = 0
      const maxAttempts = 10
      
      while (attempts < maxAttempts) {
        const hasOverlap = nodes.some(node => {
          const dx = Math.abs(node.position.x - adjustedPosition.x)
          const dy = Math.abs(node.position.y - adjustedPosition.y)
          return dx < nodeWidth + padding && dy < nodeHeight + padding
        })

        if (!hasOverlap) break

        // Gentle position adjustments - try to stay near drop location
        if (attempts < 3) {
          // Try small shifts to the right
          adjustedPosition.x += nodeWidth + padding
        } else if (attempts < 6) {
          // Try small shifts down
          adjustedPosition.x = position.x
          adjustedPosition.y += nodeHeight + padding
        } else {
          // Try diagonal with small increments
          adjustedPosition.x = position.x + (attempts - 6) * 100
          adjustedPosition.y = position.y + (attempts - 6) * 80
        }
        attempts++
      }

      // If a Composio tool is dropped on an agent, attach it.
      if (droppedOnNode && droppedOnNode.data.type === 'agent' && composioToolData?.isComposio) {
        const newTool = {
          id: `${composioToolData.toolType}-${Date.now()}`,
          name: composioToolData.label,
          description: composioToolData.description,
          // icon could be added here
        };

        const updatedTools = [...(droppedOnNode.data.tools || []), newTool];
        handleNodeUpdate(droppedOnNode.id, { ...droppedOnNode.data, tools: updatedTools });

        return; // Stop execution to prevent creating a new node
      }

      // Check if we have template data from the new NodePalette
      let nodeData: any
      if (composioToolData) {
        // Handle Composio tools
        nodeData = {
          label: composioToolData.label,
          type: 'tool',
          tool_type: composioToolData.toolType,
          name: `${composioToolData.label.replace(/\s+/g, '_')}_${nodes.length + 1}`,
          description: composioToolData.description,
          category: composioToolData.category,
          isComposio: true,
          onNodeUpdate: handleNodeUpdate,
          onNodeDelete: handleNodeDelete
        }
      } else if (templateData) {
        try {
          const template = JSON.parse(templateData)
          // Use template data with unique name suffix
          nodeData = {
            ...template.defaultData,
            label: template.name,
            name: `${template.defaultData.name}_${nodes.length + 1}`,
            onNodeUpdate: handleNodeUpdate,
            onNodeDelete: handleNodeDelete
          }
        } catch (error) {
          console.warn('Failed to parse template data, falling back to defaults:', error)
          nodeData = getNodeDefaults(composioToolData ? 'tool' : type)
        }
      } else {
        // Fallback to old behavior for legacy sidebar
        nodeData = getNodeDefaults(composioToolData ? 'tool' : type)
      }

      // Enhanced node data based on type (fallback function)
      function getNodeDefaults(nodeType: string) {
        switch (nodeType) {
          case 'agent':
            return {
              label: 'AI Agent',
              type: nodeType,
              model_id: 'gpt-4o-mini',
              instructions: 'You are a helpful AI assistant. Process the input data and provide useful insights.',
              name: `Agent_${nodes.length + 1}`,
              description: 'An AI agent that processes data and generates responses',
              onNodeUpdate: handleNodeUpdate,
              onNodeDelete: handleNodeDelete
            }
          case 'tool':
            return {
              label: 'Tool',
              type: nodeType,
              tool_type: 'web_search',
              name: `Tool_${nodes.length + 1}`,
              description: 'A tool that performs specific operations on data',
              onNodeUpdate: handleNodeUpdate,
              onNodeDelete: handleNodeDelete
            }
          case 'input':
            return {
              label: 'Input',
              type: nodeType,
              name: `Input_${nodes.length + 1}`,
              description: 'Receives and validates input data for the workflow',
              onNodeUpdate: handleNodeUpdate,
              onNodeDelete: handleNodeDelete
            }
          case 'output':
            return {
              label: 'Output',
              type: nodeType,
              name: `Output_${nodes.length + 1}`,
              description: 'Formats and presents the final workflow results',
              onNodeUpdate: handleNodeUpdate,
              onNodeDelete: handleNodeDelete
            }
          default:
            return {
              label: `${nodeType} Node`,
              type: nodeType,
              name: `Node_${nodes.length + 1}`,
              description: 'A workflow node',
              onNodeUpdate: handleNodeUpdate,
              onNodeDelete: handleNodeDelete
            }
        }
      }

      const newNode: Node = {
        id: `${nodeData.name}-${Date.now()}`, // Use node name + timestamp for unique IDs
        type: 'agent', // All nodes use the same component now
        position: adjustedPosition,
        data: nodeData,
        // Remove draggable: true to let ReactFlow handle dragging
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
    [reactFlowInstance, baseNodes, edges, externalOnNodesChange, setInternalNodes, onWorkflowChange, handleNodeUpdate, handleNodeDelete],
  )

  // Use baseNodes directly to avoid circular dependency issues
  const nodes = baseNodes
  
  // Ensure all edges have the onEdgeDelete callback and are selectable
  const edgesWithCallbacks = edges.map(edge => ({
    ...edge,
    selectable: true,
    focusable: true,
    data: {
      ...edge.data,
      onEdgeDelete: handleEdgeDelete
    }
  }))

  const executeWorkflow = async () => {
    console.log('🚀🚀🚀 EXECUTE WORKFLOW BUTTON CLICKED! 🚀🚀🚀')
    console.log('Current nodes:', nodes.length)
    console.log('Current input data:', inputData)
    
    if (nodes.length === 0) {
      console.log('❌ No nodes found, showing alert')
      alert('Please add some nodes to your workflow first')
      return
    }

    // Get user context from localStorage
    let userContext = undefined
    try {
      const userSettings = localStorage.getItem('userSettings')
      if (userSettings) {
        const settings = JSON.parse(userSettings)
        userContext = {
          userId: settings.userId,
          composioApiKey: settings.composioApiKey,
          enabledTools: settings.enabledTools || [],
          preferences: settings.preferences || {}
        }
        console.log('👤 User context loaded:', {
          userId: userContext.userId,
          hasApiKey: !!userContext.composioApiKey,
          enabledToolsCount: userContext.enabledTools.length
        })
      }
    } catch (error) {
      console.error('Failed to load user context:', error)
    }

    console.log('✅ Starting workflow execution...')
    setIsExecuting(true)
    setExecutionResult(null)

    try {
      let workflowDefinition: any;
      
      // Use existing workflow identity if available, otherwise generate new one
      if (currentWorkflowIdentity) {
        console.log(`🎯 Using existing workflow identity: "${currentWorkflowIdentity.name}"`)
        workflowDefinition = {
          identity: currentWorkflowIdentity,
          nodes,
          edges,
          metadata: {
            node_count: nodes.length,
            edge_count: edges.length,
            agent_count: nodes.filter(n => n.data?.type === 'agent').length,
            tool_count: nodes.filter(n => n.data?.type === 'tool').length,
            input_count: nodes.filter(n => n.data?.type === 'input').length,
            output_count: nodes.filter(n => n.data?.type === 'output').length,
            complexity_score: Math.min(nodes.length + edges.length, 10),
            estimated_cost: 0
          }
        }
      } else {
        // Let backend handle all AI naming for better reliability
        console.log('🏷️ Letting backend generate intelligent workflow identity...')
        workflowDefinition = {
          identity: null, // Backend will generate this using AI
          nodes,
          edges,
          metadata: {
            node_count: nodes.length,
            edge_count: edges.length,
            agent_count: nodes.filter(n => n.data?.type === 'agent').length,
            tool_count: nodes.filter(n => n.data?.type === 'tool').length,
            input_count: nodes.filter(n => n.data?.type === 'input').length,
            output_count: nodes.filter(n => n.data?.type === 'output').length,
            complexity_score: Math.min(nodes.length + edges.length, 10),
            estimated_cost: 0
          }
        }
      }

      const workflowName = workflowDefinition.identity?.name || 'Unnamed Workflow'
      console.log(`🚀 Executing workflow: "${workflowName}"`)
      
      // Convert to the format expected by the execution service
      const workflow = WorkflowService.convertToWorkflowDefinition(nodes, edges)
      
      console.log('📤 Sending to backend:', {
        workflow: {
          nodes: workflow.nodes.map(n => ({ id: n.id, type: n.type, data: n.data })),
          edges: workflow.edges
        },
        input_data: inputData,
        framework: 'openai'
      })
      
      // Execute with workflow identity context (if available)
      const result = await WorkflowService.executeWorkflow({
        workflow,
        input_data: inputData,
        framework: 'openai',
        // Add workflow identity context if available, otherwise let backend generate it
        workflow_identity: workflowDefinition.identity,
        workflow_name: workflowDefinition.identity?.name,
        // Include user context for per-user tool execution
        userContext: userContext || undefined
      })
      
      console.log('📥 Backend response:', {
        execution_id: result.execution_id,
        status: result.status,
        hasResult: !!result.result,
        hasTrace: !!result.trace,
        hasError: !!result.error,
        fullResult: result
      })

      // Update execution statistics (if identity is available)
      if (workflowDefinition.identity) {
        if (result.status === 'completed') {
          WorkflowManager.updateExecutionStats(workflowDefinition.identity.id, true)
        } else if (result.status === 'failed') {
          WorkflowManager.updateExecutionStats(workflowDefinition.identity.id, false)
        }
      }

      const finalResult = {
        ...result,
        workflow_name: workflowDefinition.identity?.name || result.workflow_name,
        workflow_id: workflowDefinition.identity?.id || result.workflow_id
      }

      setExecutionResult(finalResult)

      // Save to localStorage for evaluation assistant dynamic pills
      try {
        const recentExecutions = JSON.parse(localStorage.getItem('recentWorkflowExecutions') || '[]')
        
        const executionData = {
          execution_id: result.execution_id,
          workflow_name: workflowDefinition.identity?.name || result.workflow_name || 'Unnamed Workflow',
          workflow_category: workflowDefinition.identity?.category || 'general',
          workflow_description: workflowDefinition.identity?.description || 'A workflow',
          workflow: workflow,
          input_data: inputData,
          created_at: Date.now(),
          status: result.status
        }
        
        // Add to front of array and keep only last 10
        recentExecutions.unshift(executionData)
        const trimmedExecutions = recentExecutions.slice(0, 10)
        
        localStorage.setItem('recentWorkflowExecutions', JSON.stringify(trimmedExecutions))
        console.log(`💾 Saved execution to localStorage: "${executionData.workflow_name}"`)
      } catch (error) {
        console.error('Failed to save execution to localStorage:', error)
      }
      
      // If execution is still running, start progress tracking
      if (result.status === 'running') {
        console.log(`🚀 Execution started for "${workflowName}":`, result.execution_id)
        console.log('📊 Starting progress tracking with nodes:', baseNodes.map(n => ({ id: n.id, type: n.data.type, name: n.data.name })))
        
        // Start progress tracking with WebSocket
        const nodeIds = baseNodes.map(node => node.id)
        console.log('🔌 Initiating WebSocket connection for execution:', result.execution_id)
        startExecution(result.execution_id, nodeIds)
      } else {
        console.log('⚠️ Execution completed immediately, no progress tracking needed')
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
    // Stop execution using the context
    contextStopExecution()
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

  // Add example workflow templates
  const addExampleWorkflow = (workflowType: 'research' | 'analysis' | 'content') => {
    const workflows = {
      research: {
        nodes: [
          {
            id: 'input-1',
            type: 'agent',
            position: { x: 100, y: 100 },
            data: { 
              label: 'Research Topic', 
              type: 'input',
              description: 'Starting input for research',
              name: 'ResearchInput'
            }
          },
          {
            id: 'agent-1', 
            type: 'agent',
            position: { x: 600, y: 100 },
            data: {
              label: 'Information Gatherer',
              type: 'agent',
              model_id: 'gpt-4',
              instructions: 'You are a research specialist. Gather comprehensive information about the given topic. Focus on finding key facts, recent developments, and authoritative sources.',
              name: 'InfoGatherer',
              description: 'Researches and gathers information on the given topic'
            }
          },
          {
            id: 'tool-1',
            type: 'agent', 
            position: { x: 1100, y: 100 },
            data: { 
              label: 'Web Search', 
              type: 'tool',
              tool_type: 'web_search',
              name: 'WebSearchTool',
              description: 'Searches the web for relevant information'
            }
          },
          {
            id: 'agent-2',
            type: 'agent',
            position: { x: 1600, y: 100 },
            data: {
              label: 'Research Synthesizer',
              type: 'agent',
              model_id: 'gpt-4',
              instructions: 'You are an expert analyst. Synthesize the gathered information into a comprehensive research report with key findings, insights, and conclusions.',
              name: 'ResearchSynthesizer',
              description: 'Analyzes and synthesizes research findings into a comprehensive report'
            }
          },
          {
            id: 'output-1',
            type: 'agent',
            position: { x: 2100, y: 100 },
            data: { 
              label: 'Research Report', 
              type: 'output',
              name: 'ResearchOutput',
              description: 'Final research report with findings and insights'
            }
          }
        ],
        edges: [
          { id: 'e1', source: 'input-1', target: 'agent-1' },
          { id: 'e2', source: 'agent-1', target: 'tool-1' },
          { id: 'e3', source: 'tool-1', target: 'agent-2' },
          { id: 'e4', source: 'agent-2', target: 'output-1' }
        ]
      },
      analysis: {
        nodes: [
          {
            id: 'input-1',
            type: 'agent',
            position: { x: 50, y: 300 },
            data: { 
              label: 'Data Input', 
              type: 'input',
              description: 'Raw data to analyze',
              name: 'DataInput'
            }
          },
          {
            id: 'agent-1',
            type: 'agent', 
            position: { x: 450, y: 100 },
            data: {
              label: 'Data Cleaner',
              type: 'agent',
              model_id: 'gpt-3.5-turbo',
              instructions: 'Clean and preprocess the input data. Remove inconsistencies, handle missing values, and format for analysis.',
              name: 'DataCleaner',
              description: 'Cleans and preprocesses raw data for analysis'
            }
          },
          {
            id: 'agent-2',
            type: 'agent',
            position: { x: 450, y: 500 },
            data: {
              label: 'Pattern Analyzer', 
              type: 'agent',
              model_id: 'gpt-4',
              instructions: 'Analyze the data for patterns, trends, and insights. Identify key metrics and statistical relationships.',
              name: 'PatternAnalyzer',
              description: 'Identifies patterns and trends in the data'
            }
          },
          {
            id: 'agent-3',
            type: 'agent',
            position: { x: 850, y: 300 },
            data: {
              label: 'Report Generator',
              type: 'agent',
              model_id: 'gpt-4',
              instructions: 'Generate a comprehensive analysis report combining the cleaned data and pattern analysis. Include visualizations suggestions and actionable insights.',
              name: 'ReportGenerator',
              description: 'Generates comprehensive analysis reports with insights'
            }
          },
          {
            id: 'output-1',
            type: 'agent',
            position: { x: 1250, y: 300 },
            data: { 
              label: 'Analysis Report', 
              type: 'output',
              name: 'AnalysisOutput',
              description: 'Final analysis report with insights and recommendations'
            }
          }
        ],
        edges: [
          { id: 'e1', source: 'input-1', target: 'agent-1' },
          { id: 'e2', source: 'input-1', target: 'agent-2' },
          { id: 'e3', source: 'agent-1', target: 'agent-3' },
          { id: 'e4', source: 'agent-2', target: 'agent-3' },
          { id: 'e5', source: 'agent-3', target: 'output-1' }
        ]
      },
      content: {
        nodes: [
          {
            id: 'input-1',
            type: 'agent',
            position: { x: 50, y: 300 },
            data: { 
              label: 'Content Brief', 
              type: 'input',
              description: 'Content requirements and topic',
              name: 'ContentBrief'
            }
          },
          {
            id: 'tool-1',
            type: 'agent',
            position: { x: 450, y: 300 },
            data: { 
              label: 'Research', 
              type: 'tool',
              tool_type: 'web_search',
              name: 'ContentResearch',
              description: 'Researches content topics and trends'
            }
          },
          {
            id: 'agent-1',
            type: 'agent',
            position: { x: 850, y: 100 },
            data: {
              label: 'Content Planner',
              type: 'agent',
              model_id: 'gpt-4',
              instructions: 'Create a detailed content outline based on the brief and research. Include key points, structure, and messaging strategy.',
              name: 'ContentPlanner',
              description: 'Plans and outlines content structure and strategy'
            }
          },
          {
            id: 'agent-2',
            type: 'agent',
            position: { x: 850, y: 500 },
            data: {
              label: 'Content Writer',
              type: 'agent',
              model_id: 'gpt-4',
              instructions: 'Write high-quality content following the outline. Ensure engaging, informative, and well-structured content that meets the brief requirements.',
              name: 'ContentWriter',
              description: 'Writes high-quality content based on the plan'
            }
          },
          {
            id: 'agent-3',
            type: 'agent',
            position: { x: 1250, y: 300 },
            data: {
              label: 'Content Reviewer',
              type: 'agent',
              model_id: 'gpt-4',
              instructions: 'Review and refine the content for clarity, engagement, and quality. Suggest improvements and ensure it meets professional standards.',
              name: 'ContentReviewer',
              description: 'Reviews and refines content for quality and engagement'
            }
          },
          {
            id: 'output-1',
            type: 'agent',
            position: { x: 1650, y: 300 },
            data: { 
              label: 'Final Content', 
              type: 'output',
              name: 'ContentOutput',
              description: 'Polished, high-quality content ready for publication'
            }
          }
        ],
        edges: [
          { id: 'e1', source: 'input-1', target: 'tool-1' },
          { id: 'e2', source: 'tool-1', target: 'agent-1' },
          { id: 'e3', source: 'tool-1', target: 'agent-2' },
          { id: 'e4', source: 'agent-1', target: 'agent-2' },
          { id: 'e5', source: 'agent-2', target: 'agent-3' },
          { id: 'e6', source: 'agent-3', target: 'output-1' }
        ]
      }
    }
    
    const workflow = workflows[workflowType]
    
    // Add onNodeUpdate and onNodeDelete callbacks to all nodes
    const nodesWithCallbacks = workflow.nodes.map(node => ({
      ...node,
      data: {
        ...node.data,
        onNodeUpdate: handleNodeUpdate,
        onNodeDelete: handleNodeDelete
      }
      // Remove draggable: true to let ReactFlow handle dragging
    }))
    
    setInternalNodes(nodesWithCallbacks)
    setInternalEdges(workflow.edges)
  }

  return (
    <div className="h-full w-full bg-slate-50 flex">
      {/* Left Sidebar - Manual Mode Node Palette or Legacy Sidebar */}
      {useManualMode ? (
        <NodePalette />
      ) : (
        <Sidebar />
      )}
      
      <div className="flex-1 h-full" ref={reactFlowWrapper}>
        <ReactFlow
          nodes={nodes}
          edges={edgesWithCallbacks}
          onNodesChange={handleNodesChange}
          onEdgesChange={handleEdgesChange}
          onConnect={onConnect}
          onInit={setReactFlowInstance}
          onDrop={onDrop}
          onDragOver={onDragOver}
          onPaneClick={onPaneClick}
          onNodesDelete={handleNodesDelete}
          onEdgeClick={(event, edge) => {
            console.log('🔵 Edge clicked:', edge.id, 'selected:', edge.selected)
          }}
          onPaneMouseMove={(event) => {
            // Reset drag state if pane is hovered with no buttons pressed
            if (event.buttons === 0) {
              document.body.style.cursor = ''
            }
          }}
          onNodeDragStart={(event, node) => {
            console.log('🟢 ReactFlow: Node drag started:', node.id)
          }}
          onNodeDrag={(event, node) => {
            console.log('🔄 ReactFlow: Node dragging:', node.id)
          }}
          onNodeDragStop={(event, node) => {
            console.log('🔴 ReactFlow: Node drag stopped:', node.id)
            
            // Simple cleanup - let ReactFlow handle its own state
            setTimeout(() => {
              document.body.style.cursor = ''
              console.log('✅ Drag complete - reset body cursor')
            }, 50)
          }}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          nodesDraggable={true}
          nodesConnectable={true}
          elementsSelectable={true}
          edgesFocusable={true}
          selectNodesOnDrag={false}
          panOnDrag={true}
          panOnScroll={false}
          zoomOnScroll={true}
          zoomOnDoubleClick={false}
          minZoom={0.1}
          maxZoom={5}
          fitView
          deleteKeyCode="Delete"
          className="bg-gradient-to-br from-slate-50 to-blue-50 workflow-editor"
        >
          <Background color="#e2e8f0" />
          <Controls className="bg-white border border-slate-200 shadow-sm" />
          
          {/* Mode Toggle - Top Left */}
          <Panel position="top-left" className="bg-white/95 backdrop-blur-sm p-3 rounded-xl shadow-lg border border-slate-200 w-72 z-50">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-7 h-7 bg-blue-100 rounded-lg flex items-center justify-center">
                <Settings className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-900">Workflow Mode</h3>
                <p className="text-xs text-slate-600">Choose how to build your workflow</p>
              </div>
            </div>
            
            <div className="space-y-2">
              {/* AI Mode Toggle */}
              <button
                onClick={() => handleManualModeChange(false)}
                className={`w-full flex items-center gap-3 p-3 rounded-lg text-left transition-all ${
                  !useManualMode 
                    ? 'bg-blue-50 border-2 border-blue-200 text-blue-900' 
                    : 'bg-white border-2 border-slate-200 hover:border-slate-300 text-slate-700'
                }`}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                  !useManualMode ? 'bg-blue-100' : 'bg-slate-100'
                }`}>
                  <Brain className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-medium">AI Assistant Mode</h4>
                  <p className="text-xs opacity-80">Let AI create workflows from descriptions</p>
                </div>
                <div className="flex items-center justify-center w-4 h-4 flex-shrink-0">
                  {!useManualMode && (
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  )}
                </div>
              </button>
              
              {/* Manual Mode Toggle */}
              <button
                onClick={() => handleManualModeChange(true)}
                className={`w-full flex items-center gap-3 p-3 rounded-lg text-left transition-all ${
                  useManualMode 
                    ? 'bg-green-50 border-2 border-green-200 text-green-900' 
                    : 'bg-white border-2 border-slate-200 hover:border-slate-300 text-slate-700'
                }`}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                  useManualMode ? 'bg-green-100' : 'bg-slate-100'
                }`}>
                  <Settings className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-medium">Manual Design Mode</h4>
                  <p className="text-xs opacity-80">Drag to move • Click 🗑️ or select + Delete key to remove • ESC to deselect</p>
                </div>
                <div className="flex items-center justify-center w-4 h-4 flex-shrink-0">
                  {useManualMode && (
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  )}
                </div>
              </button>
            </div>
            
            {/* Quick Actions */}
            <div className="mt-4 pt-3 border-t border-slate-200">
              <button
                onClick={() => {
                  console.log('🔄 Manual clear selection and reset drag state clicked')
                  // Clear selection
                  onPaneClick()
                  
                  // Force reset any stuck drag state
                  document.body.style.cursor = ''
                  document.documentElement.style.cursor = ''
                  
                  // Reset ReactFlow instance if available
                  if (reactFlowInstance) {
                    reactFlowInstance.viewportInitialized = true
                  }
                  
                  console.log('✅ Manual reset complete')
                }}
                className="w-full px-3 py-2 text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors flex items-center gap-2"
              >
                <X className="w-4 h-4" />
                Clear Selection & Reset
              </button>
            </div>
          </Panel>
          

          
          {/* Floating Execution Panel - Top Right */}
          <Panel position="top-right" className="bg-white/95 backdrop-blur-sm p-4 rounded-xl shadow-lg border border-slate-200 w-80 z-50">
            {/* Execution Progress Display */}
            {executionState && (
              <div className="mb-3 p-3 bg-blue-50/50 border border-blue-200 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-blue-900">Execution Progress</span>
                  <span className="text-sm text-blue-600">{Math.round(executionState.progress)}%</span>
                </div>
                <div className="w-full bg-blue-200 rounded-full h-2 mb-2">
                  <div 
                    className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${executionState.progress}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-xs text-blue-600">
                  <span>{Array.from(executionState.nodes.values()).filter(s => s.status === 'completed').length}/{executionState.nodes.size} nodes</span>
                </div>
              </div>
            )}
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

            {/* Workflow Identity Display */}
            {currentWorkflowIdentity && (
              <div className="mb-3 p-3 bg-blue-50/50 border border-blue-200 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span className="text-sm font-medium text-blue-900">
                    {currentWorkflowIdentity.name}
                  </span>
                  <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">
                    {currentWorkflowIdentity.category}
                  </span>
                </div>
                <p className="text-xs text-blue-700 leading-relaxed">
                  {currentWorkflowIdentity.description}
                </p>
                <div className="flex items-center gap-3 mt-2 text-xs text-blue-600">
                  <span>v{currentWorkflowIdentity.version}</span>
                  <span>•</span>
                  <span>{currentWorkflowIdentity.execution_count} executions</span>
                  {currentWorkflowIdentity.last_executed && (
                    <>
                      <span>•</span>
                      <span>Last: {new Date(currentWorkflowIdentity.last_executed).toLocaleDateString()}</span>
                    </>
                  )}
                </div>
              </div>
            )}

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

            {/* Node count indicator */}
            <div className="mt-2 text-xs text-slate-500 text-center">
              {nodes.length === 0 ? 'Add nodes to enable execution' : `${nodes.length} nodes ready`}
            </div>

            {/* Quick Results Preview */}
            {executionResult && (
              <div className="mt-3 p-3 bg-slate-50 rounded-lg border">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-slate-700">Results:</span>
                    {executionResult.workflow_name && (
                      <span className="text-xs text-blue-600 font-medium">
                        {executionResult.workflow_name}
                      </span>
                    )}
                  </div>
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
                  {executionResult.result ? formatResultText(executionResult.result).substring(0, 150) + '...' : 
                   executionResult.error ? `Error: ${executionResult.error}` : 'No result available'}
                </div>
              </div>
            )}
          </Panel>
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

export default function WorkflowEditor(props: WorkflowEditorProps) {
  const [receivedWorkflowIdentity, setReceivedWorkflowIdentity] = useState<any>(null)
  
  return (
    <ExecutionProvider
      onExecutionComplete={(result) => {
        console.log('✅ Execution completed:', result)
      }}
      onExecutionError={(error) => {
        console.error('❌ Execution failed:', error)
      }}
      onNodeStatusChange={(nodeId, status) => {
        console.log(`📍 Node ${nodeId} status changed to: ${status}`)
      }}
      onWorkflowIdentityReceived={(identity) => {
        console.log('🏷️ Workflow identity received from backend:', identity)
        setReceivedWorkflowIdentity(identity)
      }}
    >
      <WorkflowEditorInner {...props} receivedWorkflowIdentity={receivedWorkflowIdentity} />
    </ExecutionProvider>
  )
} 