'use client'

import { useState, useCallback } from 'react'
import { MainLayout } from './components/layout/MainLayout'
import WorkflowEditor from './components/WorkflowEditor'
import ChatInterface from './components/ChatInterface'

export default function Home() {
  const [workflowData, setWorkflowData] = useState<{ nodes: any[], edges: any[] }>({ nodes: [], edges: [] })

  const handleWorkflowChange = useCallback((nodes: any[], edges: any[]) => {
    setWorkflowData({ nodes, edges })
  }, [])

  const handleExecuteActions = useCallback((actions: any[]) => {
    console.log('Executing actions:', actions)
    
    // For now, let's just show a notification
    // In a real implementation, this would add nodes to the workflow
    actions.forEach(action => {
      if (action.type === 'CREATE_NODE') {
        console.log(`Creating ${action.nodeType} node: ${action.name}`)
        console.log(`Instructions: ${action.instructions}`)
      } else if (action.type === 'CONNECT_NODES') {
        console.log(`Connecting ${action.sourceId} → ${action.targetId}`)
      }
    })

    // Show success message
    alert(`Created ${actions.filter(a => a.type === 'CREATE_NODE').length} nodes and ${actions.filter(a => a.type === 'CONNECT_NODES').length} connections!`)
  }, [])

  return (
    <MainLayout>
      <div className="grid h-[calc(100vh-5rem)] grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="h-full rounded-lg border bg-card">
          <WorkflowEditor />
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
