'use client'

import { useState, useCallback } from 'react'
import WorkflowEditor from './components/WorkflowEditor'
import ChatInterface from './components/ChatInterface'
import type { Node, Edge } from 'reactflow'
import { Workflow, MessageSquare, Settings, Play } from 'lucide-react'

export default function Home() {
  const [nodes, setNodes] = useState<Node[]>([])
  const [edges, setEdges] = useState<Edge[]>([])
  const [activeTab, setActiveTab] = useState<'design' | 'chat'>('chat')
  const [isExecuting, setIsExecuting] = useState(false)

  const handleWorkflowChange = useCallback((newNodes: Node[], newEdges: Edge[]) => {
    setNodes(newNodes)
    setEdges(newEdges)
  }, [])

  const handleExecuteActions = useCallback((actions: any[]) => {
    console.log('Executing actions:', actions)
    
    const newNodes: Node[] = []
    const newEdges: Edge[] = []
    let yPosition = 100

    // Process CREATE_NODE actions
    actions.forEach((action, index) => {
      if (action.type === 'CREATE_NODE') {
        const nodeId = `${action.nodeType}-${Date.now()}-${index}`
        
        const newNode: Node = {
          id: nodeId,
          type: 'agent',
          position: { x: 200 + (index * 250), y: yPosition },
          data: {
            label: action.name || `${action.nodeType} Node`,
            type: action.nodeType,
            name: action.name,
            instructions: action.instructions,
            model_id: action.model || 'gpt-4.1'
          }
        }
        newNodes.push(newNode)
      }
    })

    // Process CONNECT_NODES actions  
    actions.forEach((action) => {
      if (action.type === 'CONNECT_NODES' && action.sourceId && action.targetId) {
        const edgeId = `edge-${action.sourceId}-${action.targetId}`
        const newEdge: Edge = {
          id: edgeId,
          source: action.sourceId,
          target: action.targetId,
          type: 'default'
        }
        newEdges.push(newEdge)
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
      alert(`✅ Created ${newNodes.length} nodes and ${newEdges.length} connections!`)
    }
  }, [])

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
            </div>

            {/* Quick Stats */}
            <div className="flex items-center gap-4 text-sm">
              <div className="text-slate-600">
                <span className="font-medium">{nodes.length}</span> nodes
              </div>
              <div className="text-slate-600">
                <span className="font-medium">{edges.length}</span> connections
              </div>
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
            />
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
              />
            )}
          </div>
        )}
      </div>
    </div>
  )
}
