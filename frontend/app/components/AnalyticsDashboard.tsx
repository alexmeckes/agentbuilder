"use client"

import { useState, useEffect } from 'react'
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown,
  Workflow, 
  Lightbulb, 
  DollarSign, 
  Clock, 
  AlertTriangle, 
  Target, 
  Filter, 
  Eye,
  Zap,
  RefreshCw,
  Minus,
  Activity,
  GitBranch
} from 'lucide-react'
import { WorkflowDetailModal } from './WorkflowDetailModal'
import { WorkflowTopology } from './WorkflowTopology'
import { DecisionPathAnalysis } from './DecisionPathAnalysis'
import { addUserHeaders } from '../utils/userIdentity'

interface WorkflowExecutionSummary {
  workflow_id: string
  workflow_name: string
  workflow_category: string
  total_executions: number
  successful_executions: number
  failed_executions: number
  average_duration_ms: number
  average_cost: number
  total_cost: number
  last_executed: string
  performance_trend: 'improving' | 'stable' | 'degrading'
  success_rate: number
}

interface WorkflowAnalyticsData {
  total_workflows: number
  total_executions: number
  most_used_workflows: WorkflowExecutionSummary[]
  all_workflows: WorkflowExecutionSummary[]
  category_breakdown: Record<string, number>
  performance_overview: {
    total_cost: number
    total_tokens: number
    total_duration_ms: number
    average_cost_per_execution: number
    average_tokens_per_execution: number
    average_duration_per_execution: number
  }
  recent_executions: Array<{
    execution_id: string
    workflow_id: string
    workflow_name: string
    status: string
    cost: number
    duration_ms: number
    created_at: string
  }>
}

interface AnalyticsInsight {
  type: string
  title: string
  description: string
  severity: 'info' | 'warning' | 'error'
}

interface AnalyticsRecommendation {
  type: string
  title: string
  description: string
  action: string
}

interface InsightsData {
  insights: AnalyticsInsight[]
  recommendations: AnalyticsRecommendation[]
  generated_at: string
}

interface AnalyticsDashboardProps {
  onExecutionSelect: (executionId: string) => void
}

export function AnalyticsDashboard({ onExecutionSelect }: AnalyticsDashboardProps) {
  const [workflowAnalytics, setWorkflowAnalytics] = useState<WorkflowAnalyticsData | null>(null)
  const [insights, setInsights] = useState<InsightsData | null>(null)
  const [loading, setLoading] = useState(false)
  const [activeView, setActiveView] = useState<'overview' | 'workflows' | 'insights' | 'topology' | 'paths'>('overview')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [selectedWorkflow, setSelectedWorkflow] = useState<string | null>(null)
  const [showWorkflowModal, setShowWorkflowModal] = useState(false)
  const [selectedExecution, setSelectedExecution] = useState<string | null>(null)
  
  useEffect(() => {
    fetchAnalytics()
    // Refresh analytics every 30 seconds
    const interval = setInterval(fetchAnalytics, 30000)
    return () => clearInterval(interval)
  }, [])

  const fetchAnalytics = async () => {
    setLoading(true)
    try {
      // Fetch workflow analytics via API route (proxies to correct backend)
      const workflowResponse = await fetch('/api/analytics/workflows', {
        headers: addUserHeaders()
      })
      if (workflowResponse.ok) {
        const workflowData = await workflowResponse.json()
        setWorkflowAnalytics(workflowData)
      }

      // Fetch insights via API route (proxies to correct backend)
      const insightsResponse = await fetch('/api/analytics/insights', {
        headers: addUserHeaders()
      })
      if (insightsResponse.ok) {
        const insightsData = await insightsResponse.json()
        setInsights(insightsData)
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

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'improving': return <TrendingUp className="w-4 h-4 text-green-500" />
      case 'degrading': return <TrendingDown className="w-4 h-4 text-red-500" />
      default: return <Minus className="w-4 h-4 text-gray-500" />
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'warning': return 'text-yellow-600 bg-yellow-50 border-yellow-200'
      case 'error': return 'text-red-600 bg-red-50 border-red-200'
      default: return 'text-blue-600 bg-blue-50 border-blue-200'
    }
  }

  const filteredWorkflows = workflowAnalytics?.all_workflows?.filter(workflow => {
    if (selectedCategory === 'all') return true
    if (selectedCategory === 'user') return !['system', 'assistant'].includes(workflow.workflow_category)
    if (selectedCategory === 'system') return ['system', 'assistant'].includes(workflow.workflow_category)
    return workflow.workflow_category === selectedCategory
  }) || []

  if (loading && !workflowAnalytics) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!workflowAnalytics || !workflowAnalytics.all_workflows) {
    return (
      <div className="h-full flex items-center justify-center text-gray-500">
        <div className="text-center">
          <BarChart3 className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>No workflow data available</p>
          <p className="text-sm">Execute some workflows to see analytics</p>
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
            <h1 className="text-2xl font-bold text-gray-900">Workflow Analytics</h1>
            <p className="text-gray-600">Performance insights and workflow intelligence</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={fetchAnalytics}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
              disabled={loading}
            >
              <TrendingUp className="w-4 h-4" />
              {loading ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
        </div>

        {/* View Tabs */}
        <div className="flex items-center gap-1 bg-white p-1 rounded-lg border">
          {[
            { id: 'overview', label: 'Overview', icon: BarChart3 },
            { id: 'workflows', label: 'Workflows', icon: Workflow },
            { id: 'topology', label: 'Flow', icon: Activity },
            { id: 'paths', label: 'Paths', icon: GitBranch },
            { id: 'insights', label: 'Insights', icon: Lightbulb }
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveView(id as any)}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeView === id 
                  ? 'bg-blue-100 text-blue-700' 
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>

        {/* Overview Tab */}
        {activeView === 'overview' && (
          <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white p-6 rounded-lg shadow border">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <Workflow className="w-8 h-8 text-blue-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Total Workflows</p>
                    <p className="text-2xl font-semibold text-gray-900">{workflowAnalytics.total_workflows || 0}</p>
                    <p className="text-sm text-gray-600">{workflowAnalytics.total_executions || 0} executions</p>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow border">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <DollarSign className="w-8 h-8 text-green-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Total Cost</p>
                    <p className="text-2xl font-semibold text-gray-900">{formatCost(workflowAnalytics.performance_overview?.total_cost || 0)}</p>
                    <p className="text-sm text-gray-600">Avg: {formatCost(workflowAnalytics.performance_overview?.average_cost_per_execution || 0)}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow border">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <Clock className="w-8 h-8 text-purple-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Avg Duration</p>
                    <p className="text-2xl font-semibold text-gray-900">{formatDuration(workflowAnalytics.performance_overview?.average_duration_per_execution || 0)}</p>
                    <p className="text-sm text-gray-600">Per execution</p>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow border">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <Activity className="w-8 h-8 text-orange-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Total Tokens</p>
                    <p className="text-2xl font-semibold text-gray-900">
                      {workflowAnalytics.performance_overview?.total_tokens?.toLocaleString() || 0}
                    </p>
                    <p className="text-sm text-gray-600">Avg: {Math.round(workflowAnalytics.performance_overview?.average_tokens_per_execution || 0)}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Category Breakdown */}
              <div className="bg-white p-6 rounded-lg shadow border">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Workflow Categories</h3>
                <div className="space-y-4">
                  {workflowAnalytics.category_breakdown && Object.keys(workflowAnalytics.category_breakdown).length > 0 ? (
                    Object.entries(workflowAnalytics.category_breakdown).map(([category, count]) => {
                      const percentage = (count / (workflowAnalytics.total_executions || 1)) * 100
                      return (
                        <div key={category} className="flex items-center justify-between">
                          <div className="flex items-center">
                            <div className="w-3 h-3 bg-blue-500 rounded-full mr-3"></div>
                            <div>
                              <p className="font-medium capitalize">{category}</p>
                              <p className="text-sm text-gray-600">{count} executions</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold">{percentage.toFixed(1)}%</p>
                            <div className="w-20 bg-gray-200 rounded-full h-2 mt-1">
                              <div 
                                className="bg-blue-500 h-2 rounded-full" 
                                style={{ width: `${percentage}%` }}
                              ></div>
                            </div>
                          </div>
                        </div>
                      )
                    })
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <p>No categories available</p>
                      <p className="text-sm">Execute workflows to see category breakdown</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Top Workflows */}
              <div className="bg-white p-6 rounded-lg shadow border">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Most Used Workflows</h3>
                <div className="space-y-4">
                  {workflowAnalytics.most_used_workflows && workflowAnalytics.most_used_workflows.length > 0 ? (
                    workflowAnalytics.most_used_workflows.slice(0, 5).map((workflow) => (
                      <div key={workflow.workflow_id} className="flex items-center justify-between">
                        <div className="flex items-center">
                          <div className="flex items-center gap-2">
                            {getTrendIcon(workflow.performance_trend)}
                            <div>
                              <p className="font-medium">{workflow.workflow_name}</p>
                              <p className="text-sm text-gray-600 capitalize">{workflow.workflow_category}</p>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">{workflow.total_executions} runs</p>
                          <p className="text-sm text-gray-600">{workflow.success_rate}% success</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <p>No workflows available</p>
                      <p className="text-sm">Execute workflows to see usage statistics</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Workflows Tab */}
        {activeView === 'workflows' && (
          <div className="space-y-6">
            {/* Filters */}
            <div className="bg-white p-4 rounded-lg shadow border">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-gray-500" />
                  <span className="text-sm font-medium text-gray-700">Filter by category:</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setSelectedCategory('all')}
                    className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                      selectedCategory === 'all'
                        ? 'bg-blue-100 text-blue-800 border border-blue-200'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    All ({workflowAnalytics.all_workflows?.length || 0})
                  </button>
                  <button
                    onClick={() => setSelectedCategory('user')}
                    className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                      selectedCategory === 'user'
                        ? 'bg-green-100 text-green-800 border border-green-200'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    User Workflows ({workflowAnalytics.all_workflows?.filter(w => !['system', 'assistant'].includes(w.workflow_category)).length || 0})
                  </button>
                  <button
                    onClick={() => setSelectedCategory('system')}
                    className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                      selectedCategory === 'system'
                        ? 'bg-purple-100 text-purple-800 border border-purple-200'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    System Workflows ({workflowAnalytics.all_workflows?.filter(w => ['system', 'assistant'].includes(w.workflow_category)).length || 0})
                  </button>
                  {Object.entries(workflowAnalytics.category_breakdown || {}).map(([category, count]) => (
                    <button
                      key={category}
                      onClick={() => setSelectedCategory(category)}
                      className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                        selectedCategory === category
                          ? 'bg-blue-100 text-blue-800 border border-blue-200'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {category} ({count})
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Workflows Table */}
            <div className="bg-white rounded-lg shadow border">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Workflow Performance</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Workflow
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Executions
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Success Rate
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Avg Cost
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Avg Duration
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Trend
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredWorkflows.map((workflow) => (
                      <tr key={workflow.workflow_id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">{workflow.workflow_name}</div>
                            <div className="text-sm text-gray-500 capitalize">{workflow.workflow_category}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {workflow.total_executions}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              workflow.success_rate >= 90 
                                ? 'bg-green-100 text-green-800'
                                : workflow.success_rate >= 70
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {workflow.success_rate}%
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatCost(workflow.average_cost)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatDuration(workflow.average_duration_ms)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-1">
                            {getTrendIcon(workflow.performance_trend)}
                            <span className="text-sm text-gray-600 capitalize">{workflow.performance_trend}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => {
                                setSelectedWorkflow(workflow.workflow_id)
                                setShowWorkflowModal(true)
                              }}
                              className="text-blue-600 hover:text-blue-900 flex items-center gap-1"
                            >
                              <Eye className="w-4 h-4" />
                              Details
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Topology Tab */}
        {activeView === 'topology' && (
          <div className="space-y-6">
            {workflowAnalytics?.recent_executions && workflowAnalytics.recent_executions.length > 0 ? (
              <>
                <div className="bg-white rounded-lg p-6 shadow border">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Select an Execution to View Flow</h3>
                  <div className="space-y-2">
                    {workflowAnalytics.recent_executions.slice(0, 5).map((execution) => (
                      <button
                        key={execution.execution_id}
                        onClick={() => setSelectedExecution(execution.execution_id)}
                        className={`w-full text-left p-3 rounded-lg border transition-colors ${
                          selectedExecution === execution.execution_id
                            ? 'bg-blue-50 border-blue-300'
                            : 'bg-white border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="font-medium text-gray-900">{execution.workflow_name}</p>
                            <p className="text-sm text-gray-600">
                              {new Date(execution.created_at * 1000).toLocaleString()}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium text-gray-900">${execution.cost.toFixed(4)}</p>
                            <p className="text-sm text-gray-600">{(execution.duration_ms / 1000).toFixed(2)}s</p>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
                {selectedExecution && (
                  <WorkflowTopology executionId={selectedExecution} />
                )}
              </>
            ) : (
              <div className="bg-white rounded-lg p-12 shadow border text-center text-gray-500">
                <Activity className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                <p>No executions available to visualize.</p>
                <p className="text-sm mt-2">Run some workflows to see their execution flow here.</p>
              </div>
            )}
          </div>
        )}

        {/* Paths Tab */}
        {activeView === 'paths' && (
          <DecisionPathAnalysis />
        )}

        {/* Insights Tab */}
        {activeView === 'insights' && insights && (
          <div className="space-y-6">
            {/* Insights */}
            {insights.insights.length > 0 && (
              <div className="bg-white rounded-lg shadow border">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900">Analytics Insights</h3>
                </div>
                <div className="p-6 space-y-4">
                  {insights.insights.map((insight, index) => (
                    <div key={index} className={`p-4 rounded-lg border ${getSeverityColor(insight.severity)}`}>
                      <div className="flex items-start gap-3">
                        <AlertTriangle className="w-5 h-5 mt-0.5" />
                        <div>
                          <h4 className="font-medium">{insight.title}</h4>
                          <p className="text-sm mt-1">{insight.description}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recommendations */}
            {insights.recommendations.length > 0 && (
              <div className="bg-white rounded-lg shadow border">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900">Recommendations</h3>
                </div>
                <div className="p-6 space-y-4">
                  {insights.recommendations.map((recommendation, index) => (
                    <div key={index} className="p-4 rounded-lg border border-blue-200 bg-blue-50">
                      <div className="flex items-start gap-3">
                        <Target className="w-5 h-5 mt-0.5 text-blue-600" />
                        <div>
                          <h4 className="font-medium text-blue-900">{recommendation.title}</h4>
                          <p className="text-sm mt-1 text-blue-700">{recommendation.description}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {insights.insights.length === 0 && insights.recommendations.length === 0 && (
              <div className="bg-white rounded-lg shadow border p-8 text-center">
                <Lightbulb className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Insights Available</h3>
                <p className="text-gray-600">Execute more workflows to generate insights and recommendations.</p>
              </div>
            )}
          </div>
        )}

        {/* Recent Executions */}
        <div className="bg-white rounded-lg shadow border">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Recent Executions</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Workflow
                  </th>
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
                {workflowAnalytics.recent_executions && workflowAnalytics.recent_executions.length > 0 ? (
                  workflowAnalytics.recent_executions.slice(0, 10).map((execution) => (
                    <tr key={execution.execution_id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{execution.workflow_name}</div>
                      </td>
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
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                      <div>
                        <p>No recent executions</p>
                        <p className="text-sm">Execute some workflows to see them here</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Workflow Detail Modal */}
      <WorkflowDetailModal
        workflowId={selectedWorkflow}
        isOpen={showWorkflowModal}
        onClose={() => {
          setShowWorkflowModal(false)
          setSelectedWorkflow(null)
        }}
        onExecutionSelect={onExecutionSelect}
      />
    </div>
  )
} 