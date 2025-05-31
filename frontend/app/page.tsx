'use client'

import { useState, useCallback } from 'react'
import WorkflowEditor from './components/WorkflowEditor'
import ChatInterface from './components/ChatInterface'
import { TraceViewer } from './components/TraceViewer'
import { AnalyticsDashboard } from './components/AnalyticsDashboard'
import ExperimentsPage from './components/ExperimentsPage'
import EvaluationsPage from './components/EvaluationsPage'
import PreferencesModal from './components/settings/PreferencesModal'
import type { Node, Edge } from 'reactflow'
import { Workflow, MessageSquare, Settings, BarChart3, Beaker, FlaskConical } from 'lucide-react'
import { WorkflowManager } from './services/workflowManager'

export default function Home() {
  const [nodes, setNodes] = useState<Node[]>([])
  const [edges, setEdges] = useState<Edge[]>([])
  const [activeTab, setActiveTab] = useState<'design' | 'chat' | 'analytics' | 'experiments' | 'evaluations'>('chat')
  const [isExecuting, setIsExecuting] = useState(false)
  const [workflowExecutionInput, setWorkflowExecutionInput] = useState('Hello, please analyze this data and provide insights.')
  const [selectedExecutionId, setSelectedExecutionId] = useState<string | null>(null)
  const [isPreferencesOpen, setIsPreferencesOpen] = useState(false)
  const [workflowIdentity, setWorkflowIdentity] = useState<any>(null)

  const handleWorkflowChange = useCallback((newNodes: Node[], newEdges: Edge[]) => {
    setNodes(newNodes)
    setEdges(newEdges)
  }, [])

  const handleSuggestionToWorkflow = useCallback((suggestion: string) => {
    setWorkflowExecutionInput(suggestion)
    // Switch to design tab to show the updated input
    if (nodes.length > 0) {
      setActiveTab('design')
    }
  }, [nodes.length])

  const handleWorkflowCreated = useCallback((workflowNodes: Node[], workflowEdges: Edge[], identity?: any) => {
    console.log(`🎯 Main page received workflow: "${identity?.name || 'Unknown'}"`)
    setNodes(workflowNodes)
    setEdges(workflowEdges)
    if (identity) {
      setWorkflowIdentity(identity)
    }
    setActiveTab('design')
  }, [])

  const handleExecuteActions = useCallback((actions: any[]) => {
    console.log('🔧 Executing actions:', actions)
    
    // 🎯 Clear existing nodes when creating a new workflow from AI
    setNodes([])
    setEdges([])
    
    const newNodes: Node[] = []
    const newEdges: Edge[] = []
    
    // Keep track of node mappings for connections (name -> nodeId)
    const nodeIdMap = new Map<string, string>()

    // Simpler positioning - just arrange nodes in a horizontal line
    const nodeWidth = 300
    const nodeSpacing = 600

    console.log('🔧 Processing CREATE_NODE actions...')

    // 🎯 STEP 1: Process CREATE_NODE actions first
    actions
      .filter(action => action.type === 'CREATE_NODE')
      .forEach((action, index) => {
        const nodeId = `${action.nodeType}_${action.name}_${index}`.replace(/\s+/g, '_')
        
        const position = {
          x: 150 + (index * nodeSpacing),
          y: 250
        }
        
        const newNode: Node = {
          id: nodeId,
          type: 'agent', // All nodes use the same AgentNode component
          position: position,
          data: {
            label: action.name || `${action.nodeType} Node`,
            type: action.nodeType,
            name: action.name,
            instructions: action.instructions || `This is a ${action.nodeType} node`,
            model_id: action.model || 'gpt-4o-mini',
            description: `AI-generated ${action.nodeType} node`,
            // Set tool_type for tool nodes
            ...(action.nodeType === 'tool' && {
              tool_type: action.name?.toLowerCase().includes('search') || action.name?.toLowerCase().includes('web') 
                ? 'web_search'
                : action.name?.toLowerCase().includes('file')
                ? 'file_read'
                : action.name?.toLowerCase().includes('api')
                ? 'api_call'
                : action.name?.toLowerCase().includes('database')
                ? 'database_query'
                : action.name?.toLowerCase().includes('email')
                ? 'email_send'
                : 'web_search' // default for tool nodes
            })
          }
        }
        
        newNodes.push(newNode)
        
        // Map the action name to the node ID for connections
        nodeIdMap.set(action.name, nodeId)
        
        console.log(`🔧 Created node: ${action.name} -> ${nodeId}`)
      })

    console.log('🔧 Processing CONNECT_NODES actions...')
    console.log('🔧 Available nodes in map:', Array.from(nodeIdMap.keys()))

    // 🎯 STEP 2: Process CONNECT_NODES actions
    actions
      .filter(action => action.type === 'CONNECT_NODES')
      .forEach((action, index) => {
        const sourceNodeId = nodeIdMap.get(action.sourceId)
        const targetNodeId = nodeIdMap.get(action.targetId)
        
        if (sourceNodeId && targetNodeId) {
          const edgeId = `edge_${sourceNodeId}_to_${targetNodeId}`
          const newEdge: Edge = {
            id: edgeId,
            source: sourceNodeId,
            target: targetNodeId,
            type: 'default'
          }
          newEdges.push(newEdge)
          console.log(`🔧 Created connection: ${action.sourceId} -> ${action.targetId}`)
        } else {
          console.warn(`🔧 ⚠️ Failed to connect: ${action.sourceId} -> ${action.targetId}`)
          console.warn(`🔧 Source ID: ${sourceNodeId}, Target ID: ${targetNodeId}`)
        }
      })

    // 🎯 STEP 3: Update state
    console.log(`🔧 Final result: ${newNodes.length} nodes, ${newEdges.length} edges`)
    setNodes(newNodes)
    setEdges(newEdges)

    // Success notification
    if (newNodes.length > 0) {
      console.log('🔧 Created nodes:', newNodes.map(n => n.data.name))
      console.log('🔧 Created edges:', newEdges.map(e => `${e.source} -> ${e.target}`))
    }
  }, [])

  // 🎯 CONTEXT-FIRST APPROACH: Unified workflow creation handler
  const handleUseWorkflow = useCallback(async (actions: any[], smartContext?: string) => {
    console.log('🎯 Using unified workflow with:', { actions, smartContext })
    console.log('🎯 Smart context type:', typeof smartContext)
    console.log('🎯 Smart context value:', JSON.stringify(smartContext))
    
    // 🎯 FIRST: Apply the smart context to the execution input (before anything else!)
    if (smartContext) {
      // Remove surrounding quotes if they exist
      const cleanedContext = smartContext.replace(/^"(.*)"$/, '$1')
      console.log('✨ About to set workflow execution input to:', cleanedContext)
      setWorkflowExecutionInput(cleanedContext)
      console.log('✨ Applied smart context to execution input:', cleanedContext)
      console.log('✨ Current workflowExecutionInput state will be:', cleanedContext)
    } else {
      console.log('❌ No smart context provided - smartContext is:', smartContext)
    }
    
    // 🎯 SECOND: Execute the actions to create nodes and edges
    const { newNodes, newEdges } = handleExecuteActionsAndReturn(actions)
    
    // 🎯 THIRD: Generate workflow identity
    let workflowIdentity = null
    if (newNodes.length > 0) {
      try {
        console.log('🎯 Generating workflow identity for new workflow...')
        const workflowDefinition = await WorkflowManager.createOrUpdateWorkflow(
          newNodes, 
          newEdges, 
          smartContext || 'AI-generated workflow'
        )
        workflowIdentity = workflowDefinition.identity
        console.log(`🎯 Generated workflow identity: "${workflowIdentity.name}"`)
      } catch (error) {
        console.error('Error generating workflow identity:', error)
      }
    }
    
    // 🎯 FOURTH: Call the workflow created callback with all the data
    if (handleWorkflowCreated && newNodes.length > 0) {
      handleWorkflowCreated(newNodes, newEdges, workflowIdentity)
    }
    
    // 🎯 FIFTH: Switch to design tab to show the complete workflow (with correct input)
    setActiveTab('design')
    
    // Show enhanced success notification
    const nodeCount = actions.filter(a => a.type === 'CREATE_NODE').length
    const edgeCount = actions.filter(a => a.type === 'CONNECT_NODES').length
    
    if (nodeCount > 0 || edgeCount > 0) {
      const contextMessage = smartContext ? ` with input "${smartContext.replace(/^"(.*)"$/, '$1')}"` : ''
      const workflowName = workflowIdentity?.name || 'New Workflow'
      alert(`🎯 "${workflowName}" ready! Created ${nodeCount} nodes and ${edgeCount} connections${contextMessage}`)
    }
  }, [handleWorkflowCreated])

  // Helper function to execute actions and return the created nodes and edges
  const handleExecuteActionsAndReturn = useCallback((actions: any[]) => {
    console.log('🔧 Executing actions:', actions)
    
    // 🎯 Clear existing nodes when creating a new workflow from AI
    setNodes([])
    setEdges([])
    
    const newNodes: Node[] = []
    const newEdges: Edge[] = []
    
    // Keep track of node mappings for connections (name -> nodeId)
    const nodeIdMap = new Map<string, string>()

    // Simpler positioning - just arrange nodes in a horizontal line
    const nodeWidth = 300
    const nodeSpacing = 600

    console.log('🔧 Processing CREATE_NODE actions...')

    // 🎯 STEP 1: Process CREATE_NODE actions first
    actions
      .filter(action => action.type === 'CREATE_NODE')
      .forEach((action, index) => {
        const nodeId = `${action.nodeType}_${action.name}_${index}`.replace(/\s+/g, '_')
        
        const position = {
          x: 150 + (index * nodeSpacing),
          y: 200
        }
        
        const newNode: Node = {
          id: nodeId,
          type: 'agent', // All nodes use the same AgentNode component
          position: position,
          data: {
            label: action.name || `${action.nodeType} Node`,
            type: action.nodeType,
            name: action.name,
            instructions: action.instructions || `This is a ${action.nodeType} node`,
            model_id: action.model || 'gpt-4o-mini',
            description: `AI-generated ${action.nodeType} node`,
            // Set tool_type for tool nodes
            ...(action.nodeType === 'tool' && {
              tool_type: action.name?.toLowerCase().includes('search') || action.name?.toLowerCase().includes('web') 
                ? 'web_search'
                : action.name?.toLowerCase().includes('file')
                ? 'file_read'
                : action.name?.toLowerCase().includes('api')
                ? 'api_call'
                : action.name?.toLowerCase().includes('database')
                ? 'database_query'
                : action.name?.toLowerCase().includes('email')
                ? 'email_send'
                : 'web_search' // default for tool nodes
            })
          }
        }
        
        newNodes.push(newNode)
        
        // Map the action name to the node ID for connections
        nodeIdMap.set(action.name, nodeId)
        
        console.log(`🔧 Created node: ${action.name} -> ${nodeId}`)
      })

    console.log('🔧 Processing CONNECT_NODES actions...')
    console.log('🔧 Available nodes in map:', Array.from(nodeIdMap.keys()))

    // 🎯 STEP 2: Process CONNECT_NODES actions
    actions
      .filter(action => action.type === 'CONNECT_NODES')
      .forEach((action, index) => {
        const sourceNodeId = nodeIdMap.get(action.sourceId)
        const targetNodeId = nodeIdMap.get(action.targetId)
        
        if (sourceNodeId && targetNodeId) {
          const edgeId = `edge_${sourceNodeId}_to_${targetNodeId}`
          const newEdge: Edge = {
            id: edgeId,
            source: sourceNodeId,
            target: targetNodeId,
            type: 'default'
          }
          newEdges.push(newEdge)
          console.log(`🔧 Created connection: ${action.sourceId} -> ${action.targetId}`)
        } else {
          console.warn(`🔧 ⚠️ Failed to connect: ${action.sourceId} -> ${action.targetId}`)
          console.warn(`🔧 Source ID: ${sourceNodeId}, Target ID: ${targetNodeId}`)
        }
      })

    // 🎯 STEP 3: Update state
    console.log(`🔧 Final result: ${newNodes.length} nodes, ${newEdges.length} edges`)
    setNodes(newNodes)
    setEdges(newEdges)

    // Success notification
    if (newNodes.length > 0) {
      console.log('🔧 Created nodes:', newNodes.map(n => n.data.name))
      console.log('🔧 Created edges:', newEdges.map(e => `${e.source} -> ${e.target}`))
    }

    return { newNodes, newEdges }
  }, [])

  return (
    <div className="h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex flex-col">
      {/* Modern Header */}
      <div className="bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-3">
          <div className="flex items-center justify-between">
            {/* Brand Section */}
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center shadow-sm">
                <Workflow className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-slate-900">any-agent Composer</h1>
                <p className="text-xs text-slate-500">Build AI workflows visually</p>
              </div>
            </div>
            
            {/* Main Navigation */}
            <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-xl border border-slate-200">
              <button
                onClick={() => setActiveTab('chat')}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                  activeTab === 'chat' 
                    ? 'bg-white text-slate-900 shadow-sm border border-slate-200' 
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                }`}
              >
                <MessageSquare className="w-4 h-4" />
                <span>AI Assistant</span>
              </button>
              
              <button
                onClick={() => setActiveTab('design')}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                  activeTab === 'design' 
                    ? 'bg-white text-slate-900 shadow-sm border border-slate-200' 
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                }`}
              >
                <Workflow className="w-4 h-4" />
                <span>Design</span>
                {nodes.length > 0 && (
                  <span className="bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded-full font-medium">
                    {nodes.length}
                  </span>
                )}
              </button>
              
              <button
                onClick={() => setActiveTab('analytics')}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                  activeTab === 'analytics' 
                    ? 'bg-white text-slate-900 shadow-sm border border-slate-200' 
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                }`}
              >
                <BarChart3 className="w-4 h-4" />
                <span>Analytics</span>
              </button>
              
              <button
                onClick={() => setActiveTab('experiments')}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                  activeTab === 'experiments' 
                    ? 'bg-white text-slate-900 shadow-sm border border-slate-200' 
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                }`}
              >
                <Beaker className="w-4 h-4" />
                <span>A/B Testing</span>
              </button>
              
              <button
                onClick={() => setActiveTab('evaluations')}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                  activeTab === 'evaluations' 
                    ? 'bg-white text-slate-900 shadow-sm border border-slate-200' 
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                }`}
              >
                <FlaskConical className="w-4 h-4" />
                <span>Evaluations</span>
              </button>
            </div>

            {/* Settings Button */}
            <div className="flex items-center">
              <button
                onClick={() => {
                  console.log('Settings button clicked')
                  setIsPreferencesOpen(true)
                }}
                className="flex items-center gap-2 px-4 py-2.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors border border-transparent hover:border-slate-200"
                title="Settings & Preferences"
              >
                <Settings className="w-4 h-4" />
                <span className="text-sm font-medium">Settings</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'chat' ? (
          <div className="h-full max-w-4xl mx-auto">
            {/* Welcome Banner for Chat */}
            {nodes.length === 0 && (
              <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6 m-6 rounded-xl">
                <h2 className="text-xl font-bold mb-2">🤖 Welcome to your AI Workflow Assistant!</h2>
                <p className="text-blue-100 mb-4">
                  Tell me what kind of workflow you want to build, and I'll create the nodes and connections for you automatically.
                </p>
                <div className="flex flex-wrap gap-2">
                  <span className="bg-white/20 px-3 py-1 rounded-full text-sm">Try: "Build a customer support chatbot"</span>
                  <span className="bg-white/20 px-3 py-1 rounded-full text-sm">Try: "Create a data analysis pipeline"</span>
                  <span className="bg-white/20 px-3 py-1 rounded-full text-sm">Try: "Make a content generation workflow"</span>
                </div>
              </div>
            )}
            <ChatInterface 
              workflowContext={{ nodes, edges }} 
              onExecuteActions={handleExecuteActions}
              onSuggestionToWorkflow={handleSuggestionToWorkflow}
              onUseWorkflow={handleUseWorkflow}
              onWorkflowCreated={handleWorkflowCreated}
            />
          </div>
        ) : activeTab === 'experiments' ? (
          <div className="h-full">
            <ExperimentsPage />
          </div>
        ) : activeTab === 'analytics' ? (
          <div className="h-full">
            <AnalyticsDashboard 
              onExecutionSelect={(executionId) => {
                setSelectedExecutionId(executionId)
                // Keep on analytics tab, the TraceViewer will be shown as overlay/modal
              }}
            />
            {/* Show TraceViewer as overlay modal when execution is selected */}
            {selectedExecutionId && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white rounded-lg shadow-xl w-full h-full max-w-7xl max-h-[95vh] m-4 overflow-hidden">
                  <TraceViewer 
                    executionId={selectedExecutionId}
                    onClose={() => {
                      setSelectedExecutionId(null)
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        ) : activeTab === 'evaluations' ? (
          <div className="h-full">
            <EvaluationsPage />
          </div>
        ) : (
          <div className="h-full">
            {/* Empty State for Visual Designer */}
            {nodes.length === 0 ? (
              <div className="h-full flex items-center justify-center">
                <div className="text-center max-w-md">
                  <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Workflow className="w-10 h-10 text-slate-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">No workflow yet</h3>
                  <p className="text-slate-600 mb-6">
                    Start by asking the AI Assistant to create a workflow for you, or drag nodes from the sidebar to begin building.
                  </p>
                  <button
                    onClick={() => setActiveTab('chat')}
                    className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
                  >
                    Go to AI Assistant
                  </button>
                </div>
              </div>
            ) : (
              <WorkflowEditor 
                nodes={nodes}
                edges={edges}
                onNodesChange={setNodes}
                onEdgesChange={setEdges}
                onWorkflowChange={handleWorkflowChange}
                executionInput={workflowExecutionInput}
                onExecutionInputChange={setWorkflowExecutionInput}
                workflowIdentity={workflowIdentity}
              />
            )}
          </div>
        )}
      </div>
      
      {/* Preferences Modal */}
      <PreferencesModal 
        isOpen={isPreferencesOpen}
        onClose={() => setIsPreferencesOpen(false)}
      />
    </div>
  )
}
