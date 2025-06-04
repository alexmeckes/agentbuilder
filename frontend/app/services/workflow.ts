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
    console.log('🌐 Making API call to /api/execute with:', {
      nodeCount: request.workflow.nodes.length,
      edgeCount: request.workflow.edges.length,
      framework: request.framework,
      hasInput: !!request.input_data,
      requestSize: JSON.stringify(request).length
    })
    
    const response = await fetch('/api/execute', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    })

    console.log('🌐 API response status:', response.status)
    
    if (!response.ok) {
      const errorText = await response.text()
      console.error('❌ API error response:', errorText)
      let error
      try {
        error = JSON.parse(errorText)
      } catch {
        error = { error: errorText }
      }
      throw new Error(error.error || 'Failed to execute workflow')
    }

    const result = await response.json()
    console.log('🌐 API success response received')
    return result
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
   * Submit user input for a workflow execution that's waiting for input
   */
  static async submitUserInput(executionId: string, inputText: string): Promise<{ success: boolean; message?: string; error?: string }> {
    const response = await fetch(`${BACKEND_URL}/executions/${executionId}/input`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        execution_id: executionId,
        input_text: inputText,
      }),
    })

    if (!response.ok) {
      throw new Error(`Failed to submit user input: ${response.statusText}`)
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
      // Use node.data.type for the actual node type, not node.type (which is always 'agent' in ReactFlow)
      const nodeType: 'agent' | 'tool' | 'input' | 'output' = 
        node.data.type === 'tool' ? 'tool' :
        node.data.type === 'input' ? 'input' :
        node.data.type === 'output' ? 'output' : 'agent'
      
      const convertedNode: WorkflowNode = {
        id: node.id,
        type: nodeType,
        data: {
          ...node.data,
          name: node.data.name || node.data.label || 'Node',
        },
        position: node.position,
      }

      // Only add model_id and instructions for agent nodes
      if (nodeType === 'agent') {
        convertedNode.data.model_id = node.data.model_id || 'gpt-3.5-turbo'
        convertedNode.data.instructions = node.data.instructions || 'You are a helpful assistant.'
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
    
    // Detailed logging of final node data
    console.log('📋 Final nodes data:')
    workflowNodes.forEach((node, index) => {
      console.log(`  ${index + 1}. ${node.id}:`, {
        type: node.type,
        dataKeys: Object.keys(node.data),
        hasModelId: 'model_id' in node.data,
        hasToolType: 'tool_type' in node.data,
        hasInstructions: 'instructions' in node.data,
        fullData: node.data
      })
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
    const fullWsUrl = `${wsUrl}/ws/execution/${executionId}`
    
    console.log('🔌 Attempting WebSocket connection to:', fullWsUrl)
    
    try {
      const ws = new WebSocket(fullWsUrl)
      
      // Set a connection timeout
      const connectionTimeout = setTimeout(() => {
        console.warn('⏰ WebSocket connection timeout (5s), falling back to polling')
        ws.close()
        // Start polling fallback
        return this.startPollingFallback(executionId, onMessage, onError)
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
    console.log('🔄 Backend URL:', BACKEND_URL)
    
    let isPolling = true
    let pollCount = 0
    
    const poll = async () => {
      if (!isPolling) return
      
      try {
        const url = `${BACKEND_URL}/executions/${executionId}`
        console.log(`📡 Polling attempt ${pollCount + 1}: ${url}`)
        
        const response = await fetch(url)
        console.log(`📡 Poll response status: ${response.status}`)
        
        if (response.ok) {
          const data = await response.json()
          console.log('📡 Poll response data:', {
            executionId,
            status: data.status,
            progress: data.progress?.percentage || 0,
            hasResult: !!data.result,
            hasError: !!data.error,
            pollCount: pollCount + 1,
            progressData: data.progress,
            keys: Object.keys(data)
          })
          
          // Simulate WebSocket message format
          onMessage(data)
          
          // Stop polling if execution is complete
          if (data.status === 'completed' || data.status === 'failed') {
            console.log(`🏁 Polling stopped - execution ${data.status}`)
            console.log(`🏁 Final result: ${data.result ? data.result.substring(0, 100) + '...' : 'No result'}`)
            isPolling = false
            return
          }
        } else {
          const errorText = await response.text()
          console.error(`❌ Poll failed: ${response.status} - ${errorText}`)
        }
      } catch (error) {
        console.error('❌ Polling error:', error)
        if (pollCount > 10) { // Stop after 10 failed attempts
          console.error('❌ Polling failed after 10 attempts, stopping')
          isPolling = false
          onError?.(new Event('polling-failed'))
        }
      }
      
      pollCount++
      
      // Continue polling every 2 seconds if still running
      if (isPolling && pollCount < 150) { // Maximum 5 minutes of polling
        setTimeout(poll, 2000)
      } else if (pollCount >= 150) {
        console.warn('⏰ Polling timeout reached (5 minutes), stopping')
        isPolling = false
        onError?.(new Event('polling-timeout'))
      }
    }
    
    // Start polling immediately
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