// Workflow execution service - integrates with any-agent backend

import { WorkflowIdentity } from '../types/workflow'

export interface WorkflowNode {
  id: string
  type: 'agent' | 'tool' | 'input' | 'output'
  data: {
    label: string
    type?: string
    model_id?: string
    instructions?: string
    name?: string
    [key: string]: any
  }
  position: { x: number; y: number }
}

export interface WorkflowEdge {
  id: string
  source: string
  target: string
}

export interface WorkflowDefinition {
  nodes: WorkflowNode[]
  edges: WorkflowEdge[]
}

export interface ExecutionRequest {
  workflow: WorkflowDefinition
  input_data: string
  framework?: string
  workflow_identity?: WorkflowIdentity
  workflow_name?: string
  workflow_id?: string
}

export interface ExecutionResponse {
  execution_id: string
  status: 'running' | 'completed' | 'failed'
  result?: string
  trace?: {
    final_output: string
    steps: any[]
    metadata: Record<string, any>
  }
  error?: string
  workflow_id?: string
  workflow_name?: string
  workflow_category?: string
}

export interface FrameworkInfo {
  frameworks: string[]
  default: string
}

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000'

export class WorkflowService {
  /**
   * Get available agent frameworks
   */
  static async getFrameworks(): Promise<FrameworkInfo> {
    const response = await fetch(`${BACKEND_URL}/frameworks`)
    if (!response.ok) {
      throw new Error('Failed to fetch frameworks')
    }
    return response.json()
  }

  /**
   * Execute a workflow using any-agent
   */
  static async executeWorkflow(request: ExecutionRequest): Promise<ExecutionResponse> {
    const response = await fetch('/api/execute', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to execute workflow')
    }

    return response.json()
  }

  /**
   * Get execution status by ID
   */
  static async getExecution(executionId: string): Promise<any> {
    const response = await fetch(`${BACKEND_URL}/executions/${executionId}`)
    if (!response.ok) {
      throw new Error('Failed to fetch execution details')
    }
    return response.json()
  }

  /**
   * Convert ReactFlow nodes/edges to workflow definition
   */
  static convertToWorkflowDefinition(
    nodes: any[],
    edges: any[]
  ): WorkflowDefinition {
    console.log('🔄 Converting to workflow definition:', {
      nodeCount: nodes.length,
      edgeCount: edges.length,
      nodes: nodes.map(n => ({ id: n.id, type: n.type, dataType: n.data?.type }))
    })
    
    const workflowNodes: WorkflowNode[] = nodes.map((node) => {
      const nodeType: 'agent' | 'tool' | 'input' | 'output' = 
        node.type === 'agent' ? 'agent' : 
        node.data.type === 'tool' ? 'tool' :
        node.data.type === 'input' ? 'input' :
        node.data.type === 'output' ? 'output' : 'agent'
      
      const convertedNode: WorkflowNode = {
        id: node.id,
        type: nodeType,
        data: {
          ...node.data,
          // Add default values for agent nodes
          model_id: node.data.model_id || 'gpt-3.5-turbo',
          instructions: node.data.instructions || 'You are a helpful assistant.',
          name: node.data.name || node.data.label || 'Agent',
        },
        position: node.position,
      }
      
      console.log(`🔧 Converted node ${node.id}:`, {
        originalType: node.type,
        originalDataType: node.data?.type,
        convertedType: convertedNode.type,
        finalDataType: convertedNode.data.type
      })
      
      return convertedNode
    })

    const workflowEdges: WorkflowEdge[] = edges.map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
    }))

    console.log('✅ Final workflow definition:', {
      nodeCount: workflowNodes.length,
      edgeCount: workflowEdges.length,
      executableNodes: workflowNodes.filter(n => n.type === 'agent' || n.type === 'tool').length
    })

    return {
      nodes: workflowNodes,
      edges: workflowEdges,
    }
  }

  /**
   * Create WebSocket connection for real-time execution updates
   * Falls back to polling if WebSocket fails (for platforms like Render)
   */
  static createExecutionWebSocket(
    executionId: string,
    onMessage: (data: any) => void,
    onError?: (error: Event) => void,
    onClose?: (event: CloseEvent) => void
  ): WebSocket | { close: () => void } {
    const wsUrl = BACKEND_URL.replace('http', 'ws').replace('https', 'wss')
    
    try {
      const ws = new WebSocket(`${wsUrl}/ws/execution/${executionId}`)
      
      // Set a connection timeout
      const connectionTimeout = setTimeout(() => {
        console.warn('WebSocket connection timeout, falling back to polling')
        ws.close()
        // Start polling fallback
        this.startPollingFallback(executionId, onMessage, onError)
      }, 5000) // 5 second timeout
      
      ws.onopen = () => {
        clearTimeout(connectionTimeout)
        console.log('✅ WebSocket connected successfully')
      }
      
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          onMessage(data)
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error)
        }
      }

      ws.onerror = (error) => {
        clearTimeout(connectionTimeout)
        console.error('❌ WebSocket error, falling back to polling:', error)
        onError?.(error)
        // Start polling fallback
        this.startPollingFallback(executionId, onMessage, onError)
      }

      ws.onclose = (event) => {
        clearTimeout(connectionTimeout)
        console.log('WebSocket closed:', event)
        onClose?.(event)
      }

      return ws
    } catch (error) {
      console.error('❌ WebSocket creation failed, using polling:', error)
      // Return polling fallback
      return this.startPollingFallback(executionId, onMessage, onError)
    }
  }

  /**
   * Polling fallback for platforms that don't support WebSockets reliably
   */
  static startPollingFallback(
    executionId: string,
    onMessage: (data: any) => void,
    onError?: (error: Event) => void
  ) {
    console.log('🔄 Starting polling fallback for execution:', executionId)
    
    let isPolling = true
    let pollCount = 0
    
    const poll = async () => {
      if (!isPolling) return
      
      try {
        const response = await fetch(`${BACKEND_URL}/executions/${executionId}`)
        if (response.ok) {
          const data = await response.json()
          
          // Simulate WebSocket message format
          onMessage(data)
          
          // Stop polling if execution is complete
          if (data.status === 'completed' || data.status === 'failed') {
            isPolling = false
            return
          }
        }
      } catch (error) {
        console.error('Polling error:', error)
        if (pollCount > 10) { // Stop after 10 failed attempts
          isPolling = false
          onError?.(new Event('polling-failed'))
        }
      }
      
      pollCount++
      
      // Continue polling every 2 seconds
      if (isPolling) {
        setTimeout(poll, 2000)
      }
    }
    
    // Start polling
    poll()
    
    // Return object with close method for compatibility
    return {
      close: () => {
        isPolling = false
        console.log('🛑 Stopped polling fallback')
      }
    }
  }
} 