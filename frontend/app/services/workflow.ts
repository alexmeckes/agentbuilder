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
    const workflowNodes: WorkflowNode[] = nodes.map((node) => ({
      id: node.id,
      type: node.type === 'agent' ? 'agent' : 
            node.data.type === 'tool' ? 'tool' :
            node.data.type === 'input' ? 'input' :
            node.data.type === 'output' ? 'output' : 'agent',
      data: {
        ...node.data,
        // Add default values for agent nodes
        model_id: node.data.model_id || 'gpt-3.5-turbo',
        instructions: node.data.instructions || 'You are a helpful assistant.',
        name: node.data.name || node.data.label || 'Agent',
      },
      position: node.position,
    }))

    const workflowEdges: WorkflowEdge[] = edges.map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
    }))

    return {
      nodes: workflowNodes,
      edges: workflowEdges,
    }
  }

  /**
   * Create WebSocket connection for real-time execution updates
   */
  static createExecutionWebSocket(
    executionId: string,
    onMessage: (data: any) => void,
    onError?: (error: Event) => void,
    onClose?: (event: CloseEvent) => void
  ): WebSocket {
    const wsUrl = BACKEND_URL.replace('http', 'ws')
    const ws = new WebSocket(`${wsUrl}/ws/execution/${executionId}`)
    
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        onMessage(data)
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error)
      }
    }

    ws.onerror = (error) => {
      console.error('WebSocket error:', error)
      onError?.(error)
    }

    ws.onclose = (event) => {
      console.log('WebSocket closed:', event)
      onClose?.(event)
    }

    return ws
  }
} 