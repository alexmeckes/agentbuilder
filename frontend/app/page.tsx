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

export default function Home() {
  const [nodes, setNodes] = useState<Node[]>([])
  const [edges, setEdges] = useState<Edge[]>([])
  const [activeTab, setActiveTab] = useState<'design' | 'chat' | 'analytics' | 'experiments' | 'evaluations'>('chat')

  const [workflowExecutionInput, setWorkflowExecutionInput] = useState('Hello, please analyze this data and provide insights.')
  const [selectedExecutionId, setSelectedExecutionId] = useState<string | null>(null)
  const [isPreferencesOpen, setIsPreferencesOpen] = useState(false)
  const [isManualMode, setIsManualMode] = useState(false)

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

  const handleUseWorkflow = useCallback(async (actions: any[], smartContext?: string) => {
    console.log('🎯 Using workflow from chat:', actions)
    
    // Create the visual nodes using existing logic
    const newNodes: Node[] = []
    const newEdges: Edge[] = []
    
    // Keep track of node mappings for connections
    const nodeIdMap = new Map<string, string>() // original name -> actual ID

    // Advanced spacing algorithm (same as drag-and-drop)
    const nodeWidth = 500 // Much larger width to account for any expanded state
    const nodeHeight = 400 // Much larger height for any expanded content  
    const padding = 200 // Very large padding between nodes

    const findAvailablePosition = (existingNodes: Node[], startX: number = 100, startY: number = 100) => {
      const position = { x: startX, y: startY }
      let attempts = 0
      const maxAttempts = 30

      while (attempts < maxAttempts) {
        const hasOverlap = existingNodes.some(node => {
          const dx = Math.abs(node.position.x - position.x)
          const dy = Math.abs(node.position.y - position.y)
          return dx < nodeWidth + padding && dy < nodeHeight + padding
        })

        if (!hasOverlap) break

        // Try different positions with very generous spacing
        if (attempts < 10) {
          // Try to the right with much more spacing
          position.x += nodeWidth + padding
        } else if (attempts < 20) {
          // Try below with much more spacing
          position.x = startX
          position.y += nodeHeight + padding
        } else {
          // Try diagonal positioning with very generous spacing
          position.x = startX + (attempts - 20) * (nodeWidth + padding)
          position.y = startY + (attempts - 20) * (nodeHeight + padding)
        }
        attempts++
      }

      return position
    }

    // Create nodes from actions
    actions.forEach((action, index) => {
      if (action.type === 'CREATE_NODE') {
        const nodeId = `${action.nodeType}-${Date.now()}-${index}`
        
        console.log(`🔧 Creating node for action:`, {
          actionType: action.type,
          nodeType: action.nodeType,
          name: action.name,
          instructions: action.instructions,
          model: action.model
        })
        
        // Find available position using advanced spacing
        const allExistingNodes = [...nodes, ...newNodes]
        const position = findAvailablePosition(allExistingNodes, 100, 100)
        
        const newNode: Node = {
          id: nodeId,
          type: 'agent',
          position: position,
          data: {
            label: action.name || `${action.nodeType} Node`,
            type: action.nodeType,
            name: action.name,
            instructions: action.instructions,
            model_id: action.model || 'gpt-4.1',
            description: `AI-generated ${action.nodeType} node`,
            // Auto-detect tool_type for tool nodes
            ...(action.nodeType === 'tool' && {
              tool_type: action.name?.toLowerCase().includes('search') || action.name?.toLowerCase().includes('web') 
                ? 'web_search'
                : action.name?.toLowerCase().includes('file') && action.name?.toLowerCase().includes('read')
                ? 'file_read'
                : action.name?.toLowerCase().includes('file') && action.name?.toLowerCase().includes('write')
                ? 'file_write'
                : action.name?.toLowerCase().includes('api')
                ? 'api_call'
                : action.name?.toLowerCase().includes('database')
                ? 'database_query'
                : action.name?.toLowerCase().includes('image')
                ? 'image_generation'
                : 'web_search' // default to web_search for tool nodes
            })
          }
        }
        newNodes.push(newNode)
        
        // Map the original name to the actual node ID for connections
        if (action.name) {
          nodeIdMap.set(action.name, nodeId)
        }
        nodeIdMap.set(`${action.nodeType}-${index}`, nodeId)
      }
    })

    // Create connections
    actions.forEach((action) => {
      if (action.type === 'CONNECT_NODES' && action.sourceId && action.targetId) {
        let sourceNodeId = action.sourceId
        let targetNodeId = action.targetId
        
        if (nodeIdMap.has(action.sourceId)) {
          sourceNodeId = nodeIdMap.get(action.sourceId)!
        }
        if (nodeIdMap.has(action.targetId)) {
          targetNodeId = nodeIdMap.get(action.targetId)!
        }
        
        const edgeId = `edge-${sourceNodeId}-${targetNodeId}`
        const newEdge: Edge = {
          id: edgeId,
          source: sourceNodeId,
          target: targetNodeId,
          type: 'default'
        }
        newEdges.push(newEdge)
      }
    })

    // Update the state with new nodes and edges
    const allNodes = [...nodes, ...newNodes]
    const allEdges = [...edges, ...newEdges]
    
    console.log(`🎯 Created ${newNodes.length} new nodes:`, newNodes.map(n => ({
      id: n.id,
      type: n.type,
      dataType: n.data.type,
      name: n.data.name
    })))
    
    setNodes(allNodes)
    setEdges(allEdges)

    // Switch to design tab so user can review the created workflow
    setActiveTab('design')
    
    // Update execution input with smart context if provided
    if (smartContext) {
      setWorkflowExecutionInput(smartContext)
    }
    
    // Show success notification
    alert(`✅ Workflow created successfully! Switch to the Design tab to review and execute it.`)
  }, [nodes, edges])

  const handleExecuteActions = useCallback((actions: any[]) => {
    console.log('Executing actions:', actions)
    
    const newNodes: Node[] = []
    const newEdges: Edge[] = []
    
    // Keep track of node mappings for connections
    const nodeIdMap = new Map<string, string>() // original name -> actual ID

    // Advanced spacing algorithm (same as drag-and-drop)
    const nodeWidth = 500 // Much larger width to account for any expanded state
    const nodeHeight = 400 // Much larger height for any expanded content  
    const padding = 200 // Very large padding between nodes

    const findAvailablePosition = (existingNodes: Node[], startX: number = 100, startY: number = 100) => {
      const position = { x: startX, y: startY }
      let attempts = 0
      const maxAttempts = 30

      while (attempts < maxAttempts) {
        const hasOverlap = existingNodes.some(node => {
          const dx = Math.abs(node.position.x - position.x)
          const dy = Math.abs(node.position.y - position.y)
          return dx < nodeWidth + padding && dy < nodeHeight + padding
        })

        if (!hasOverlap) break

        // Try different positions with very generous spacing
        if (attempts < 10) {
          // Try to the right with much more spacing
          position.x += nodeWidth + padding
        } else if (attempts < 20) {
          // Try below with much more spacing
          position.x = startX
          position.y += nodeHeight + padding
        } else {
          // Try diagonal positioning with very generous spacing
          position.x = startX + (attempts - 20) * (nodeWidth + padding)
          position.y = startY + (attempts - 20) * (nodeHeight + padding)
        }
        attempts++
      }

      return position
    }

    // Process CREATE_NODE actions first
    actions.forEach((action, index) => {
      if (action.type === 'CREATE_NODE') {
        const nodeId = `${action.nodeType}-${Date.now()}-${index}`
        
        // Find available position using advanced spacing
        const allExistingNodes = [...nodes, ...newNodes]
        const position = findAvailablePosition(allExistingNodes, 100, 100)
        
        const newNode: Node = {
          id: nodeId,
          type: 'agent',
          position: position,
          data: {
            label: action.name || `${action.nodeType} Node`,
            type: action.nodeType,
            name: action.name,
            instructions: action.instructions,
            model_id: action.model || 'gpt-4.1',
            description: `AI-generated ${action.nodeType} node`,
            // Auto-detect tool_type for tool nodes
            ...(action.nodeType === 'tool' && {
              tool_type: action.name?.toLowerCase().includes('search') || action.name?.toLowerCase().includes('web') 
                ? 'web_search'
                : action.name?.toLowerCase().includes('file') && action.name?.toLowerCase().includes('read')
                ? 'file_read'
                : action.name?.toLowerCase().includes('file') && action.name?.toLowerCase().includes('write')
                ? 'file_write'
                : action.name?.toLowerCase().includes('api')
                ? 'api_call'
                : action.name?.toLowerCase().includes('database')
                ? 'database_query'
                : action.name?.toLowerCase().includes('image')
                ? 'image_generation'
                : 'web_search' // default to web_search for tool nodes
            })
          }
        }
        newNodes.push(newNode)
        
        // Map the original name to the actual node ID for connections
        if (action.name) {
          nodeIdMap.set(action.name, nodeId)
        }
        // Also map the nodeType for fallback
        nodeIdMap.set(`${action.nodeType}-${index}`, nodeId)
      }
    })

    // Process CONNECT_NODES actions after all nodes are created
    actions.forEach((action) => {
      if (action.type === 'CONNECT_NODES' && action.sourceId && action.targetId) {
        // Try to resolve the actual node IDs
        let sourceNodeId = action.sourceId
        let targetNodeId = action.targetId
        
        // Check if these are node names that need to be mapped to actual IDs
        if (nodeIdMap.has(action.sourceId)) {
          sourceNodeId = nodeIdMap.get(action.sourceId)!
        } else {
          // Check existing nodes for a match
          const existingSourceNode = [...nodes, ...newNodes].find(n => 
            n.data.name === action.sourceId || n.id === action.sourceId
          )
          if (existingSourceNode) {
            sourceNodeId = existingSourceNode.id
          }
        }
        
        if (nodeIdMap.has(action.targetId)) {
          targetNodeId = nodeIdMap.get(action.targetId)!
        } else {
          // Check existing nodes for a match
          const existingTargetNode = [...nodes, ...newNodes].find(n => 
            n.data.name === action.targetId || n.id === action.targetId
          )
          if (existingTargetNode) {
            targetNodeId = existingTargetNode.id
          }
        }
        
        const edgeId = `edge-${sourceNodeId}-${targetNodeId}`
        const newEdge: Edge = {
          id: edgeId,
          source: sourceNodeId,
          target: targetNodeId,
          type: 'default'
        }
        newEdges.push(newEdge)
        
        console.log('Created edge:', newEdge)
      }
    })

    if (newNodes.length > 0) {
      setNodes(prevNodes => [...prevNodes, ...newNodes])
      setActiveTab('design') // Switch to design view to show created nodes
    }
    
    if (newEdges.length > 0) {
      setEdges(prevEdges => [...prevEdges, ...newEdges])
    }

    // Show success notification
    if (newNodes.length > 0 || newEdges.length > 0) {
      console.log('Created nodes:', newNodes)
      console.log('Created edges:', newEdges)
      alert(`✅ Created ${newNodes.length} nodes and ${newEdges.length} connections!`)
    }
  }, [nodes])

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
              <div className="flex items-center gap-2">
                <span className="bg-green-100 text-green-700 text-xs px-2 py-1 rounded-full font-medium">
                  ✨ Latest
                </span>
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
          <div className="h-full relative">
            {/* Always render WorkflowEditor so users have access to sidebar and mode toggle */}
            <WorkflowEditor 
              nodes={nodes}
              edges={edges}
              onNodesChange={setNodes}
              onEdgesChange={setEdges}
              onWorkflowChange={handleWorkflowChange}
              executionInput={workflowExecutionInput}
              onExecutionInputChange={setWorkflowExecutionInput}
              initialManualMode={isManualMode}
              onManualModeChange={setIsManualMode}
            />
            
            {/* Welcome overlay when no nodes exist */}
            {nodes.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center bg-slate-50/80 backdrop-blur-sm pointer-events-none">
                <div className="text-center max-w-lg pointer-events-auto">
                  <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Workflow className="w-10 h-10 text-blue-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">Ready to build your workflow</h3>
                  <p className="text-slate-600 mb-6">
                    Use the <strong>mode toggle</strong> (top-left) to switch to Manual Design, then drag nodes from the sidebar. Or try the AI Assistant for automatic workflow creation.
                  </p>
                  <div className="flex items-center justify-center gap-6">
                    <div className="text-center">
                      <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-2">
                        <Settings className="w-6 h-6 text-green-600" />
                      </div>
                      <h4 className="text-sm font-medium text-slate-900 mb-1">Manual Design</h4>
                      <p className="text-xs text-slate-600">Toggle mode & drag nodes</p>
                    </div>
                    <div className="text-center">
                      <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-2">
                        <MessageSquare className="w-6 h-6 text-blue-600" />
                      </div>
                      <h4 className="text-sm font-medium text-slate-900 mb-1">AI Assistant</h4>
                      <p className="text-xs text-slate-600">Describe your workflow</p>
                    </div>
                  </div>
                  <div className="mt-6 flex items-center gap-3">
                    <button
                      onClick={() => {
                        setIsManualMode(true)
                      }}
                      className="bg-green-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-green-700 transition-colors flex items-center gap-2"
                    >
                      <Settings className="w-4 h-4" />
                      Try Manual Mode
                    </button>
                    <span className="text-slate-400">or</span>
                    <button
                      onClick={() => setActiveTab('chat')}
                      className="bg-blue-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center gap-2"
                    >
                      <MessageSquare className="w-4 h-4" />
                      Try AI Assistant
                    </button>
                  </div>
                </div>
              </div>
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
