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
import NodePalette from './workflow/NodePalette'
import { WorkflowService, type ExecutionResponse } from '../services/workflow'
import { Play, Square, Loader2, Maximize2, Copy, CheckCircle, Settings, Brain } from 'lucide-react'
import { WorkflowManager } from '../services/workflowManager'

const nodeTypes = {
  agent: AgentNode,
  tool: AgentNode,
  input: AgentNode,
  output: AgentNode,
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
}

export default function WorkflowEditor({ 
  nodes: externalNodes, 
  edges: externalEdges, 
  onNodesChange: externalOnNodesChange,
  onEdgesChange: externalOnEdgesChange,
  onWorkflowChange,
  executionInput: externalExecutionInput,
  onExecutionInputChange,
  workflowIdentity: externalWorkflowIdentity,
  initialManualMode = false,
  onManualModeChange
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
  const [currentWorkflowIdentity, setCurrentWorkflowIdentity] = useState<any>(null)

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

  // Handle node data updates from the node components
  const handleNodeUpdate = useCallback((nodeId: string, updatedData: any) => {
    const updateNodes = (currentNodes: Node[]) => {
      return currentNodes.map(node => 
        node.id === nodeId 
          ? { ...node, data: { ...node.data, ...updatedData } }
          : node
      )
    }

    if (externalOnNodesChange) {
      // Update external state
      const updatedNodes = updateNodes(nodes)
      externalOnNodesChange(updatedNodes)
      if (onWorkflowChange) {
        onWorkflowChange(updatedNodes, edges)
      }
    } else {
      // Update internal state
      setInternalNodes(updateNodes)
    }
  }, [nodes, edges, externalOnNodesChange, setInternalNodes, onWorkflowChange])

  // Ensure all nodes have the onNodeUpdate and onNodeDelete callbacks
  useEffect(() => {
    const updateNodesWithCallback = (currentNodes: Node[]) => {
      return currentNodes.map(node => ({
        ...node,
        data: {
          ...node.data,
          onNodeUpdate: handleNodeUpdate,
          onNodeDelete: handleNodeDelete
        }
      }))
    }

    if (externalOnNodesChange && externalNodes) {
      // Check if any nodes are missing the callback
      const needsUpdate = externalNodes.some(node => !node.data.onNodeUpdate)
      if (needsUpdate) {
        const updatedNodes = updateNodesWithCallback(externalNodes)
        externalOnNodesChange(updatedNodes)
      }
    } else {
      // Check if any internal nodes are missing the callback
      const needsUpdate = internalNodes.some(node => !node.data.onNodeUpdate)
      if (needsUpdate) {
        setInternalNodes(updateNodesWithCallback(internalNodes))
      }
    }
  }, [handleNodeUpdate, externalNodes, internalNodes, externalOnNodesChange, setInternalNodes])

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

  // Handle node deletion
  const handleNodesDelete = useCallback(
    (nodesToDelete: Node[]) => {
      const nodeIdsToDelete = nodesToDelete.map(node => node.id)
      console.log('🗑️ Deleting nodes:', nodeIdsToDelete)
      
      if (externalOnNodesChange && externalOnEdgesChange) {
        // Filter out deleted nodes and their connected edges
        const updatedNodes = nodes.filter(node => !nodeIdsToDelete.includes(node.id))
        const updatedEdges = edges.filter(edge => 
          !nodeIdsToDelete.includes(edge.source) && !nodeIdsToDelete.includes(edge.target)
        )
        
        externalOnNodesChange(updatedNodes)
        externalOnEdgesChange(updatedEdges)
        
        if (onWorkflowChange) {
          onWorkflowChange(updatedNodes, updatedEdges)
        }
      } else {
        // Update internal state
        setInternalNodes(currentNodes => 
          currentNodes.filter(node => !nodeIdsToDelete.includes(node.id))
        )
        setInternalEdges(currentEdges => 
          currentEdges.filter(edge => 
            !nodeIdsToDelete.includes(edge.source) && !nodeIdsToDelete.includes(edge.target)
          )
        )
      }
    },
    [nodes, edges, externalOnNodesChange, externalOnEdgesChange, setInternalNodes, setInternalEdges, onWorkflowChange]
  )

  // Handle individual node deletion (from delete button)
  const handleNodeDelete = useCallback(
    (nodeId: string) => {
      console.log('🗑️ Deleting single node:', nodeId)
      const nodeToDelete = nodes.find(node => node.id === nodeId)
      if (nodeToDelete) {
        handleNodesDelete([nodeToDelete])
      }
    },
    [nodes, handleNodesDelete]
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
      const templateData = event.dataTransfer.getData('application/template')

      if (typeof type === 'undefined' || !type || !reactFlowBounds || !reactFlowInstance) {
        return
      }

      const position = reactFlowInstance.project({
        x: event.clientX - reactFlowBounds.left,
        y: event.clientY - reactFlowBounds.top,
      })

      // Adjust position to avoid overlaps with existing nodes
      const adjustedPosition = { ...position }
      const nodeWidth = 500 // Much larger width to account for any expanded state
      const nodeHeight = 400 // Much larger height for any expanded content  
      const padding = 200 // Very large padding between nodes

      // Check for overlaps and adjust position
      let attempts = 0
      const maxAttempts = 30 // More attempts for better positioning
      
      while (attempts < maxAttempts) {
        const hasOverlap = nodes.some(node => {
          const dx = Math.abs(node.position.x - adjustedPosition.x)
          const dy = Math.abs(node.position.y - adjustedPosition.y)
          return dx < nodeWidth + padding && dy < nodeHeight + padding
        })

        if (!hasOverlap) break

        // Try different positions with very generous spacing
        if (attempts < 10) {
          // Try to the right with much more spacing
          adjustedPosition.x += nodeWidth + padding
        } else if (attempts < 20) {
          // Try below with much more spacing
          adjustedPosition.x = position.x
          adjustedPosition.y += nodeHeight + padding
        } else {
          // Try diagonal positioning with very generous spacing
          adjustedPosition.x = position.x + (attempts - 20) * (nodeWidth + padding)
          adjustedPosition.y = position.y + (attempts - 20) * (nodeHeight + padding)
        }
        attempts++
      }

      // Check if we have template data from the new NodePalette
      let nodeData: any
      if (templateData) {
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
          nodeData = getNodeDefaults(type)
        }
      } else {
        // Fallback to old behavior for legacy sidebar
        nodeData = getNodeDefaults(type)
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
    [reactFlowInstance, nodes, edges, externalOnNodesChange, setInternalNodes, onWorkflowChange, handleNodeUpdate],
  )

  const executeWorkflow = async () => {
    if (nodes.length === 0) {
      alert('Please add some nodes to your workflow first')
      return
    }

    setIsExecuting(true)
    setExecutionResult(null)

    try {
      let workflowDefinition: any;
      
      // Use existing workflow identity if available, otherwise generate new one
      if (currentWorkflowIdentity) {
        console.log(`Using existing workflow identity: "${currentWorkflowIdentity.name}"`)
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
        // Generate new workflow identity using AI naming
        console.log('Generating new workflow identity...')
        workflowDefinition = await WorkflowManager.createOrUpdateWorkflow(
          nodes, 
          edges, 
          inputData // Use input as context for naming
        )
        
        // Store the new workflow identity for UI display
        setCurrentWorkflowIdentity(workflowDefinition.identity)
      }

      console.log(`Executing workflow: "${workflowDefinition.identity.name}"`)
      
      // Convert to the format expected by the execution service
      const workflow = WorkflowService.convertToWorkflowDefinition(nodes, edges)
      
      // Execute with workflow identity context
      const result = await WorkflowService.executeWorkflow({
        workflow,
        input_data: inputData,
        framework: 'openai',
        // Add workflow identity context
        workflow_identity: workflowDefinition.identity,
        workflow_name: workflowDefinition.identity.name
      })

      // Update execution statistics
      if (result.status === 'completed') {
        WorkflowManager.updateExecutionStats(workflowDefinition.identity.id, true)
      } else if (result.status === 'failed') {
        WorkflowManager.updateExecutionStats(workflowDefinition.identity.id, false)
      }

      const finalResult = {
        ...result,
        workflow_name: workflowDefinition.identity.name,
        workflow_id: workflowDefinition.identity.id
      }

      setExecutionResult(finalResult)

      // Save to localStorage for evaluation assistant dynamic pills
      try {
        const recentExecutions = JSON.parse(localStorage.getItem('recentWorkflowExecutions') || '[]')
        
        const executionData = {
          execution_id: result.execution_id,
          workflow_name: workflowDefinition.identity.name,
          workflow_category: workflowDefinition.identity.category,
          workflow_description: workflowDefinition.identity.description,
          workflow: workflow,
          input_data: inputData,
          created_at: Date.now(),
          status: result.status
        }
        
        // Add to front of array and keep only last 10
        recentExecutions.unshift(executionData)
        const trimmedExecutions = recentExecutions.slice(0, 10)
        
        localStorage.setItem('recentWorkflowExecutions', JSON.stringify(trimmedExecutions))
        console.log(`💾 Saved execution to localStorage: "${workflowDefinition.identity.name}"`)
      } catch (error) {
        console.error('Failed to save execution to localStorage:', error)
      }
      
      // If execution is still running, we could set up WebSocket here
      if (result.status === 'running') {
        console.log(`Execution started for "${workflowDefinition.identity.name}":`, result.execution_id)
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
          edges={edges}
          onNodesChange={handleNodesChange}
          onEdgesChange={handleEdgesChange}
          onConnect={onConnect}
          onInit={setReactFlowInstance}
          onDrop={onDrop}
          onDragOver={onDragOver}
          onNodesDelete={handleNodesDelete}
          nodeTypes={nodeTypes}
          nodesDraggable={true}
          nodesConnectable={true}
          elementsSelectable={true}
          fitView
          deleteKeyCode="Delete"
          className="bg-gradient-to-br from-slate-50 to-blue-50"
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
                  <p className="text-xs opacity-80">Drag, move & delete nodes manually</p>
                </div>
                <div className="flex items-center justify-center w-4 h-4 flex-shrink-0">
                  {useManualMode && (
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  )}
                </div>
              </button>
            </div>
          </Panel>
          

          
          {/* Floating Execution Panel - Top Right */}
          <Panel position="top-right" className="bg-white/95 backdrop-blur-sm p-4 rounded-xl shadow-lg border border-slate-200 w-80 z-50">
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