'use client'

import { useState, useCallback } from 'react'
import { MainLayout } from './components/layout/MainLayout'
import WorkflowEditor from './components/WorkflowEditor'
import ChatInterface from './components/ChatInterface'
import type { Node, Edge } from 'reactflow'

export default function Home() {
  const [nodes, setNodes] = useState<Node[]>([])
  const [edges, setEdges] = useState<Edge[]>([])

  const handleWorkflowChange = useCallback((newNodes: Node[], newEdges: Edge[]) => {
    setNodes(newNodes)
    setEdges(newEdges)
  }, [])

  const handleExecuteActions = useCallback((actions: any[]) => {
    console.log('Executing actions:', actions)
    
    const newNodes: Node[] = []
    const newEdges: Edge[] = []
    const nodeIdMap: { [key: string]: string } = {}
    
    // Create nodes from actions
    actions.forEach((action, index) => {
      if (action.type === 'CREATE_NODE') {
        const nodeId = `${action.nodeType}-${Date.now()}-${index}`
        nodeIdMap[action.name] = nodeId
        
        // Position nodes in a simple layout
        const x = 150 + (index % 3) * 300
        const y = 100 + Math.floor(index / 3) * 200
        
        const nodeType = action.nodeType === 'agent' ? 'agent' : 'agent' // For now, use agent type for all
        
        const newNode: Node = {
          id: nodeId,
          type: nodeType,
          position: { x, y },
          data: {
            label: action.name,
            name: action.name,
            type: action.nodeType,
            instructions: action.instructions || 'Default instructions',
            model_id: action.model || 'gpt-4.1'
          }
        }
        
        newNodes.push(newNode)
        console.log(`Creating ${action.nodeType} node: ${action.name}`)
      }
    })
    
    // Create connections from actions
    actions.forEach(action => {
      if (action.type === 'CONNECT_NODES') {
        const sourceId = nodeIdMap[action.sourceId]
        const targetId = nodeIdMap[action.targetId]
        
        if (sourceId && targetId) {
          const newEdge: Edge = {
            id: `edge-${sourceId}-${targetId}`,
            source: sourceId,
            target: targetId,
            type: 'default'
          }
          newEdges.push(newEdge)
          console.log(`Connecting ${action.sourceId} → ${action.targetId}`)
        }
      }
    })

    // Update the workflow state
    setNodes(prevNodes => [...prevNodes, ...newNodes])
    setEdges(prevEdges => [...prevEdges, ...newEdges])

    // Show success message
    const nodeCount = actions.filter(a => a.type === 'CREATE_NODE').length
    const edgeCount = actions.filter(a => a.type === 'CONNECT_NODES').length
    
    if (nodeCount > 0 || edgeCount > 0) {
      alert(`✅ Successfully created ${nodeCount} nodes and ${edgeCount} connections!`)
    }
  }, [])

  const workflowData = { nodes, edges }

  return (
    <MainLayout>
      <div className="grid h-[calc(100vh-5rem)] grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="h-full rounded-lg border bg-card">
          <WorkflowEditor 
            nodes={nodes}
            edges={edges}
            onNodesChange={setNodes}
            onEdgesChange={setEdges}
            onWorkflowChange={handleWorkflowChange}
          />
        </div>
        <div className="h-full rounded-lg border bg-card">
          <ChatInterface 
            workflowContext={workflowData}
            onExecuteActions={handleExecuteActions}
          />
        </div>
      </div>
    </MainLayout>
  )
}
