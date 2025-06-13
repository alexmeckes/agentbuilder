"use client"

import { useState, useEffect } from 'react'
import { GitBranch, TrendingUp, Clock, DollarSign, CheckCircle, XCircle } from 'lucide-react'

interface PathExecution {
  execution_id: string
  path: string[]
  total_duration_ms: number
  total_cost: number
  success: boolean
  final_output: string
  node_metrics: {
    [nodeId: string]: {
      duration_ms: number
      cost: number
      status: 'completed' | 'failed'
    }
  }
}

interface PathComparisonData {
  paths: {
    [pathKey: string]: {
      executions: PathExecution[]
      avg_duration_ms: number
      avg_cost: number
      success_rate: number
      node_sequence: string[]
    }
  }
  common_nodes: string[]
  divergence_points: string[]
}

interface PathComparisonProps {
  workflowId: string
  inputData: string
}

export function PathComparison({ workflowId, inputData }: PathComparisonProps) {
  const [comparisonData, setComparisonData] = useState<PathComparisonData | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedPaths, setSelectedPaths] = useState<string[]>([])
  const [comparisonMode, setComparisonMode] = useState<'performance' | 'output'>('performance')

  useEffect(() => {
    fetchPathComparison()
  }, [workflowId, inputData])

  const fetchPathComparison = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/evaluations/path-comparison', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          workflow_id: workflowId,
          input_data: inputData
        })
      })
      if (!response.ok) throw new Error('Failed to fetch path comparison')
      const data = await response.json()
      setComparisonData(data)
      
      // Auto-select first two paths
      const pathKeys = Object.keys(data.paths)
      if (pathKeys.length >= 2) {
        setSelectedPaths([pathKeys[0], pathKeys[1]])
      }
    } catch (error) {
      console.error('Error fetching path comparison:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!comparisonData || Object.keys(comparisonData.paths).length === 0) {
    return (
      <div className="bg-white rounded-lg p-12 shadow-sm text-center text-gray-500">
        <GitBranch className="w-12 h-12 mx-auto mb-3 text-gray-400" />
        <p>No alternative paths found for this workflow.</p>
        <p className="text-sm mt-2">Run the workflow multiple times with different configurations to see path comparisons.</p>
      </div>
    )
  }

  const pathKeys = Object.keys(comparisonData.paths)

  return (
    <div className="space-y-6">
      {/* Path Selection */}
      <div className="bg-white rounded-lg p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Select Paths to Compare
        </h3>
        <div className="space-y-2">
          {pathKeys.map(pathKey => {
            const path = comparisonData.paths[pathKey]
            const isSelected = selectedPaths.includes(pathKey)
            
            return (
              <label
                key={pathKey}
                className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${
                  isSelected ? 'bg-blue-50 border-blue-300' : 'bg-white border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedPaths([...selectedPaths, pathKey])
                      } else {
                        setSelectedPaths(selectedPaths.filter(p => p !== pathKey))
                      }
                    }}
                    className="h-4 w-4 text-blue-600"
                  />
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {path.node_sequence.join(' → ')}
                    </p>
                    <p className="text-xs text-gray-600">
                      {path.executions.length} executions
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <span className={`font-medium ${
                    path.success_rate >= 90 ? 'text-green-600' : 
                    path.success_rate >= 70 ? 'text-yellow-600' : 'text-red-600'
                  }`}>
                    {path.success_rate.toFixed(0)}% success
                  </span>
                  <span className="text-gray-600">
                    {(path.avg_duration_ms / 1000).toFixed(2)}s
                  </span>
                  <span className="text-gray-600">
                    ${path.avg_cost.toFixed(4)}
                  </span>
                </div>
              </label>
            )
          })}
        </div>
      </div>

      {/* Comparison Mode */}
      <div className="bg-white rounded-lg p-4 shadow-sm">
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium text-gray-700">Compare:</span>
          <button
            onClick={() => setComparisonMode('performance')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              comparisonMode === 'performance'
                ? 'bg-blue-100 text-blue-700'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Performance Metrics
          </button>
          <button
            onClick={() => setComparisonMode('output')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              comparisonMode === 'output'
                ? 'bg-blue-100 text-blue-700'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Output Quality
          </button>
        </div>
      </div>

      {/* Comparison Results */}
      {selectedPaths.length >= 2 && (
        <div className="bg-white rounded-lg p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Path Comparison Results
          </h3>
          
          {comparisonMode === 'performance' ? (
            <div className="space-y-6">
              {/* Overall Metrics */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-3">Average Duration</p>
                  {selectedPaths.map(pathKey => {
                    const path = comparisonData.paths[pathKey]
                    const isFastest = Math.min(...selectedPaths.map(p => comparisonData.paths[p].avg_duration_ms)) === path.avg_duration_ms
                    
                    return (
                      <div key={pathKey} className="flex items-center justify-between mb-2">
                        <span className="text-sm text-gray-600 truncate max-w-[200px]">
                          {path.node_sequence.slice(-2).join(' → ')}
                        </span>
                        <span className={`text-sm font-medium ${isFastest ? 'text-green-600' : 'text-gray-900'}`}>
                          {(path.avg_duration_ms / 1000).toFixed(2)}s
                          {isFastest && ' ⚡'}
                        </span>
                      </div>
                    )
                  })}
                </div>
                
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-3">Average Cost</p>
                  {selectedPaths.map(pathKey => {
                    const path = comparisonData.paths[pathKey]
                    const isCheapest = Math.min(...selectedPaths.map(p => comparisonData.paths[p].avg_cost)) === path.avg_cost
                    
                    return (
                      <div key={pathKey} className="flex items-center justify-between mb-2">
                        <span className="text-sm text-gray-600 truncate max-w-[200px]">
                          {path.node_sequence.slice(-2).join(' → ')}
                        </span>
                        <span className={`text-sm font-medium ${isCheapest ? 'text-green-600' : 'text-gray-900'}`}>
                          ${path.avg_cost.toFixed(4)}
                          {isCheapest && ' 💰'}
                        </span>
                      </div>
                    )
                  })}
                </div>
                
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-3">Success Rate</p>
                  {selectedPaths.map(pathKey => {
                    const path = comparisonData.paths[pathKey]
                    const isHighest = Math.max(...selectedPaths.map(p => comparisonData.paths[p].success_rate)) === path.success_rate
                    
                    return (
                      <div key={pathKey} className="flex items-center justify-between mb-2">
                        <span className="text-sm text-gray-600 truncate max-w-[200px]">
                          {path.node_sequence.slice(-2).join(' → ')}
                        </span>
                        <span className={`text-sm font-medium ${isHighest ? 'text-green-600' : 'text-gray-900'}`}>
                          {path.success_rate.toFixed(0)}%
                          {isHighest && ' ✓'}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Node-by-Node Comparison */}
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-3">Node Performance Breakdown</h4>
                <div className="space-y-2">
                  {comparisonData.common_nodes.map(nodeId => (
                    <div key={nodeId} className="bg-gray-50 rounded-lg p-3">
                      <p className="text-sm font-medium text-gray-900 mb-2">{nodeId}</p>
                      <div className="grid grid-cols-2 gap-4">
                        {selectedPaths.map(pathKey => {
                          const execution = comparisonData.paths[pathKey].executions[0]
                          const nodeMetric = execution?.node_metrics[nodeId]
                          
                          if (!nodeMetric) return null
                          
                          return (
                            <div key={pathKey} className="text-xs">
                              <p className="text-gray-600">Path: {pathKey.substring(0, 20)}...</p>
                              <p className="text-gray-900">
                                Duration: {(nodeMetric.duration_ms / 1000).toFixed(2)}s
                              </p>
                              <p className="text-gray-900">
                                Cost: ${nodeMetric.cost.toFixed(4)}
                              </p>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Output Comparison */}
              {selectedPaths.map(pathKey => {
                const path = comparisonData.paths[pathKey]
                const latestExecution = path.executions[0]
                
                return (
                  <div key={pathKey} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium text-gray-900">
                        Path: {path.node_sequence.join(' → ')}
                      </h4>
                      {latestExecution?.success ? (
                        <CheckCircle className="w-5 h-5 text-green-500" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-500" />
                      )}
                    </div>
                    <div className="bg-gray-50 rounded p-3">
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">
                        {latestExecution?.final_output || 'No output available'}
                      </p>
                    </div>
                    <div className="flex items-center gap-4 mt-3 text-xs text-gray-600">
                      <span>Duration: {(latestExecution?.total_duration_ms / 1000).toFixed(2)}s</span>
                      <span>Cost: ${latestExecution?.total_cost.toFixed(4)}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Recommendations */}
      <div className="bg-blue-50 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-3">
          Optimization Recommendations
        </h3>
        <div className="space-y-2 text-sm text-blue-800">
          {(() => {
            const recommendations = []
            
            // Find fastest and most reliable paths
            const fastestPath = Object.entries(comparisonData.paths)
              .sort(([,a], [,b]) => a.avg_duration_ms - b.avg_duration_ms)[0]
            const mostReliablePath = Object.entries(comparisonData.paths)
              .sort(([,a], [,b]) => b.success_rate - a.success_rate)[0]
            
            if (fastestPath && mostReliablePath && fastestPath[0] !== mostReliablePath[0]) {
              recommendations.push(
                `Consider the trade-off: "${fastestPath[1].node_sequence.slice(-1)[0]}" path is ${((1 - fastestPath[1].avg_duration_ms / mostReliablePath[1].avg_duration_ms) * 100).toFixed(0)}% faster but has ${(mostReliablePath[1].success_rate - fastestPath[1].success_rate).toFixed(0)}% lower success rate.`
              )
            }
            
            // Cost optimization
            const cheapestPath = Object.entries(comparisonData.paths)
              .sort(([,a], [,b]) => a.avg_cost - b.avg_cost)[0]
            if (cheapestPath) {
              recommendations.push(
                `The "${cheapestPath[1].node_sequence.slice(-1)[0]}" path is most cost-effective at $${cheapestPath[1].avg_cost.toFixed(4)} per execution.`
              )
            }
            
            return recommendations.map((rec, i) => (
              <p key={i}>• {rec}</p>
            ))
          })()}
        </div>
      </div>
    </div>
  )
}