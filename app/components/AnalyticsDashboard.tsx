"use client"

import { useState, useEffect } from 'react'
import { BarChart3, DollarSign, Clock, Database, TrendingUp, Zap } from 'lucide-react'

interface AnalyticsData {
  summary: {
    total_executions: number
    completed_executions: number
    total_cost: number
    total_tokens: number
    total_duration_ms: number
    average_cost_per_execution: number
    average_duration_per_execution: number
  }
  model_breakdown: Record<string, {
    count: number
    total_cost: number
    total_tokens: number
  }>
  recent_executions: Array<{
    execution_id: string
    status: string
    cost: number
    duration_ms: number
  }>
}

interface AnalyticsDashboardProps {
  onExecutionSelect: (executionId: string) => void
}

export function AnalyticsDashboard({ onExecutionSelect }: AnalyticsDashboardProps) {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetchAnalytics()
    // Refresh analytics every 30 seconds
    const interval = setInterval(fetchAnalytics, 30000)
    return () => clearInterval(interval)
  }, [])

  const fetchAnalytics = async () => {
    setLoading(true)
    try {
      const response = await fetch('http://localhost:8000/analytics/executions')
      if (response.ok) {
        const data = await response.json()
        if (data.summary) {
          setAnalytics(data)
        }
      }
    } catch (error) {
      console.error('Failed to fetch analytics:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatCost = (cost: number) => {
    return `$${cost.toFixed(4)}`
  }

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${Math.round(ms)}ms`
    return `${(ms / 1000).toFixed(2)}s`
  }

  if (loading && !analytics) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!analytics) {
    return (
      <div className="h-full flex items-center justify-center text-gray-500">
        <div className="text-center">
          <BarChart3 className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>No execution data available</p>
          <p className="text-sm">Run some workflows to see analytics</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full overflow-auto p-6 bg-gray-50">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h1>
            <p className="text-gray-600">Performance insights across all workflow executions</p>
          </div>
          <button
            onClick={fetchAnalytics}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
            disabled={loading}
          >
            <TrendingUp className="w-4 h-4" />
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <BarChart3 className="w-8 h-8 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Executions</p>
                <p className="text-2xl font-semibold text-gray-900">{analytics.summary.total_executions}</p>
                <p className="text-sm text-gray-600">{analytics.summary.completed_executions} completed</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <DollarSign className="w-8 h-8 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Cost</p>
                <p className="text-2xl font-semibold text-gray-900">{formatCost(analytics.summary.total_cost)}</p>
                <p className="text-sm text-gray-600">Avg: {formatCost(analytics.summary.average_cost_per_execution)}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Database className="w-8 h-8 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Tokens</p>
                <p className="text-2xl font-semibold text-gray-900">{analytics.summary.total_tokens.toLocaleString()}</p>
                <p className="text-sm text-gray-600">
                  {Math.round(analytics.summary.total_tokens / analytics.summary.completed_executions).toLocaleString()} avg
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Clock className="w-8 h-8 text-orange-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Duration</p>
                <p className="text-2xl font-semibold text-gray-900">{formatDuration(analytics.summary.total_duration_ms)}</p>
                <p className="text-sm text-gray-600">Avg: {formatDuration(analytics.summary.average_duration_per_execution)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Model Usage */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Model Usage</h3>
            <div className="space-y-4">
              {Object.entries(analytics.model_breakdown).map(([model, data]) => (
                <div key={model} className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-blue-500 rounded-full mr-3"></div>
                    <div>
                      <p className="font-medium">{model}</p>
                      <p className="text-sm text-gray-600">{data.count} executions</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{formatCost(data.total_cost)}</p>
                    <p className="text-sm text-gray-600">{data.total_tokens.toLocaleString()} tokens</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Cost Efficiency */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Cost Efficiency</h3>
            <div className="space-y-4">
              {Object.entries(analytics.model_breakdown).map(([model, data]) => {
                const costPerToken = data.total_cost / data.total_tokens * 1000
                return (
                  <div key={model} className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="w-3 h-3 bg-green-500 rounded-full mr-3"></div>
                      <p className="font-medium">{model}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{formatCost(costPerToken)}/1K tokens</p>
                      <div className="w-24 bg-gray-200 rounded-full h-2 mt-1">
                        <div 
                          className="bg-green-500 h-2 rounded-full" 
                          style={{ width: `${Math.min(100, (costPerToken / 0.01) * 100)}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Recent Executions */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Recent Executions</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Execution ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Duration
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Cost
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {analytics.recent_executions.map((execution) => (
                  <tr key={execution.execution_id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {execution.execution_id}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        execution.status === 'completed' 
                          ? 'bg-green-100 text-green-800'
                          : execution.status === 'failed'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {execution.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDuration(execution.duration_ms)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatCost(execution.cost)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => onExecutionSelect(execution.execution_id)}
                        className="text-blue-600 hover:text-blue-900 flex items-center gap-1"
                      >
                        <Zap className="w-4 h-4" />
                        View Trace
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
} 