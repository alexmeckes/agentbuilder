'use client'

import { useState, useCallback, useEffect } from 'react'
import WorkflowEditor from './components/WorkflowEditor'
import ChatInterface from './components/ChatInterface'
import { TraceViewer } from './components/TraceViewer'
import { AnalyticsDashboard } from './components/AnalyticsDashboard'
import EvaluationsPage from './components/EvaluationsPage'
import PreferencesModal from './components/settings/PreferencesModal'
import UserSettingsModal from './components/settings/UserSettingsModal'
import type { Node, Edge } from 'reactflow'
import { Workflow, MessageSquare, Settings, BarChart3, FlaskConical, User } from 'lucide-react'
import { detectComposioToolFromName } from './config/composio-tools'

export default function Home() {
  const [nodes, setNodes] = useState<Node[]>([])
  const [edges, setEdges] = useState<Edge[]>([])
  const [activeTab, setActiveTab] = useState<'design' | 'chat' | 'analytics' | 'evaluations'>('chat')

  const [workflowExecutionInput, setWorkflowExecutionInput] = useState('Hello, please analyze this data and provide insights.')
  const [selectedExecutionId, setSelectedExecutionId] = useState<string | null>(null)
  const [isPreferencesOpen, setIsPreferencesOpen] = useState(false)
  const [isUserSettingsOpen, setIsUserSettingsOpen] = useState(false)
  // Manual mode state removed - canvas is always visible now
  const [userSettings, setUserSettings] = useState<any>(null)

  // Page-level node deletion handler
  const handleNodeDelete = useCallback((nodeId: string) => {
    console.log('🗑️ Page-level: Deleting node:', nodeId)
    
    // Use setTimeout to ensure we're outside of any React event handling
    setTimeout(() => {
      setNodes(currentNodes => {
        const nodeExists = currentNodes.find(node => node.id === nodeId)
        if (!nodeExists) {
          console.log(`ℹ️ Node ${nodeId} not found, already deleted`)
          return currentNodes
        }
        console.log(`✅ Page-level: Removing node ${nodeId}`)
        return currentNodes.filter(node => node.id !== nodeId)
      })
      
      setEdges(currentEdges => {
        const edgesToRemove = currentEdges.filter(edge => 
          edge.source === nodeId || edge.target === nodeId
        )
        console.log(`🔗 Page-level: Removing ${edgesToRemove.length} connected edges`)
        return currentEdges.filter(edge => 
          edge.source !== nodeId && edge.target !== nodeId
        )
      })
    }, 0)
  }, [])

  // Page-level node update handler
  const handleNodeUpdate = useCallback((nodeId: string, updatedData: any) => {
    console.log('🔧 Page-level: Updating node:', nodeId, 'with data:', updatedData)
    setNodes(currentNodes => 
      currentNodes.map(node => 
        node.id === nodeId 
          ? { ...node, data: { ...node.data, ...updatedData } }
          : node
      )
    )
  }, [])

  const handleWorkflowChange = useCallback((newNodes: Node[], newEdges: Edge[]) => {
    setNodes(newNodes)
    setEdges(newEdges)
  }, [])

  // Enhanced nodes change handler that ensures callbacks are always present
  const handleNodesChange = useCallback((newNodes: Node[]) => {
    console.log('🔄 Page-level handleNodesChange called with:', newNodes.length, 'nodes')
    
    // Check which nodes are missing callbacks
    const nodesWithoutCallbacks = newNodes.filter(node => !node.data.onNodeDelete || !node.data.onNodeUpdate)
    if (nodesWithoutCallbacks.length > 0) {
      console.log('🔧 Adding callbacks to', nodesWithoutCallbacks.length, 'nodes:', nodesWithoutCallbacks.map(n => ({ id: n.id, type: n.type })))
    }
    
    // Ensure every node has the proper callbacks
    const nodesWithCallbacks = newNodes.map(node => ({
      ...node,
      data: {
        ...node.data,
        onNodeUpdate: handleNodeUpdate,
        onNodeDelete: handleNodeDelete,
      }
    }))
    
    console.log('✅ Page-level: Setting nodes with callbacks:', nodesWithCallbacks.map(n => ({ 
      id: n.id, 
      type: n.type, 
      hasDelete: !!n.data.onNodeDelete, 
      hasUpdate: !!n.data.onNodeUpdate 
    })))
    
    // Update React state (ReactFlow will automatically sync with this)
    setNodes(nodesWithCallbacks)
  }, [handleNodeUpdate, handleNodeDelete])

  // Hydration effect: Ensure all existing nodes always have callbacks
  // This runs when the component mounts or when callback functions change
  useEffect(() => {
    setNodes(currentNodes => {
      if (currentNodes.length === 0) return currentNodes
      
      // Check if any node needs callback hydration
      const nodesWithoutDelete = currentNodes.filter(node => !node.data.onNodeDelete)
      const nodesWithoutUpdate = currentNodes.filter(node => !node.data.onNodeUpdate)
      
      console.log(`🔍 Checking ${currentNodes.length} nodes for callbacks:`)
      console.log(`   - Nodes without onNodeDelete: ${nodesWithoutDelete.length}`)
      console.log(`   - Nodes without onNodeUpdate: ${nodesWithoutUpdate.length}`)
      
      if (nodesWithoutDelete.length > 0) {
        console.log('🔧 Nodes missing onNodeDelete:', nodesWithoutDelete.map(n => ({ id: n.id, type: n.type })))
      }
      
      const needsHydration = nodesWithoutDelete.length > 0 || nodesWithoutUpdate.length > 0
      
      if (needsHydration) {
        console.log('🔧 Hydrating nodes with callbacks...')
        const hydratedNodes = currentNodes.map(node => ({
          ...node,
          data: {
            ...node.data,
            onNodeUpdate: handleNodeUpdate,
            onNodeDelete: handleNodeDelete,
          }
        }))
        
        console.log('✅ Hydrated nodes:', hydratedNodes.map(n => ({ 
          id: n.id, 
          type: n.type, 
          hasDelete: !!n.data.onNodeDelete, 
          hasUpdate: !!n.data.onNodeUpdate 
        })))
        
        return hydratedNodes
      }
      
      return currentNodes // No changes needed
    })
  }, [handleNodeUpdate, handleNodeDelete])

  // Listen for fallback node deletions and update React state
  useEffect(() => {
    const handleFallbackDeletion = (event: CustomEvent) => {
      const { nodeId } = event.detail
      console.log(`🔔 Page-level: Received fallback deletion event for node ${nodeId}`)
      
      // Call the proper deletion handler to update React state
      handleNodeDelete(nodeId)
    }

    // Add event listener for fallback deletions
    document.addEventListener('nodeDeleteFallback', handleFallbackDeletion as EventListener)
    
    return () => {
      document.removeEventListener('nodeDeleteFallback', handleFallbackDeletion as EventListener)
    }
  }, [handleNodeDelete])

  const handleSuggestionToWorkflow = useCallback((suggestion: string) => {
    setWorkflowExecutionInput(suggestion)
    // Switch to design tab to show the updated input
    if (nodes.length > 0) {
      setActiveTab('design')
    }
  }, [nodes.length])

  const handleUseWorkflow = useCallback(async (actions: any[], smartContext?: string) => {
    console.log('🎯 Using workflow from chat:', actions)
    
    // Load user settings to check enabled tools
    const userSettings = localStorage.getItem('userSettings') 
      ? JSON.parse(localStorage.getItem('userSettings')!) 
      : null;
    const enabledTools = userSettings?.enabledTools || [];
    
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
        
        // Detect tool type - check for Composio tools first
        let toolType = null;
        if (action.nodeType === 'tool' && action.name) {
          // Try to detect Composio tool
          const composioTool = detectComposioToolFromName(action.name, enabledTools);
          if (composioTool) {
            toolType = composioTool;
            console.log(`✨ Detected Composio tool: ${composioTool} from name: ${action.name}`);
          } else {
            // Fall back to built-in tool detection
            toolType = action.name?.toLowerCase().includes('search') || action.name?.toLowerCase().includes('web') 
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
              : 'web_search'; // default to web_search for tool nodes
          }
        }
        
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
            ...(action.nodeType === 'tool' && toolType && {
              tool_type: toolType,
              isComposio: toolType.startsWith('composio_')
            }),
            // Use page-level callbacks consistently
            onNodeUpdate: handleNodeUpdate,
            onNodeDelete: handleNodeDelete
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

    // Set context in workflow input if provided
    if (smartContext) {
      setWorkflowExecutionInput(smartContext)
    }
  }, [nodes, edges, handleNodeUpdate, handleNodeDelete])



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
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsUserSettingsOpen(true)}
                className="flex items-center gap-2 px-4 py-2.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors border border-transparent hover:border-slate-200"
                title="User Settings"
              >
                <User className="w-4 h-4" />
                <span className="text-sm font-medium">Account</span>
              </button>
              
              <button
                onClick={() => setIsPreferencesOpen(true)}
                className="flex items-center gap-2 px-4 py-2.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors border border-transparent hover:border-slate-200"
                title="System Preferences"
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
              onSuggestionToWorkflow={handleSuggestionToWorkflow}
              onUseWorkflow={handleUseWorkflow}
            />
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
            {/* Always show WorkflowEditor */}
            <WorkflowEditor 
              nodes={nodes}
              edges={edges}
              onNodesChange={handleNodesChange}
              onEdgesChange={setEdges}
              onWorkflowChange={handleWorkflowChange}
              executionInput={workflowExecutionInput}
              onExecutionInputChange={setWorkflowExecutionInput}
            />
            
            {/* Show welcome overlay only when canvas is empty */}
            {nodes.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="text-center max-w-lg pointer-events-auto bg-white/95 backdrop-blur-sm p-8 rounded-xl shadow-lg border border-slate-200">
                  <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Workflow className="w-8 h-8 text-blue-600" />
                  </div>
                  <h3 className="text-xl font-semibold text-slate-900 mb-3">Welcome to any-agent Composer</h3>
                  <p className="text-slate-600 mb-6">
                    Start building your AI workflow by dragging nodes from the palette on the left, or describe what you want to the AI Assistant.
                  </p>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 text-left">
                    <h4 className="text-sm font-semibold text-blue-900 mb-2">💡 Quick Start:</h4>
                    <ul className="text-sm text-blue-800 space-y-1">
                      <li>• <strong>Drag & Drop:</strong> Pull nodes from the left palette onto the canvas</li>
                      <li>• <strong>Connect:</strong> Drag from output to input handles</li>
                      <li>• <strong>Configure:</strong> Click nodes to edit their settings</li>
                      <li>• <strong>AI Help:</strong> Use the chat tab to describe your workflow</li>
                    </ul>
                  </div>
                  <button
                    onClick={() => setActiveTab('chat')}
                    className="bg-blue-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center gap-2 mx-auto"
                  >
                    <MessageSquare className="w-4 h-4" />
                    Try AI Assistant
                  </button>
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
      
      {/* User Settings Modal */}
      <UserSettingsModal 
        isOpen={isUserSettingsOpen}
        onClose={() => setIsUserSettingsOpen(false)}
        onSave={(settings) => {
          setUserSettings(settings)
          console.log('User settings saved:', settings)
        }}
      />
    </div>
  )
}
