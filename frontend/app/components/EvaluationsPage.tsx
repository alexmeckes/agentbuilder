"use client"

import { useState, useEffect } from 'react'
import { 
  FlaskConical, Play, Plus, FileText, BarChart3, Clock, 
  CheckCircle, XCircle, AlertCircle, Eye, Download, Upload,
  Settings, Trash2, Edit, Copy, Filter, Search, RefreshCw
} from 'lucide-react'
import { EvaluationCase, EvaluationRun, EvaluationMetrics, EVALUATION_TEMPLATES, EvaluationTemplateKey } from '../types/evaluation'
import { EvaluationCaseEditor } from './evaluations/EvaluationCaseEditor'
import { EvaluationResultsModal } from './evaluations/EvaluationResultsModal'
import { EvaluationRunModal } from './evaluations/EvaluationRunModal'

export default function EvaluationsPage() {
  const [activeTab, setActiveTab] = useState<'overview' | 'cases' | 'runs' | 'results'>('overview')
  const [evaluationCases, setEvaluationCases] = useState<EvaluationCase[]>([])
  const [evaluationRuns, setEvaluationRuns] = useState<EvaluationRun[]>([])
  const [metrics, setMetrics] = useState<EvaluationMetrics | null>(null)
  const [loading, setLoading] = useState(false)
  const [selectedCase, setSelectedCase] = useState<EvaluationCase | null>(null)
  const [selectedRun, setSelectedRun] = useState<EvaluationRun | null>(null)
  const [showCaseEditor, setShowCaseEditor] = useState(false)
  const [showResultsModal, setShowResultsModal] = useState(false)
  const [showRunModal, setShowRunModal] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'completed' | 'running' | 'failed'>('all')

  useEffect(() => {
    fetchEvaluationData()
  }, [])

  const fetchEvaluationData = async () => {
    setLoading(true)
    try {
      // Fetch evaluation cases
      const casesResponse = await fetch('http://localhost:8000/evaluations/cases')
      const casesData = casesResponse.ok ? await casesResponse.json() : { cases: [] }
      
      // Fetch evaluation runs
      const runsResponse = await fetch('http://localhost:8000/evaluations/runs')
      const runsData = runsResponse.ok ? await runsResponse.json() : { runs: [] }
      
      // Fetch metrics
      const metricsResponse = await fetch('http://localhost:8000/evaluations/metrics')
      const metricsData = metricsResponse.ok ? await metricsResponse.json() : null

      // Transform the data to match our types
      const transformedCases = casesData.cases.map((caseData: any) => ({
        llm_judge: caseData.llm_judge,
        checkpoints: caseData.checkpoints,
        ground_truth: caseData.ground_truth,
        final_output_criteria: caseData.final_output_criteria || []
      }))

      const transformedRuns = runsData.runs.map((runData: any) => ({
        id: runData.id,
        name: runData.name,
        evaluation_case: transformedCases[0] || {
          llm_judge: 'openai/gpt-4o',
          checkpoints: [],
          ground_truth: [],
          final_output_criteria: []
        },
        trace_id: runData.trace_id,
        result: runData.result,
        created_at: runData.created_at,
        status: runData.status,
        duration_ms: runData.duration_ms
      }))

      setEvaluationCases(transformedCases)
      setEvaluationRuns(transformedRuns)
      setMetrics(metricsData)
    } catch (error) {
      console.error('Failed to fetch evaluation data:', error)
      // Fallback to empty data
      setEvaluationCases([])
      setEvaluationRuns([])
      setMetrics(null)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateCase = (template?: EvaluationTemplateKey) => {
    if (template) {
      const templateData = EVALUATION_TEMPLATES[template].template
      setSelectedCase({
        llm_judge: templateData.llm_judge,
        checkpoints: [...templateData.checkpoints],
        ground_truth: [...templateData.ground_truth],
        final_output_criteria: [...templateData.final_output_criteria]
      })
    } else {
      setSelectedCase({
        llm_judge: 'openai/gpt-4o',
        checkpoints: [],
        ground_truth: [],
        final_output_criteria: []
      })
    }
    setShowCaseEditor(true)
  }

  const handleRunEvaluation = (evaluationCase: EvaluationCase) => {
    setSelectedCase(evaluationCase)
    setShowRunModal(true)
  }

  const handleViewResults = (run: EvaluationRun) => {
    setSelectedRun(run)
    setShowResultsModal(true)
  }

  const filteredRuns = evaluationRuns.filter(run => {
    const matchesSearch = run.name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === 'all' || run.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="w-4 h-4 text-green-500" />
      case 'running': return <Clock className="w-4 h-4 text-blue-500" />
      case 'failed': return <XCircle className="w-4 h-4 text-red-500" />
      default: return <AlertCircle className="w-4 h-4 text-gray-500" />
    }
  }

  const formatScore = (score: number) => {
    return `${Math.round(score * 100)}%`
  }

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`
    return `${(ms / 1000).toFixed(2)}s`
  }

  if (loading && !metrics) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="h-full overflow-auto p-6 bg-gray-50">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <FlaskConical className="w-8 h-8 text-purple-600" />
              Evaluations
            </h1>
            <p className="text-gray-600">Test and validate your AI workflows with comprehensive evaluation metrics</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => handleCreateCase()}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              New Evaluation
            </button>
            <button
              onClick={fetchEvaluationData}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 flex items-center gap-2"
              disabled={loading}
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 bg-white p-1 rounded-lg border">
          {[
            { id: 'overview', label: 'Overview', icon: BarChart3 },
            { id: 'cases', label: 'Evaluation Cases', icon: FileText },
            { id: 'runs', label: 'Test Runs', icon: Play },
            { id: 'results', label: 'Results', icon: Eye }
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id as any)}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === id 
                  ? 'bg-purple-100 text-purple-700' 
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && metrics && (
          <div className="space-y-6">
            {/* Metrics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white p-6 rounded-lg shadow border">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <Play className="w-8 h-8 text-blue-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Total Runs</p>
                    <p className="text-2xl font-semibold text-gray-900">{metrics.total_runs}</p>
                    <p className="text-sm text-gray-600">Evaluation executions</p>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow border">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <BarChart3 className="w-8 h-8 text-green-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Average Score</p>
                    <p className="text-2xl font-semibold text-gray-900">{formatScore(metrics.average_score)}</p>
                    <p className="text-sm text-gray-600">Across all evaluations</p>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow border">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <CheckCircle className="w-8 h-8 text-purple-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Pass Rate</p>
                    <p className="text-2xl font-semibold text-gray-900">{formatScore(metrics.pass_rate)}</p>
                    <p className="text-sm text-gray-600">Criteria success rate</p>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow border">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <FlaskConical className="w-8 h-8 text-orange-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Points Earned</p>
                    <p className="text-2xl font-semibold text-gray-900">{metrics.earned_points}/{metrics.total_points}</p>
                    <p className="text-sm text-gray-600">Total evaluation points</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Criteria Performance */}
            <div className="bg-white rounded-lg shadow border">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Criteria Performance</h3>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  {Object.entries(metrics.by_criteria).map(([criteria, data]) => (
                    <div key={criteria} className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{criteria}</p>
                        <p className="text-sm text-gray-600">{data.total_attempts} attempts</p>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="font-semibold">{formatScore(data.pass_rate)}</p>
                          <p className="text-sm text-gray-600">Pass rate</p>
                        </div>
                        <div className="w-32 bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-purple-500 h-2 rounded-full" 
                            style={{ width: `${data.pass_rate * 100}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-lg shadow border">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Quick Start Templates</h3>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {Object.entries(EVALUATION_TEMPLATES).map(([key, template]) => (
                    <div key={key} className="border rounded-lg p-4 hover:bg-gray-50 cursor-pointer"
                         onClick={() => handleCreateCase(key as EvaluationTemplateKey)}>
                      <h4 className="font-medium text-gray-900">{template.name}</h4>
                      <p className="text-sm text-gray-600 mt-1">{template.description}</p>
                      <div className="mt-3 flex items-center gap-2">
                        <Plus className="w-4 h-4 text-purple-600" />
                        <span className="text-sm text-purple-600 font-medium">Use Template</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Cases Tab */}
        {activeTab === 'cases' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow border">
              <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Evaluation Cases</h3>
                <button
                  onClick={() => handleCreateCase()}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Create Case
                </button>
              </div>
              <div className="p-6">
                {evaluationCases.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No evaluation cases created yet</p>
                    <p className="text-sm">Create your first evaluation case to get started</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {evaluationCases.map((evalCase, index) => (
                      <div key={index} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-medium text-gray-900">Evaluation Case {index + 1}</h4>
                            <p className="text-sm text-gray-600">Judge: {evalCase.llm_judge}</p>
                            <p className="text-sm text-gray-600">{evalCase.checkpoints.length} checkpoints, {evalCase.ground_truth.length} ground truth items</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleRunEvaluation(evalCase)}
                              className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 flex items-center gap-1"
                            >
                              <Play className="w-3 h-3" />
                              Run
                            </button>
                            <button className="px-3 py-1 bg-gray-600 text-white rounded hover:bg-gray-700 flex items-center gap-1">
                              <Edit className="w-3 h-3" />
                              Edit
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Runs Tab */}
        {activeTab === 'runs' && (
          <div className="space-y-6">
            {/* Filters */}
            <div className="bg-white p-4 rounded-lg shadow border">
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search runs..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent w-full"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-gray-500" />
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as any)}
                    className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  >
                    <option value="all">All Status</option>
                    <option value="completed">Completed</option>
                    <option value="running">Running</option>
                    <option value="failed">Failed</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Runs Table */}
            <div className="bg-white rounded-lg shadow border">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Evaluation Runs</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Run Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Score
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Duration
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
                    {filteredRuns.map((run) => (
                      <tr key={run.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{run.name}</div>
                          <div className="text-sm text-gray-500">ID: {run.id}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            {getStatusIcon(run.status)}
                            <span className="text-sm text-gray-900 capitalize">{run.status}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`text-sm font-medium ${
                            run.result.score >= 0.8 ? 'text-green-600' :
                            run.result.score >= 0.6 ? 'text-yellow-600' : 'text-red-600'
                          }`}>
                            {formatScore(run.result.score)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {run.duration_ms ? formatDuration(run.duration_ms) : '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {new Date(run.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button
                            onClick={() => handleViewResults(run)}
                            className="text-purple-600 hover:text-purple-900 flex items-center gap-1"
                          >
                            <Eye className="w-4 h-4" />
                            View Results
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

        {/* Results Tab */}
        {activeTab === 'results' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow border">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Detailed Results Analysis</h3>
              </div>
              <div className="p-6">
                <div className="text-center py-8 text-gray-500">
                  <BarChart3 className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Select an evaluation run to view detailed results</p>
                  <p className="text-sm">Go to the "Test Runs" tab and click "View Results" on any run</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {showCaseEditor && selectedCase && (
        <EvaluationCaseEditor
          evaluationCase={selectedCase}
          isOpen={showCaseEditor}
          onClose={() => {
            setShowCaseEditor(false)
            setSelectedCase(null)
          }}
          onSave={(updatedCase: EvaluationCase) => {
            // Handle saving the evaluation case
            console.log('Saving evaluation case:', updatedCase)
            setShowCaseEditor(false)
            setSelectedCase(null)
            fetchEvaluationData()
          }}
        />
      )}

      {showRunModal && selectedCase && (
        <EvaluationRunModal
          evaluationCase={selectedCase}
          isOpen={showRunModal}
          onClose={() => {
            setShowRunModal(false)
            setSelectedCase(null)
          }}
          onRun={(runConfig: { name: string; traceId?: string; traceFile?: File; description?: string }) => {
            // Handle running the evaluation
            console.log('Running evaluation:', runConfig)
            setShowRunModal(false)
            setSelectedCase(null)
            fetchEvaluationData()
          }}
        />
      )}

      {showResultsModal && selectedRun && (
        <EvaluationResultsModal
          evaluationRun={selectedRun}
          isOpen={showResultsModal}
          onClose={() => {
            setShowResultsModal(false)
            setSelectedRun(null)
          }}
        />
      )}
    </div>
  )
} 