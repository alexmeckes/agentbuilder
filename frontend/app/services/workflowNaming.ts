import { 
  WorkflowNamingRequest, 
  WorkflowNamingResponse, 
  WorkflowAnalysis,
  WorkflowIdentity 
} from '../types/workflow'
import { v4 as uuidv4 } from 'uuid'

// Browser-compatible hash function
function simpleHash(str: string): string {
  let hash = 0
  if (str.length === 0) return hash.toString()
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32bit integer
  }
  return Math.abs(hash).toString(16)
}

export class WorkflowNamingService {
  
  /**
   * Generate a smart name and analysis for a workflow
   */
  static async generateWorkflowIdentity(request: WorkflowNamingRequest): Promise<WorkflowNamingResponse> {
    try {
      // Analyze the workflow structure
      const analysis = this.analyzeWorkflowStructure(request.nodes, request.edges)
      
      // Generate AI-powered name and description
      const aiNaming = await this.generateAINames(analysis, request)
      
      // Create partial identity
      const identity: Partial<WorkflowIdentity> = {
        id: uuidv4(),
        name: aiNaming.name,
        description: aiNaming.description,
        category: aiNaming.category,
        version: 1,
        created_at: new Date().toISOString(),
        last_modified: new Date().toISOString(),
        structure_hash: this.generateStructureHash(request.nodes, request.edges),
        execution_count: 0,
        last_executed: null
      }
      
      return {
        analysis: {
          ...analysis,
          suggested_name: aiNaming.name,
          suggested_description: aiNaming.description,
          suggested_category: aiNaming.category
        },
        identity,
        confidence_score: aiNaming.confidence,
        alternative_names: aiNaming.alternatives
      }
    } catch (error) {
      console.error('Error generating workflow identity:', error)
      
      // Fallback to basic naming
      const fallbackAnalysis = this.analyzeWorkflowStructure(request.nodes, request.edges)
      const fallbackName = this.generateFallbackName(request.nodes, request.edges)
      
      return {
        analysis: {
          ...fallbackAnalysis,
          suggested_name: fallbackName,
          suggested_description: `A workflow with ${request.nodes.length} nodes`,
          suggested_category: 'general'
        },
        identity: {
          id: uuidv4(),
          name: fallbackName,
          description: `A workflow with ${request.nodes.length} nodes`,
          category: 'general',
          version: 1,
          created_at: new Date().toISOString(),
          last_modified: new Date().toISOString(),
          structure_hash: this.generateStructureHash(request.nodes, request.edges),
          execution_count: 0,
          last_executed: null
        },
        confidence_score: 0.3,
        alternative_names: []
      }
    }
  }

  /**
   * Analyze workflow structure to understand patterns and complexity
   */
  private static analyzeWorkflowStructure(nodes: any[], edges: any[]): Omit<WorkflowAnalysis, 'suggested_name' | 'suggested_description' | 'suggested_category'> {
    const nodeTypes = nodes.reduce((acc, node) => {
      const type = node.data?.type || 'unknown'
      acc[type] = (acc[type] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    // Detect structure pattern
    const structure_pattern = this.detectStructurePattern(nodes, edges)
    
    // Extract tool types
    const tool_types = nodes
      .filter(node => node.data?.type === 'tool')
      .map(node => node.data?.tool_type || 'unknown')
      .filter(Boolean)

    // Extract agent roles from instructions
    const agent_roles = nodes
      .filter(node => node.data?.type === 'agent')
      .map(node => this.extractAgentRole(node.data?.instructions || ''))
      .filter(Boolean)

    // Detect primary purpose
    const primary_purpose = this.detectPrimaryPurpose(nodes, edges, tool_types, agent_roles)

    // Identify complexity factors
    const complexity_factors = this.identifyComplexityFactors(nodes, edges, nodeTypes)

    return {
      structure_pattern,
      primary_purpose,
      tool_types,
      agent_roles,
      complexity_factors
    }
  }

  /**
   * Use AI to generate intelligent names and descriptions
   */
  private static async generateAINames(
    analysis: Omit<WorkflowAnalysis, 'suggested_name' | 'suggested_description' | 'suggested_category'>, 
    request: WorkflowNamingRequest
  ): Promise<{
    name: string
    description: string
    category: string
    confidence: number
    alternatives: string[]
  }> {
    const prompt = this.buildNamingPrompt(analysis, request)
    
    // Helper function to get user preferences from localStorage
    const getUserPreferences = () => {
      if (typeof window === 'undefined') return null
      
      try {
        const stored = localStorage.getItem('workflow-composer-preferences')
        return stored ? JSON.parse(stored) : null
      } catch (error) {
        console.warn('Failed to load user preferences:', error)
        return null
      }
    }
    
    try {
      console.log('Calling workflow naming API...')
      
      const userPrefs = getUserPreferences()
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      }
      
      // Include user preferences in headers if available
      if (userPrefs) {
        headers['x-user-preferences'] = JSON.stringify(userPrefs)
      }
      
      const response = await fetch('/api/workflow-naming', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          messages: [
            {
              role: 'system',
              content: 'You are an expert at analyzing AI workflows and generating concise, descriptive names. Respond only with valid JSON.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          // Note: model will be determined by user preferences in the API
          temperature: 0.7
        })
      })

      console.log('Workflow naming API response status:', response.status)

      if (!response.ok) {
        console.error('Workflow naming API failed with status:', response.status)
        throw new Error('AI naming request failed')
      }

      const data = await response.json()
      console.log('Workflow naming API response:', data)
      const aiResponse = data.content

      // Parse AI response
      try {
        const parsed = JSON.parse(aiResponse)
        return {
          name: parsed.name || this.generateIntelligentFallbackName(request.nodes, request.edges),
          description: parsed.description || `A workflow with ${request.nodes.length} nodes`,
          category: parsed.category || this.inferCategoryFromNodes(request.nodes),
          confidence: parsed.confidence || 0.7,
          alternatives: parsed.alternatives || []
        }
      } catch (parseError) {
        console.error('Failed to parse AI response:', parseError)
        console.error('Raw AI response:', aiResponse)
        
        // Try to extract name from non-JSON response
        const fallbackName = this.extractNameFromText(aiResponse) || this.generateIntelligentFallbackName(request.nodes, request.edges)
        
        return {
          name: fallbackName,
          description: `A workflow with ${request.nodes.length} nodes`,
          category: this.inferCategoryFromNodes(request.nodes),
          confidence: 0.3,
          alternatives: []
        }
      }
    } catch (error) {
      console.error('AI naming failed:', error)
      
      // Return intelligent fallback based on workflow structure
      const fallbackName = this.generateIntelligentFallbackName(request.nodes, request.edges)
      
      return {
        name: fallbackName,
        description: `A workflow with ${request.nodes.length} nodes`,
        category: this.inferCategoryFromNodes(request.nodes),
        confidence: 0.4,
        alternatives: []
      }
    }
  }

  /**
   * Build the prompt for AI naming
   */
  private static buildNamingPrompt(
    analysis: Omit<WorkflowAnalysis, 'suggested_name' | 'suggested_description' | 'suggested_category'>, 
    request: WorkflowNamingRequest
  ): string {
    const nodeDescriptions = request.nodes.map(node => ({
      type: node.data?.type,
      label: node.data?.label,
      name: node.data?.name,
      instructions: node.data?.instructions?.substring(0, 200), // Truncate for prompt efficiency
      tool_type: node.data?.tool_type
    }))

    return `Analyze this AI workflow and generate a smart name, description, and category.

WORKFLOW STRUCTURE:
- Pattern: ${analysis.structure_pattern}
- Primary Purpose: ${analysis.primary_purpose}
- Tool Types: ${analysis.tool_types.join(', ') || 'none'}
- Agent Roles: ${analysis.agent_roles.join(', ') || 'none'}
- Complexity: ${analysis.complexity_factors.join(', ') || 'simple'}

NODES (${request.nodes.length} total):
${nodeDescriptions.map((node, i) => 
  `${i + 1}. ${node.type}: "${node.label}" ${node.instructions ? `- ${node.instructions}` : ''}`
).join('\n')}

CONNECTIONS: ${request.edges.length} edges connecting the nodes

${request.existing_name ? `CURRENT NAME: "${request.existing_name}"` : ''}
${request.user_context ? `USER CONTEXT: "${request.user_context}"` : ''}

Generate a response in this exact JSON format:
{
  "name": "Concise, descriptive workflow name (2-6 words)",
  "description": "Clear description of what this workflow does (1-2 sentences)",
  "category": "One of: research, analysis, content, automation, support, data-processing, general",
  "confidence": 0.85,
  "alternatives": ["Alternative name 1", "Alternative name 2", "Alternative name 3"]
}

Guidelines:
- Name should be professional and descriptive
- Avoid generic terms like "Workflow" or "Process" 
- Focus on the main business value or outcome
- Category should reflect the primary use case
- Confidence should be 0.6-0.95 based on how clear the purpose is`
  }

  /**
   * Detect the structural pattern of the workflow
   */
  private static detectStructurePattern(nodes: any[], edges: any[]): 'linear' | 'branching' | 'parallel' | 'complex' {
    if (edges.length === 0) return 'linear'
    
    // Build adjacency lists
    const outgoing = new Map<string, string[]>()
    const incoming = new Map<string, string[]>()
    
    edges.forEach(edge => {
      if (!outgoing.has(edge.source)) outgoing.set(edge.source, [])
      if (!incoming.has(edge.target)) incoming.set(edge.target, [])
      
      outgoing.get(edge.source)!.push(edge.target)
      incoming.get(edge.target)!.push(edge.source)
    })

    // Check for complexity indicators
    const hasMultipleOutputs = Array.from(outgoing.values()).some(targets => targets.length > 1)
    const hasMultipleInputs = Array.from(incoming.values()).some(sources => sources.length > 1)
    const hasCycles = this.detectCycles(nodes, edges)

    if (hasCycles || (hasMultipleOutputs && hasMultipleInputs)) return 'complex'
    if (hasMultipleOutputs) return 'branching'
    if (hasMultipleInputs) return 'parallel'
    return 'linear'
  }

  /**
   * Detect cycles in the workflow graph
   */
  private static detectCycles(nodes: any[], edges: any[]): boolean {
    const visited = new Set<string>()
    const recursionStack = new Set<string>()
    
    const adjacencyList = new Map<string, string[]>()
    edges.forEach(edge => {
      if (!adjacencyList.has(edge.source)) adjacencyList.set(edge.source, [])
      adjacencyList.get(edge.source)!.push(edge.target)
    })

    const dfs = (nodeId: string): boolean => {
      visited.add(nodeId)
      recursionStack.add(nodeId)

      const neighbors = adjacencyList.get(nodeId) || []
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          if (dfs(neighbor)) return true
        } else if (recursionStack.has(neighbor)) {
          return true
        }
      }

      recursionStack.delete(nodeId)
      return false
    }

    for (const node of nodes) {
      if (!visited.has(node.id)) {
        if (dfs(node.id)) return true
      }
    }

    return false
  }

  /**
   * Extract agent role from instructions
   */
  private static extractAgentRole(instructions: string): string {
    if (!instructions) return ''
    
    // Look for role indicators
    const rolePatterns = [
      /you are (?:a |an )?([^.]+)/i,
      /acting as (?:a |an )?([^.]+)/i,
      /role.*?(?:is|as) (?:a |an )?([^.]+)/i,
      /specialist.*?in ([^.]+)/i,
      /expert.*?(?:in|at) ([^.]+)/i
    ]

    for (const pattern of rolePatterns) {
      const match = instructions.match(pattern)
      if (match) {
        return match[1].trim().toLowerCase()
      }
    }

    // Fallback: extract first few words that might indicate purpose
    const words = instructions.toLowerCase().split(' ').slice(0, 10)
    const purposeWords = words.filter(word => 
      ['analyze', 'research', 'generate', 'create', 'process', 'review', 'summarize', 'extract'].includes(word)
    )
    
    return purposeWords[0] || ''
  }

  /**
   * Detect the primary purpose of the workflow
   */
  private static detectPrimaryPurpose(nodes: any[], edges: any[], toolTypes: string[], agentRoles: string[]): string {
    // Analyze tool types for purpose hints
    if (toolTypes.includes('web_search')) return 'research and information gathering'
    if (toolTypes.includes('file_read') || toolTypes.includes('file_write')) return 'document processing'
    if (toolTypes.includes('database_query')) return 'data analysis'
    if (toolTypes.includes('image_generation')) return 'content creation'

    // Analyze agent roles
    const roleText = agentRoles.join(' ').toLowerCase()
    if (roleText.includes('research') || roleText.includes('gather')) return 'research and analysis'
    if (roleText.includes('analyze') || roleText.includes('analysis')) return 'data analysis'
    if (roleText.includes('generate') || roleText.includes('create') || roleText.includes('write')) return 'content generation'
    if (roleText.includes('review') || roleText.includes('check') || roleText.includes('validate')) return 'quality assurance'
    if (roleText.includes('support') || roleText.includes('help') || roleText.includes('assist')) return 'customer support'

    // Fallback based on structure
    if (nodes.length > 5) return 'complex automation'
    if (nodes.length > 2) return 'multi-step processing'
    return 'simple task automation'
  }

  /**
   * Identify factors that make the workflow complex
   */
  private static identifyComplexityFactors(nodes: any[], edges: any[], nodeTypes: Record<string, number>): string[] {
    const factors: string[] = []

    if (nodes.length > 10) factors.push('large scale')
    if (edges.length > nodes.length * 1.5) factors.push('highly connected')
    if (nodeTypes.agent > 5) factors.push('multiple agents')
    if (nodeTypes.tool > 3) factors.push('multiple tools')
    if (Object.keys(nodeTypes).length > 3) factors.push('mixed node types')

    return factors
  }

  /**
   * Generate a hash of the workflow structure for change detection
   */
  private static generateStructureHash(nodes: any[], edges: any[]): string {
    const structure = {
      nodes: nodes.map(node => ({
        type: node.data?.type,
        tool_type: node.data?.tool_type,
        model_id: node.data?.model_id
      })),
      edges: edges.map(edge => ({
        source: edge.source,
        target: edge.target
      }))
    }
    
    return simpleHash(JSON.stringify(structure))
  }

  /**
   * Generate a fallback name when AI naming fails
   */
  private static generateFallbackName(nodes: any[], edges: any[]): string {
    const agentCount = nodes.filter(n => n.data?.type === 'agent').length
    const toolCount = nodes.filter(n => n.data?.type === 'tool').length
    
    if (toolCount > 0 && agentCount > 0) {
      return `${agentCount}-Agent ${toolCount}-Tool Workflow`
    } else if (agentCount > 0) {
      return `${agentCount}-Agent Workflow`
    } else {
      return `${nodes.length}-Node Workflow`
    }
  }

  private static extractNameFromText(text: string): string | undefined {
    // Try to extract a workflow name from non-JSON text response
    if (!text) return undefined
    
    // Look for common patterns like "Name: ..." or quoted names
    const patterns = [
      /"name":\s*"([^"]+)"/i,
      /name:\s*"([^"]+)"/i,
      /workflow name:\s*"([^"]+)"/i,
      /title:\s*"([^"]+)"/i,
      /"([^"]+)"\s*workflow/i
    ]
    
    for (const pattern of patterns) {
      const match = text.match(pattern)
      if (match && match[1]) {
        return match[1].trim()
      }
    }
    
    return undefined
  }

  private static generateIntelligentFallbackName(nodes: any[], edges: any[]): string {
    // Generate a smart fallback name based on workflow structure
    const agentNodes = nodes.filter(node => node.type === 'agent' || node.data?.type === 'agent')
    const toolNodes = nodes.filter(node => node.type === 'tool' || node.data?.type === 'tool')
    
    // Try to infer purpose from agent instructions
    const allInstructions = agentNodes
      .map(node => node.data?.instructions || '')
      .join(' ')
      .toLowerCase()
    
    // Look for key action words
    if (allInstructions.includes('analyze') || allInstructions.includes('analysis')) {
      return 'Data Analysis Workflow'
    }
    if (allInstructions.includes('research') || allInstructions.includes('search')) {
      return 'Research Workflow'
    }
    if (allInstructions.includes('generate') || allInstructions.includes('create') || allInstructions.includes('write')) {
      return 'Content Generation Workflow'
    }
    if (allInstructions.includes('support') || allInstructions.includes('help') || allInstructions.includes('assist')) {
      return 'Support Workflow'
    }
    if (allInstructions.includes('process') || allInstructions.includes('transform')) {
      return 'Data Processing Workflow'
    }
    
    // Fallback based on structure
    if (agentNodes.length > 3) {
      return 'Multi-Agent Workflow'
    }
    if (toolNodes.length > 2) {
      return 'Tool-Based Workflow'
    }
    if (nodes.length > 5) {
      return 'Complex Workflow'
    }
    
    return 'Custom Workflow'
  }

  private static inferCategoryFromNodes(nodes: any[]): string {
    const agentNodes = nodes.filter(node => node.type === 'agent' || node.data?.type === 'agent')
    const toolNodes = nodes.filter(node => node.type === 'tool' || node.data?.type === 'tool')
    
    // Analyze instructions for category hints
    const allInstructions = agentNodes
      .map(node => node.data?.instructions || '')
      .join(' ')
      .toLowerCase()
    
    if (allInstructions.includes('research') || allInstructions.includes('search') || allInstructions.includes('gather')) {
      return 'research'
    }
    if (allInstructions.includes('analyze') || allInstructions.includes('analysis') || allInstructions.includes('data')) {
      return 'analysis'
    }
    if (allInstructions.includes('generate') || allInstructions.includes('create') || allInstructions.includes('write') || allInstructions.includes('content')) {
      return 'content'
    }
    if (allInstructions.includes('support') || allInstructions.includes('help') || allInstructions.includes('assist') || allInstructions.includes('customer')) {
      return 'support'
    }
    if (allInstructions.includes('automate') || allInstructions.includes('process') || allInstructions.includes('workflow')) {
      return 'automation'
    }
    
    // Analyze tool types
    const toolTypes = toolNodes.map(node => node.data?.tool_type || '').join(' ').toLowerCase()
    if (toolTypes.includes('database') || toolTypes.includes('data')) {
      return 'data-processing'
    }
    
    return 'general'
  }
} 