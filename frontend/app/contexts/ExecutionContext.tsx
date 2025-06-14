'use client'

import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react'
import { WorkflowService } from '../services/workflow'
import { WorkflowExecutionState, NodeExecutionState, NodeExecutionStatus } from '../types/workflow'

// Helper function to map backend node status to frontend status
function mapBackendStatusToFrontend(backendStatus: string): NodeExecutionStatus {
  switch (backendStatus) {
    case 'pending':
      return 'idle'
    case 'running':
      return 'running'
    case 'completed':
      return 'completed'
    case 'failed':
      return 'failed'
    case 'waiting_for_input':
      return 'waiting_for_input'
    default:
      return 'idle'
  }
}

interface ExecutionContextType {
  executionState: WorkflowExecutionState | null
  isExecuting: boolean
  activeEdgeIds: Set<string>
  startExecution: (executionId: string, nodeIds: string[]) => void
  stopExecution: () => void
  resetExecution: () => void
  getNodeExecutionState: (nodeId: string) => NodeExecutionState | undefined
  updateNodeStatus: (nodeId: string, update: Partial<NodeExecutionState>) => void
  submitUserInput: (inputText: string) => Promise<void>
}

const ExecutionContext = createContext<ExecutionContextType | undefined>(undefined)

export function useExecutionContext() {
  const context = useContext(ExecutionContext)
  if (context === undefined) {
    throw new Error('useExecutionContext must be used within an ExecutionProvider')
  }
  return context
}

interface ExecutionProviderProps {
  children: React.ReactNode
  onExecutionComplete?: (result: any) => void
  onExecutionError?: (error: string) => void
  onNodeStatusChange?: (nodeId: string, status: NodeExecutionStatus) => void
  onWorkflowIdentityReceived?: (identity: any) => void
}

export function ExecutionProvider({ 
  children, 
  onExecutionComplete, 
  onExecutionError, 
  onNodeStatusChange,
  onWorkflowIdentityReceived
}: ExecutionProviderProps) {
  const [executionState, setExecutionState] = useState<WorkflowExecutionState | null>(null)
  const [isExecuting, setIsExecuting] = useState(false)
  const [activeEdgeIds, setActiveEdgeIds] = useState<Set<string>>(new Set())
  const websocketRef = useRef<WebSocket | { close: () => void } | null>(null)

  // Initialize execution state for a new workflow
  const initializeExecution = useCallback((executionId: string, nodeIds: string[]) => {
    const nodeStates = new Map<string, NodeExecutionState>()
    
    // Initialize all nodes as idle
    nodeIds.forEach(nodeId => {
      nodeStates.set(nodeId, {
        status: 'idle'
      })
    })

    setExecutionState({
      id: executionId,
      status: 'idle',
      nodes: nodeStates,
      startTime: Date.now(),
      totalCost: 0,
      progress: 0,
      pendingInput: false
    })
    setActiveEdgeIds(new Set())
  }, [])

  // Update node execution status
  const updateNodeStatus = useCallback((nodeId: string, update: Partial<NodeExecutionState>) => {
    setExecutionState(prev => {
      if (!prev) return prev

      const newNodeStates = new Map(prev.nodes)
      const currentState = newNodeStates.get(nodeId) || { status: 'idle' }
      const updatedState = { ...currentState, ...update }
      newNodeStates.set(nodeId, updatedState)

      // Calculate overall progress
      const totalNodes = newNodeStates.size
      const completedNodes = Array.from(newNodeStates.values()).filter(
        state => state.status === 'completed' || state.status === 'failed'
      ).length
      const progress = totalNodes > 0 ? (completedNodes / totalNodes) * 100 : 0

      // Calculate total cost
      const totalCost = Array.from(newNodeStates.values()).reduce(
        (sum, state) => sum + (state.cost || 0), 0
      )

      // Determine overall status
      const hasRunning = Array.from(newNodeStates.values()).some(state => state.status === 'running')
      const hasFailed = Array.from(newNodeStates.values()).some(state => state.status === 'failed')
      const allCompleted = Array.from(newNodeStates.values()).every(
        state => state.status === 'completed' || state.status === 'failed'
      )

      let overallStatus: 'idle' | 'running' | 'completed' | 'failed' | 'waiting_for_input' = prev.status
      if (hasRunning) {
        overallStatus = 'running'
      } else if (allCompleted) {
        overallStatus = hasFailed ? 'failed' : 'completed'
      }

      return {
        ...prev,
        nodes: newNodeStates,
        progress,
        totalCost,
        status: overallStatus
      }
    })

    // Trigger callback
    if (onNodeStatusChange && update.status) {
      onNodeStatusChange(nodeId, update.status)
    }
  }, [onNodeStatusChange])

  // Start execution and set up WebSocket connection
  const startExecution = useCallback((executionId: string, nodeIds: string[]) => {
    setIsExecuting(true)
    initializeExecution(executionId, nodeIds)

    // Set all nodes to pending initially
    nodeIds.forEach(nodeId => {
      updateNodeStatus(nodeId, { status: 'pending' })
    })

    // Set up WebSocket connection for real-time updates
    const ws = WorkflowService.createExecutionWebSocket(
      executionId,
      (data) => {
        console.log('📡 WebSocket message received:', data)
        
        // Handle input request messages
        if (data.type === 'input_request') {
          console.log('📝 Input request received:', data.input_request)
          setExecutionState(prev => prev ? {
            ...prev,
            status: 'waiting_for_input',
            pendingInput: true,
            inputRequest: {
              question: data.input_request.question,
              timestamp: data.input_request.timestamp
            },
            currentActivity: `Waiting for user input: ${data.input_request.question}`
          } : prev)
          return
        }
        
        // NEW: Handle path_taken message
        if (data.type === 'path_taken') {
          console.log('🛤️ Path taken message received:', data.edge_id);
          setActiveEdgeIds(prev => new Set(prev).add(data.edge_id));
          return;
        }
        
        // Handle input received confirmation
        if (data.type === 'input_received') {
          console.log('✅ Input received confirmation:', data.user_input)
          setExecutionState(prev => prev ? {
            ...prev,
            status: 'running',
            pendingInput: false,
            inputRequest: undefined,
            currentActivity: 'Processing user input...'
          } : prev)
          return
        }
        
        // Parse execution updates and map to node states
        if (data.status === 'running' && data.progress) {
          // Update individual node status from backend progress data
          const nodeStatusMap = data.progress.node_status || {}
          
          Object.keys(nodeStatusMap).forEach(nodeId => {
            const backendNodeStatus = nodeStatusMap[nodeId]
            const frontendStatus = mapBackendStatusToFrontend(backendNodeStatus.status)
            
            updateNodeStatus(nodeId, {
              status: frontendStatus,
              startTime: frontendStatus === 'running' ? Date.now() : undefined,
              endTime: ['completed', 'failed'].includes(frontendStatus) ? Date.now() : undefined,
              progress: data.progress.percentage || 0
            })
          })
          
          // Update overall execution state
          setExecutionState(prev => prev ? {
            ...prev,
            progress: data.progress.percentage || 0,
            currentActivity: data.progress.current_activity || 'Processing...'
          } : prev)
          
          // Trigger workflow identity update if we have it
          if (data.workflow_identity && data.workflow_identity.name && data.workflow_identity.name !== 'Unknown Workflow') {
            console.log('🏷️ Received workflow identity via WebSocket:', data.workflow_identity)
            if (onWorkflowIdentityReceived) {
              onWorkflowIdentityReceived(data.workflow_identity)
            }
          }
          
        } else if (data.status === 'completed') {
          // Mark all nodes as completed
          nodeIds.forEach(nodeId => {
            updateNodeStatus(nodeId, {
              status: 'completed',
              endTime: Date.now()
            })
          })
          
          // Update execution state with final result and workflow info
          setExecutionState(prev => prev ? {
            ...prev,
            status: 'completed',
            progress: 100,
            currentActivity: 'Completed successfully'
          } : prev)
          
          setIsExecuting(false)
          if (onExecutionComplete) {
            // Pass the complete data including workflow identity and result
            onExecutionComplete({
              ...data,
              // Ensure result is included for display
              result: data.result || data.trace?.final_output,
              // Include workflow identity info for UI updates
              workflow_identity: data.workflow_identity,
              workflow_name: data.workflow_name,
              workflow_category: data.workflow_category,
              workflow_description: data.workflow_description
            })
          }
        } else if (data.status === 'failed') {
          // Mark failed nodes based on backend data
          if (data.progress && data.progress.node_status) {
            Object.keys(data.progress.node_status).forEach(nodeId => {
              const backendNodeStatus = data.progress.node_status[nodeId]
              if (backendNodeStatus.status === 'failed') {
                updateNodeStatus(nodeId, {
                  status: 'failed',
                  endTime: Date.now(),
                  error: data.error
                })
              }
            })
          }
          
          setIsExecuting(false)
          if (onExecutionError) {
            onExecutionError(data.error || 'Execution failed')
          }
        }
      },
      (error) => {
        console.error('WebSocket error:', error)
        setIsExecuting(false)
        if (onExecutionError) {
          onExecutionError('WebSocket connection failed')
        }
      },
      (event) => {
        console.log('WebSocket closed:', event.code, event.reason)
        websocketRef.current = null
      }
    )

    websocketRef.current = ws
  }, [initializeExecution, updateNodeStatus, onExecutionComplete, onExecutionError, executionState])

  // Stop execution and cleanup
  const stopExecution = useCallback(() => {
    setIsExecuting(false)
    
    if (websocketRef.current) {
      websocketRef.current.close()
      websocketRef.current = null
    }

    // Mark any running nodes as stopped
    if (executionState) {
      executionState.nodes.forEach((state, nodeId) => {
        if (state.status === 'running') {
          updateNodeStatus(nodeId, {
            status: 'failed',
            endTime: Date.now(),
            error: 'Execution stopped by user'
          })
        }
      })
    }
  }, [executionState, updateNodeStatus])

  // Get execution state for a specific node
  const getNodeExecutionState = useCallback((nodeId: string): NodeExecutionState | undefined => {
    return executionState?.nodes.get(nodeId)
  }, [executionState])

  // Submit user input for the current execution
  const submitUserInput = useCallback(async (inputText: string) => {
    if (!executionState?.id) {
      throw new Error('No active execution to submit input to')
    }
    
    try {
      await WorkflowService.submitUserInput(executionState.id, inputText)
      console.log('✅ User input submitted via context')
    } catch (error) {
      console.error('❌ Failed to submit user input via context:', error)
      throw error
    }
  }, [executionState?.id])

  // Reset execution state
  const resetExecution = useCallback(() => {
    stopExecution()
    setExecutionState(null)
    setActiveEdgeIds(new Set())
  }, [stopExecution])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (websocketRef.current) {
        websocketRef.current.close()
      }
    }
  }, [])

  const value: ExecutionContextType = {
    executionState,
    isExecuting,
    activeEdgeIds,
    startExecution,
    stopExecution,
    resetExecution,
    getNodeExecutionState,
    updateNodeStatus,
    submitUserInput
  }

  return (
    <ExecutionContext.Provider value={value}>
      {children}
    </ExecutionContext.Provider>
  )
} 