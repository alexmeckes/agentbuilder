"use client"

import { useEffect, useState } from 'react'
import { GitBranch, TrendingUp, TrendingDown, Zap, DollarSign, Clock } from 'lucide-react'
import { addUserHeaders } from '../utils/userIdentity'

interface BranchMetrics {
  count: number
  avg_duration_ms: number
  avg_cost: number
  success_rate: number
  total_duration_ms: number
  total_cost: number
}

interface DecisionNode {
  node_id: string
  node_name: string
  condition: string
  branches: Array<{
    branch_name: string
    metrics: BranchMetrics
  }>
}

interface PathMetrics {
  count: number
  avg_duration_ms: number
  avg_cost: number
  success_rate: number
  node_sequence: string[]
}

interface DecisionPathData {
  decision_nodes: DecisionNode[]
  path_analysis: {
    most_common_paths: Array<{
      path: string
      metrics: PathMetrics
    }>
    total_unique_paths: number
    path_efficiency: {
      fastest_path?: [string, PathMetrics]
      most_cost_effective?: [string, PathMetrics]
      highest_success_rate?: [string, PathMetrics]
    }
  }
}

export function DecisionPathAnalysis() {
  const [data, setData] = useState<DecisionPathData | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedNode, setSelectedNode] = useState<string | null>(null)

  useEffect(() => {
    fetchDecisionPaths()
  }, [])

  const fetchDecisionPaths = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/analytics/decision-paths', {
        headers: addUserHeaders({})
      })
      if (!response.ok) throw new Error('Failed to fetch decision paths')
      const result = await response.json()
      setData(result)
    } catch (error) {
      console.error('Error fetching decision paths:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!data || data.decision_nodes.length === 0) {
    return (
      <div className="bg-white rounded-lg p-6 shadow-sm text-center text-gray-500">
        <GitBranch className="w-12 h-12 mx-auto mb-3 text-gray-400" />
        <p>No decision nodes found in your workflows yet.</p>
        <p className="text-sm mt-2">Decision analysis will appear here once you have workflows with decision nodes.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Decision Nodes Summary */}
      <div className="bg-white rounded-lg p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <GitBranch className="w-5 h-5" />
          Decision Node Analysis
        </h3>
        
        <div className="space-y-4">
          {data.decision_nodes.map(node => (
            <div 
              key={node.node_id}
              className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                selectedNode === node.node_id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
              }`}
              onClick={() => setSelectedNode(selectedNode === node.node_id ? null : node.node_id)}
            >
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-medium text-gray-900">{node.node_name}</h4>
                  <p className="text-sm text-gray-600 mt-1">Condition: {node.condition}</p>
                </div>
                <span className="text-sm text-gray-500">
                  {node.branches.reduce((sum, b) => sum + b.metrics.count, 0)} executions
                </span>
              </div>
              
              {selectedNode === node.node_id && (
                <div className="mt-4 space-y-3">
                  {node.branches.map(branch => (
                    <div key={branch.branch_name} className="bg-gray-50 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-gray-800">
                          Branch: {branch.branch_name}
                        </span>
                        <span className="text-sm text-gray-600">
                          {branch.metrics.count} times ({((branch.metrics.count / node.branches.reduce((sum, b) => sum + b.metrics.count, 0)) * 100).toFixed(1)}%)
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-3 gap-3 text-sm">
                        <div>
                          <span className="text-gray-600">Success Rate:</span>
                          <p className={`font-medium ${branch.metrics.success_rate >= 90 ? 'text-green-600' : branch.metrics.success_rate >= 70 ? 'text-yellow-600' : 'text-red-600'}`}>
                            {branch.metrics.success_rate.toFixed(1)}%
                          </p>
                        </div>
                        <div>
                          <span className="text-gray-600">Avg Duration:</span>
                          <p className="font-medium text-gray-900">
                            {(branch.metrics.avg_duration_ms / 1000).toFixed(2)}s
                          </p>
                        </div>
                        <div>
                          <span className="text-gray-600">Avg Cost:</span>
                          <p className="font-medium text-gray-900">
                            ${branch.metrics.avg_cost.toFixed(4)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Path Efficiency */}
      <div className="bg-white rounded-lg p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Zap className="w-5 h-5" />
          Path Efficiency Analysis
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {data.path_analysis.path_efficiency.fastest_path && (
            <div className="bg-green-50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-4 h-4 text-green-600" />
                <h4 className="font-medium text-green-900">Fastest Path</h4>
              </div>
              <p className="text-sm text-green-800 mb-2">
                {data.path_analysis.path_efficiency.fastest_path[0].split(' -> ').join(' → ')}
              </p>
              <p className="text-lg font-semibold text-green-900">
                {(data.path_analysis.path_efficiency.fastest_path[1].avg_duration_ms / 1000).toFixed(2)}s
              </p>
            </div>
          )}
          
          {data.path_analysis.path_efficiency.most_cost_effective && (
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="w-4 h-4 text-blue-600" />
                <h4 className="font-medium text-blue-900">Most Cost Effective</h4>
              </div>
              <p className="text-sm text-blue-800 mb-2">
                {data.path_analysis.path_efficiency.most_cost_effective[0].split(' -> ').join(' → ')}
              </p>
              <p className="text-lg font-semibold text-blue-900">
                ${data.path_analysis.path_efficiency.most_cost_effective[1].avg_cost.toFixed(4)}
              </p>
            </div>
          )}
          
          {data.path_analysis.path_efficiency.highest_success_rate && (
            <div className="bg-purple-50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-4 h-4 text-purple-600" />
                <h4 className="font-medium text-purple-900">Most Reliable</h4>
              </div>
              <p className="text-sm text-purple-800 mb-2">
                {data.path_analysis.path_efficiency.highest_success_rate[0].split(' -> ').join(' → ')}
              </p>
              <p className="text-lg font-semibold text-purple-900">
                {data.path_analysis.path_efficiency.highest_success_rate[1].success_rate.toFixed(1)}%
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Most Common Paths */}
      <div className="bg-white rounded-lg p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Most Common Execution Paths
        </h3>
        <p className="text-sm text-gray-600 mb-4">
          Total unique paths: {data.path_analysis.total_unique_paths}
        </p>
        
        <div className="space-y-3">
          {data.path_analysis.most_common_paths.map((pathData, index) => (
            <div key={index} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">
                    {pathData.path.split(' -> ').join(' → ')}
                  </p>
                </div>
                <span className="text-sm text-gray-500 ml-4">
                  {pathData.metrics.count} executions
                </span>
              </div>
              
              <div className="grid grid-cols-4 gap-4 mt-3 text-sm">
                <div>
                  <span className="text-gray-600">Success Rate:</span>
                  <p className={`font-medium ${pathData.metrics.success_rate >= 90 ? 'text-green-600' : pathData.metrics.success_rate >= 70 ? 'text-yellow-600' : 'text-red-600'}`}>
                    {pathData.metrics.success_rate.toFixed(1)}%
                  </p>
                </div>
                <div>
                  <span className="text-gray-600">Avg Duration:</span>
                  <p className="font-medium text-gray-900">
                    {(pathData.metrics.avg_duration_ms / 1000).toFixed(2)}s
                  </p>
                </div>
                <div>
                  <span className="text-gray-600">Avg Cost:</span>
                  <p className="font-medium text-gray-900">
                    ${pathData.metrics.avg_cost.toFixed(4)}
                  </p>
                </div>
                <div>
                  <span className="text-gray-600">Frequency:</span>
                  <p className="font-medium text-gray-900">
                    {((pathData.metrics.count / data.path_analysis.most_common_paths.reduce((sum, p) => sum + p.metrics.count, 0)) * 100).toFixed(1)}%
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}