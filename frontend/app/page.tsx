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
import { Workflow, MessageSquare, Settings, Play, BarChart3, Beaker, FlaskConical } from 'lucide-react'

export default function Home() {
  const [nodes, setNodes] = useState<Node[]>([])
  const [edges, setEdges] = useState<Edge[]>([])
  const [activeTab, setActiveTab] = useState<'design' | 'chat' | 'trace' | 'analytics' | 'experiments' | 'evaluations'>('chat')
  const [isExecuting, setIsExecuting] = useState(false)
  const [workflowExecutionInput, setWorkflowExecutionInput] = useState('Hello, please analyze this data and provide insights.')
  const [selectedExecutionId, setSelectedExecutionId] = useState<string | null>(null)
  const [isPreferencesOpen, setIsPreferencesOpen] = useState(false)

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
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center">
                <Workflow className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900">any-agent Composer</h1>
                <p className="text-sm text-slate-500">Build AI workflows visually</p>
              </div>
            </div>
            
            {/* Tab Navigation */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
              <button
                onClick={() => setActiveTab('chat')}
                className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === 'chat' 
                    ? 'bg-white text-slate-900 shadow-sm' 
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <MessageSquare className="w-4 h-4" />
                AI Assistant
              </button>
              <button
                onClick={() => setActiveTab('design')}
                className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === 'design' 
                    ? 'bg-white text-slate-900 shadow-sm' 
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Workflow className="w-4 h-4" />
                Visual Designer
                {nodes.length > 0 && (
                  <span className="bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded-full">
                    {nodes.length}
                  </span>
                )}
              </button>
              <button
                onClick={() => setActiveTab('experiments')}
                className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === 'experiments' 
                    ? 'bg-white text-slate-900 shadow-sm' 
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Beaker className="w-4 h-4" />
                A/B Testing
              </button>
              <button
                onClick={() => setActiveTab('trace')}
                className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === 'trace' 
                    ? 'bg-white text-slate-900 shadow-sm' 
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Play className="w-4 h-4" />
                Trace Viewer
              </button>
              <button
                onClick={() => setActiveTab('analytics')}
                className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === 'analytics' 
                    ? 'bg-white text-slate-900 shadow-sm' 
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <BarChart3 className="w-4 h-4" />
                Analytics
              </button>
              <button
                onClick={() => setActiveTab('evaluations')}
                className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === 'evaluations' 
                    ? 'bg-white text-slate-900 shadow-sm' 
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <FlaskConical className="w-4 h-4" />
                Evaluations
              </button>
            </div>

            {/* Quick Stats */}
            <div className="flex items-center gap-4 text-sm">
              <div className="text-slate-600">
                <span className="font-medium">{nodes.length}</span> nodes
              </div>
              <div className="text-slate-600">
                <span className="font-medium">{edges.length}</span> connections
              </div>
              <button
                onClick={() => setIsPreferencesOpen(true)}
                className="flex items-center gap-2 px-3 py-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                title="Settings & Preferences"
              >
                <Settings className="w-4 h-4" />
                Settings
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
            />
          </div>
        ) : activeTab === 'experiments' ? (
          <div className="h-full">
            <ExperimentsPage />
          </div>
        ) : activeTab === 'trace' ? (
          <div className="h-full">
            <TraceViewer 
              executionId={selectedExecutionId}
              onClose={() => {
                setSelectedExecutionId(null)
                setActiveTab('analytics')
              }}
            />
          </div>
        ) : activeTab === 'analytics' ? (
          <div className="h-full">
            <AnalyticsDashboard 
              onExecutionSelect={(executionId) => {
                setSelectedExecutionId(executionId)
                setActiveTab('trace')
              }}
            />
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
