'use client'

import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react'
import { WorkflowService } from '../services/workflow'
import { WorkflowExecutionState, NodeExecutionState, NodeExecutionStatus } from '../types/workflow'

interface ExecutionContextType {
  executionState: WorkflowExecutionState | null
  isExecuting: boolean
  startExecution: (executionId: string, nodeIds: string[]) => void
  stopExecution: () => void
  resetExecution: () => void
  getNodeExecutionState: (nodeId: string) => NodeExecutionState | undefined
  updateNodeStatus: (nodeId: string, update: Partial<NodeExecutionState>) => void
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
}

export function ExecutionProvider({ 
  children, 
  onExecutionComplete, 
  onExecutionError, 
  onNodeStatusChange 
}: ExecutionProviderProps) {
  const [executionState, setExecutionState] = useState<WorkflowExecutionState | null>(null)
  const [isExecuting, setIsExecuting] = useState(false)
  const websocketRef = useRef<WebSocket | null>(null)

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
      progress: 0
    })
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

      let overallStatus: 'idle' | 'running' | 'completed' | 'failed' = prev.status
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
        
        // Parse execution updates and map to node states
        if (data.status === 'running') {
          // Set first node to running (simplified for Phase 1)
          if (nodeIds.length > 0) {
            updateNodeStatus(nodeIds[0], { 
              status: 'running',
              startTime: Date.now()
            })
          }
        } else if (data.status === 'completed') {
          // Mark all nodes as completed (simplified for Phase 1)
          nodeIds.forEach(nodeId => {
            updateNodeStatus(nodeId, {
              status: 'completed',
              endTime: Date.now()
            })
          })
          
          setIsExecuting(false)
          if (onExecutionComplete) {
            onExecutionComplete(data)
          }
        } else if (data.status === 'failed') {
          // Mark current running node as failed
          const runningNodeId = nodeIds.find(nodeId => {
            const state = executionState?.nodes.get(nodeId)
            return state?.status === 'running'
          })
          
          if (runningNodeId) {
            updateNodeStatus(runningNodeId, {
              status: 'failed',
              endTime: Date.now(),
              error: data.error
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

  // Reset execution state
  const resetExecution = useCallback(() => {
    stopExecution()
    setExecutionState(null)
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
    startExecution,
    stopExecution,
    resetExecution,
    getNodeExecutionState,
    updateNodeStatus
  }

  return (
    <ExecutionContext.Provider value={value}>
      {children}
    </ExecutionContext.Provider>
  )
} 