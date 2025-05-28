import { 
  WorkflowIdentity, 
  WorkflowDefinition, 
  IdentifiedExecutionRequest,
  IdentifiedExecutionResponse 
} from '../types/workflow'
import { WorkflowNamingService } from './workflowNaming'

export class WorkflowManager {
  private static workflows = new Map<string, WorkflowDefinition>()
  private static workflowsByHash = new Map<string, string>() // structure_hash -> workflow_id

  /**
   * Create or update a workflow with smart naming
   */
  static async createOrUpdateWorkflow(
    nodes: any[], 
    edges: any[], 
    userContext?: string
  ): Promise<WorkflowDefinition> {
    try {
      // Generate workflow identity using AI
      const namingResponse = await WorkflowNamingService.generateWorkflowIdentity({
        nodes,
        edges,
        user_context: userContext
      })

      const identity = namingResponse.identity as WorkflowIdentity
      const structureHash = identity.structure_hash

      // Check if we already have a workflow with this structure
      const existingWorkflowId = this.workflowsByHash.get(structureHash)
      
      if (existingWorkflowId) {
        // Update existing workflow
        const existingWorkflow = this.workflows.get(existingWorkflowId)
        if (existingWorkflow) {
          // Increment version and update
          const updatedIdentity: WorkflowIdentity = {
            ...existingWorkflow.identity,
            version: existingWorkflow.identity.version + 1,
            last_modified: new Date().toISOString(),
            // Keep the original name unless user provides context suggesting a change
            name: userContext ? identity.name : existingWorkflow.identity.name,
            description: userContext ? identity.description : existingWorkflow.identity.description
          }

          const updatedWorkflow: WorkflowDefinition = {
            identity: updatedIdentity,
            nodes,
            edges,
            metadata: this.calculateMetadata(nodes, edges)
          }

          this.workflows.set(existingWorkflowId, updatedWorkflow)
          return updatedWorkflow
        }
      }

      // Create new workflow
      const metadata = this.calculateMetadata(nodes, edges)
      const workflow: WorkflowDefinition = {
        identity,
        nodes,
        edges,
        metadata
      }

      this.workflows.set(identity.id, workflow)
      this.workflowsByHash.set(structureHash, identity.id)

      console.log(`Created new workflow: "${identity.name}" (${identity.id})`)
      return workflow

    } catch (error) {
      console.error('Error creating workflow:', error)
      
      // Fallback to basic workflow creation
      const fallbackIdentity: WorkflowIdentity = {
        id: `workflow-${Date.now()}`,
        name: `Workflow ${nodes.length} Nodes`,
        description: `A workflow with ${nodes.length} nodes and ${edges.length} connections`,
        category: 'general',
        version: 1,
        created_at: new Date().toISOString(),
        last_modified: new Date().toISOString(),
        structure_hash: this.generateSimpleHash(nodes, edges),
        execution_count: 0,
        last_executed: null
      }

      const workflow: WorkflowDefinition = {
        identity: fallbackIdentity,
        nodes,
        edges,
        metadata: this.calculateMetadata(nodes, edges)
      }

      this.workflows.set(fallbackIdentity.id, workflow)
      return workflow
    }
  }

  /**
   * Get workflow by ID
   */
  static getWorkflow(workflowId: string): WorkflowDefinition | null {
    return this.workflows.get(workflowId) || null
  }

  /**
   * Get all workflows
   */
  static getAllWorkflows(): WorkflowDefinition[] {
    return Array.from(this.workflows.values())
  }

  /**
   * Get workflows by category
   */
  static getWorkflowsByCategory(category: string): WorkflowDefinition[] {
    return Array.from(this.workflows.values())
      .filter(workflow => workflow.identity.category === category)
  }

  /**
   * Find workflow by structure hash (for detecting duplicates)
   */
  static findWorkflowByStructure(nodes: any[], edges: any[]): WorkflowDefinition | null {
    const hash = this.generateSimpleHash(nodes, edges)
    const workflowId = this.workflowsByHash.get(hash)
    return workflowId ? this.workflows.get(workflowId) || null : null
  }

  /**
   * Update workflow execution statistics
   */
  static updateExecutionStats(workflowId: string, success: boolean): void {
    const workflow = this.workflows.get(workflowId)
    if (workflow) {
      workflow.identity.execution_count += 1
      workflow.identity.last_executed = new Date().toISOString()
      
      // Update metadata if needed
      if (success) {
        // Could track success rate, performance trends, etc.
      }
    }
  }

  /**
   * Get workflow execution history
   */
  static getWorkflowHistory(workflowId: string): {
    workflow: WorkflowDefinition
    executions: IdentifiedExecutionResponse[]
  } | null {
    const workflow = this.workflows.get(workflowId)
    if (!workflow) return null

    // This would typically fetch from a database
    // For now, return empty executions array
    return {
      workflow,
      executions: []
    }
  }

  /**
   * Search workflows by name or description
   */
  static searchWorkflows(query: string): WorkflowDefinition[] {
    const searchTerm = query.toLowerCase()
    return Array.from(this.workflows.values())
      .filter(workflow => 
        workflow.identity.name.toLowerCase().includes(searchTerm) ||
        workflow.identity.description.toLowerCase().includes(searchTerm) ||
        workflow.identity.category.toLowerCase().includes(searchTerm)
      )
  }

  /**
   * Get workflow statistics
   */
  static getWorkflowStats(): {
    total_workflows: number
    by_category: Record<string, number>
    most_executed: WorkflowDefinition[]
    recently_created: WorkflowDefinition[]
    recently_executed: WorkflowDefinition[]
  } {
    const workflows = Array.from(this.workflows.values())
    
    const by_category = workflows.reduce((acc, workflow) => {
      acc[workflow.identity.category] = (acc[workflow.identity.category] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const most_executed = workflows
      .filter(w => w.identity.execution_count > 0)
      .sort((a, b) => b.identity.execution_count - a.identity.execution_count)
      .slice(0, 5)

    const recently_created = workflows
      .sort((a, b) => new Date(b.identity.created_at).getTime() - new Date(a.identity.created_at).getTime())
      .slice(0, 5)

    const recently_executed = workflows
      .filter(w => w.identity.last_executed)
      .sort((a, b) => {
        const aTime = new Date(a.identity.last_executed!).getTime()
        const bTime = new Date(b.identity.last_executed!).getTime()
        return bTime - aTime
      })
      .slice(0, 5)

    return {
      total_workflows: workflows.length,
      by_category,
      most_executed,
      recently_created,
      recently_executed
    }
  }

  /**
   * Calculate workflow metadata
   */
  private static calculateMetadata(nodes: any[], edges: any[]) {
    const nodeTypes = nodes.reduce((acc, node) => {
      const type = node.data?.type || 'unknown'
      acc[type] = (acc[type] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    // Calculate complexity score (1-10)
    let complexity = 1
    complexity += Math.min(nodes.length / 5, 3) // Node count factor
    complexity += Math.min(edges.length / 5, 2) // Edge count factor
    complexity += Math.min((nodeTypes.agent || 0) / 3, 2) // Agent complexity
    complexity += Math.min((nodeTypes.tool || 0) / 2, 1) // Tool complexity
    complexity += Object.keys(nodeTypes).length > 3 ? 1 : 0 // Type diversity

    // Estimate cost based on agents and expected token usage
    const agentCount = nodeTypes.agent || 0
    const estimatedTokensPerAgent = 2000 // Conservative estimate
    const estimatedCostPerToken = 0.00003 // GPT-4 pricing estimate
    const estimated_cost = agentCount * estimatedTokensPerAgent * estimatedCostPerToken

    return {
      node_count: nodes.length,
      edge_count: edges.length,
      agent_count: nodeTypes.agent || 0,
      tool_count: nodeTypes.tool || 0,
      input_count: nodeTypes.input || 0,
      output_count: nodeTypes.output || 0,
      complexity_score: Math.min(Math.round(complexity), 10),
      estimated_cost: Math.round(estimated_cost * 10000) / 10000 // Round to 4 decimal places
    }
  }

  /**
   * Generate a simple hash for fallback scenarios
   */
  private static generateSimpleHash(nodes: any[], edges: any[]): string {
    const structure = {
      nodeCount: nodes.length,
      edgeCount: edges.length,
      nodeTypes: nodes.map(n => n.data?.type).sort(),
      connections: edges.map(e => `${e.source}-${e.target}`).sort()
    }
    
    return btoa(JSON.stringify(structure)).replace(/[^a-zA-Z0-9]/g, '').substring(0, 16)
  }

  /**
   * Export workflow definition for sharing or backup
   */
  static exportWorkflow(workflowId: string): string | null {
    const workflow = this.workflows.get(workflowId)
    if (!workflow) return null

    return JSON.stringify({
      ...workflow,
      exported_at: new Date().toISOString(),
      export_version: '1.0'
    }, null, 2)
  }

  /**
   * Import workflow definition
   */
  static importWorkflow(workflowJson: string): WorkflowDefinition | null {
    try {
      const imported = JSON.parse(workflowJson)
      
      // Validate structure
      if (!imported.identity || !imported.nodes || !imported.edges) {
        throw new Error('Invalid workflow format')
      }

      // Generate new ID to avoid conflicts
      const newIdentity: WorkflowIdentity = {
        ...imported.identity,
        id: `imported-${Date.now()}`,
        created_at: new Date().toISOString(),
        last_modified: new Date().toISOString(),
        execution_count: 0,
        last_executed: null
      }

      const workflow: WorkflowDefinition = {
        identity: newIdentity,
        nodes: imported.nodes,
        edges: imported.edges,
        metadata: imported.metadata || this.calculateMetadata(imported.nodes, imported.edges)
      }

      this.workflows.set(newIdentity.id, workflow)
      this.workflowsByHash.set(newIdentity.structure_hash, newIdentity.id)

      return workflow
    } catch (error) {
      console.error('Error importing workflow:', error)
      return null
    }
  }
} 