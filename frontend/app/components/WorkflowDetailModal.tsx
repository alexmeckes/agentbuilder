"use client"

import { useState, useEffect } from 'react'
import { 
  X, Clock, DollarSign, Activity, TrendingUp, TrendingDown, 
  CheckCircle, XCircle, BarChart3, Zap, Database, Eye
} from 'lucide-react'

interface WorkflowDetailData {
  workflow_id: string
  workflow_name: string
  summary: {
    total_executions: number
    successful_executions: number
    failed_executions: number
    success_rate: number
    total_cost: number
    total_duration_ms: number
    total_tokens: number
    average_cost: number
    average_duration_ms: number
    average_tokens: number
  }
  recent_performance: Array<{
    execution_number: number
    cost: number
    duration_ms: number
    tokens: number
    status: string
    created_at: string
  }>
  model_usage: Record<string, {
    count: number
    total_cost: number
    total_tokens: number
  }>
  all_executions: Array<{
    execution_id: string
    status: string
    cost: number
    duration_ms: number
    tokens: number
    created_at: string
  }>
}

interface WorkflowDetailModalProps {
  workflowId: string | null
  isOpen: boolean
  onClose: () => void
  onExecutionSelect: (executionId: string) => void
}

export function WorkflowDetailModal({ 
  workflowId, 
  isOpen, 
  onClose, 
  onExecutionSelect 
}: WorkflowDetailModalProps) {
  const [workflowData, setWorkflowData] = useState<WorkflowDetailData | null>(null)
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'overview' | 'performance' | 'executions'>('overview')

  useEffect(() => {
    if (isOpen && workflowId) {
      fetchWorkflowDetails()
    }
  }, [isOpen, workflowId])

  const fetchWorkflowDetails = async () => {
    if (!workflowId) return
    
    setLoading(true)
    try {
      const response = await fetch(`http://localhost:8000/analytics/workflows/${workflowId}`)
      if (response.ok) {
        const data = await response.json()
        setWorkflowData(data)
      }
    } catch (error) {
      console.error('Failed to fetch workflow details:', error)
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              {workflowData?.workflow_name || 'Workflow Details'}
            </h2>
            <p className="text-sm text-gray-600">ID: {workflowId}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            {[
              { id: 'overview', label: 'Overview', icon: BarChart3 },
              { id: 'performance', label: 'Performance', icon: TrendingUp },
              { id: 'executions', label: 'Executions', icon: Activity }
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id as any)}
                className={`py-3 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                  activeTab === id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : workflowData ? (
            <>
              {/* Overview Tab */}
              {activeTab === 'overview' && (
                <div className="space-y-6">
                  {/* Summary Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                      <div className="flex items-center">
                        <Activity className="w-5 h-5 text-blue-600 mr-2" />
                        <div>
                          <p className="text-sm text-blue-600">Total Executions</p>
                          <p className="font-semibold text-blue-900">{workflowData.summary.total_executions}</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                      <div className="flex items-center">
                        <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
                        <div>
                          <p className="text-sm text-green-600">Success Rate</p>
                          <p className="font-semibold text-green-900">{workflowData.summary.success_rate}%</p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                      <div className="flex items-center">
                        <DollarSign className="w-5 h-5 text-purple-600 mr-2" />
                        <div>
                          <p className="text-sm text-purple-600">Total Cost</p>
                          <p className="font-semibold text-purple-900">{formatCost(workflowData.summary.total_cost)}</p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                      <div className="flex items-center">
                        <Clock className="w-5 h-5 text-orange-600 mr-2" />
                        <div>
                          <p className="text-sm text-orange-600">Avg Duration</p>
                          <p className="font-semibold text-orange-900">{formatDuration(workflowData.summary.average_duration_ms)}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Model Usage */}
                  {Object.keys(workflowData.model_usage).length > 0 && (
                    <div className="bg-white border border-gray-200 rounded-lg p-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Model Usage</h3>
                      <div className="space-y-4">
                        {Object.entries(workflowData.model_usage).map(([model, data]) => (
                          <div key={model} className="flex items-center justify-between">
                            <div className="flex items-center">
                              <div className="w-3 h-3 bg-blue-500 rounded-full mr-3"></div>
                              <div>
                                <p className="font-medium">{model}</p>
                                <p className="text-sm text-gray-600">{data.count} calls</p>
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
                  )}
                </div>
              )}

              {/* Performance Tab */}
              {activeTab === 'performance' && (
                <div className="space-y-6">
                  <div className="bg-white border border-gray-200 rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Performance Trend</h3>
                    <div className="space-y-3">
                      {workflowData.recent_performance.map((perf, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center gap-3">
                            <span className="text-sm font-medium text-gray-600">
                              Execution #{perf.execution_number}
                            </span>
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              perf.status === 'completed' 
                                ? 'bg-green-100 text-green-800'
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {perf.status}
                            </span>
                          </div>
                          <div className="flex items-center gap-6 text-sm">
                            <div className="text-right">
                              <p className="font-medium">{formatDuration(perf.duration_ms)}</p>
                              <p className="text-gray-600">Duration</p>
                            </div>
                            <div className="text-right">
                              <p className="font-medium">{formatCost(perf.cost)}</p>
                              <p className="text-gray-600">Cost</p>
                            </div>
                            <div className="text-right">
                              <p className="font-medium">{perf.tokens.toLocaleString()}</p>
                              <p className="text-gray-600">Tokens</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Performance Metrics */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-white border border-gray-200 rounded-lg p-4">
                      <h4 className="font-medium text-gray-900 mb-2">Average Cost</h4>
                      <p className="text-2xl font-bold text-green-600">{formatCost(workflowData.summary.average_cost)}</p>
                      <p className="text-sm text-gray-600">Per execution</p>
                    </div>
                    
                    <div className="bg-white border border-gray-200 rounded-lg p-4">
                      <h4 className="font-medium text-gray-900 mb-2">Average Duration</h4>
                      <p className="text-2xl font-bold text-blue-600">{formatDuration(workflowData.summary.average_duration_ms)}</p>
                      <p className="text-sm text-gray-600">Per execution</p>
                    </div>
                    
                    <div className="bg-white border border-gray-200 rounded-lg p-4">
                      <h4 className="font-medium text-gray-900 mb-2">Average Tokens</h4>
                      <p className="text-2xl font-bold text-purple-600">{workflowData.summary.average_tokens.toLocaleString()}</p>
                      <p className="text-sm text-gray-600">Per execution</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Executions Tab */}
              {activeTab === 'executions' && (
                <div className="space-y-4">
                  <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-200">
                      <h3 className="text-lg font-semibold text-gray-900">All Executions</h3>
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
                              Tokens
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Created
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Actions
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {workflowData.all_executions.map((execution) => (
                            <tr key={execution.execution_id} className="hover:bg-gray-50">
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-600">
                                {execution.execution_id.slice(0, 8)}...
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
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {execution.tokens.toLocaleString()}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                {formatDate(execution.created_at)}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                <button
                                  onClick={() => {
                                    onExecutionSelect(execution.execution_id)
                                    onClose()
                                  }}
                                  className="text-blue-600 hover:text-blue-900 flex items-center gap-1"
                                >
                                  <Eye className="w-4 h-4" />
                                  View
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="flex items-center justify-center h-64 text-gray-500">
              <div className="text-center">
                <Database className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No workflow data available</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
} 