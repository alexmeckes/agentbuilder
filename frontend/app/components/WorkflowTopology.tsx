"use client"

import { useEffect, useRef, useState } from 'react'
import { Activity, AlertCircle, Clock, DollarSign, Zap } from 'lucide-react'

interface NodeMetrics {
  duration_ms: number
  cost: number
  tokens: number
  status: 'completed' | 'failed'
}

interface WorkflowNode {
  id: string
  type: string
  name: string
  position: { x: number; y: number }
  metrics: NodeMetrics
  data: {
    input_preview?: string
    output_preview?: string
  }
}

interface WorkflowEdge {
  id: string
  source: string
  target: string
}

interface TopologyData {
  execution_id: string
  workflow_name: string
  nodes: WorkflowNode[]
  edges: WorkflowEdge[]
  metrics: {
    total_duration_ms: number
    total_cost: number
    node_count: number
    critical_path: string[]
  }
  execution_status: string
}

interface WorkflowTopologyProps {
  executionId: string
}

export function WorkflowTopology({ executionId }: WorkflowTopologyProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [topology, setTopology] = useState<TopologyData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedNode, setSelectedNode] = useState<WorkflowNode | null>(null)

  useEffect(() => {
    fetchTopology()
  }, [executionId])

  const fetchTopology = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/analytics/workflow-topology/${executionId}`)
      if (!response.ok) throw new Error('Failed to fetch topology')
      const data = await response.json()
      setTopology(data)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  const drawTopology = () => {
    if (!canvasRef.current || !topology) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Draw edges
    ctx.strokeStyle = '#e5e7eb'
    ctx.lineWidth = 2
    topology.edges.forEach(edge => {
      const sourceNode = topology.nodes.find(n => n.id === edge.source)
      const targetNode = topology.nodes.find(n => n.id === edge.target)
      if (sourceNode && targetNode) {
        ctx.beginPath()
        ctx.moveTo(sourceNode.position.x + 60, sourceNode.position.y + 30)
        ctx.lineTo(targetNode.position.x + 60, targetNode.position.y + 30)
        ctx.stroke()
      }
    })

    // Draw nodes
    topology.nodes.forEach(node => {
      const isCritical = topology.metrics.critical_path.includes(node.id)
      
      // Node background
      ctx.fillStyle = node.metrics.status === 'failed' ? '#fee2e2' : 
                     isCritical ? '#fef3c7' : '#f3f4f6'
      ctx.fillRect(node.position.x, node.position.y, 120, 60)
      
      // Node border
      ctx.strokeStyle = node.metrics.status === 'failed' ? '#ef4444' : 
                       isCritical ? '#f59e0b' : '#d1d5db'
      ctx.lineWidth = isCritical ? 3 : 2
      ctx.strokeRect(node.position.x, node.position.y, 120, 60)
      
      // Node text
      ctx.fillStyle = '#1f2937'
      ctx.font = '12px sans-serif'
      ctx.fillText(node.name.substring(0, 15), node.position.x + 10, node.position.y + 25)
      
      // Duration
      ctx.fillStyle = '#6b7280'
      ctx.font = '10px sans-serif'
      ctx.fillText(`${node.metrics.duration_ms.toFixed(0)}ms`, node.position.x + 10, node.position.y + 45)
    })
  }

  useEffect(() => {
    drawTopology()
  }, [topology])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-96 text-red-600">
        <AlertCircle className="w-6 h-6 mr-2" />
        {error}
      </div>
    )
  }

  if (!topology) return null

  return (
    <div className="space-y-6">
      {/* Topology Header */}
      <div className="bg-white rounded-lg p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Workflow Execution Flow: {topology.workflow_name}
        </h3>
        
        {/* Summary Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Duration</p>
                <p className="text-xl font-semibold text-gray-900">
                  {(topology.metrics.total_duration_ms / 1000).toFixed(2)}s
                </p>
              </div>
              <Clock className="w-8 h-8 text-gray-400" />
            </div>
          </div>
          
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Cost</p>
                <p className="text-xl font-semibold text-gray-900">
                  ${topology.metrics.total_cost.toFixed(4)}
                </p>
              </div>
              <DollarSign className="w-8 h-8 text-gray-400" />
            </div>
          </div>
          
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Node Count</p>
                <p className="text-xl font-semibold text-gray-900">
                  {topology.metrics.node_count}
                </p>
              </div>
              <Activity className="w-8 h-8 text-gray-400" />
            </div>
          </div>
          
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Status</p>
                <p className={`text-xl font-semibold ${
                  topology.execution_status === 'completed' ? 'text-green-600' : 'text-red-600'
                }`}>
                  {topology.execution_status}
                </p>
              </div>
              <Zap className="w-8 h-8 text-gray-400" />
            </div>
          </div>
        </div>

        {/* Topology Canvas */}
        <div className="relative bg-gray-50 rounded-lg p-4 overflow-auto">
          <canvas 
            ref={canvasRef}
            width={800}
            height={400}
            className="border border-gray-200 rounded bg-white"
            onClick={(e) => {
              const rect = canvasRef.current?.getBoundingClientRect()
              if (!rect) return
              const x = e.clientX - rect.left
              const y = e.clientY - rect.top
              
              // Find clicked node
              const clickedNode = topology.nodes.find(node => 
                x >= node.position.x && x <= node.position.x + 120 &&
                y >= node.position.y && y <= node.position.y + 60
              )
              setSelectedNode(clickedNode || null)
            }}
          />
          
          {/* Legend */}
          <div className="absolute bottom-4 right-4 bg-white p-3 rounded-lg shadow-sm text-xs">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-yellow-100 border-2 border-yellow-500 rounded"></div>
                <span>Critical Path</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-red-100 border-2 border-red-500 rounded"></div>
                <span>Failed Node</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Node Details */}
      {selectedNode && (
        <div className="bg-white rounded-lg p-6 shadow-sm">
          <h4 className="text-lg font-semibold text-gray-900 mb-4">
            Node Details: {selectedNode.name}
          </h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h5 className="text-sm font-medium text-gray-700 mb-2">Metrics</h5>
              <dl className="space-y-2">
                <div className="flex justify-between">
                  <dt className="text-sm text-gray-600">Type:</dt>
                  <dd className="text-sm font-medium text-gray-900">{selectedNode.type}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-sm text-gray-600">Duration:</dt>
                  <dd className="text-sm font-medium text-gray-900">{selectedNode.metrics.duration_ms.toFixed(0)}ms</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-sm text-gray-600">Cost:</dt>
                  <dd className="text-sm font-medium text-gray-900">${selectedNode.metrics.cost.toFixed(4)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-sm text-gray-600">Tokens:</dt>
                  <dd className="text-sm font-medium text-gray-900">{selectedNode.metrics.tokens}</dd>
                </div>
              </dl>
            </div>
            
            <div>
              <h5 className="text-sm font-medium text-gray-700 mb-2">Data</h5>
              {selectedNode.data.input_preview && (
                <div className="mb-3">
                  <p className="text-xs text-gray-600 mb-1">Input:</p>
                  <pre className="text-xs bg-gray-50 p-2 rounded overflow-auto max-h-24">
                    {selectedNode.data.input_preview}
                  </pre>
                </div>
              )}
              {selectedNode.data.output_preview && (
                <div>
                  <p className="text-xs text-gray-600 mb-1">Output:</p>
                  <pre className="text-xs bg-gray-50 p-2 rounded overflow-auto max-h-24">
                    {selectedNode.data.output_preview}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Critical Path Analysis */}
      <div className="bg-white rounded-lg p-6 shadow-sm">
        <h4 className="text-lg font-semibold text-gray-900 mb-4">
          Critical Path Analysis
        </h4>
        <p className="text-sm text-gray-600 mb-4">
          Nodes that contributed most to execution time:
        </p>
        <div className="space-y-2">
          {topology.metrics.critical_path.map(nodeId => {
            const node = topology.nodes.find(n => n.id === nodeId)
            if (!node) return null
            return (
              <div key={nodeId} className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                <span className="text-sm font-medium text-gray-900">{node.name}</span>
                <span className="text-sm text-gray-600">{node.metrics.duration_ms.toFixed(0)}ms</span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}