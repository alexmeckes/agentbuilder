"use client"

import React, { useState, useEffect } from 'react'
import { 
  FlaskConical, Play, Plus, FileText, BarChart3, Clock, 
  CheckCircle, XCircle, AlertCircle, Eye, Download, Upload,
  Settings, Trash2, Edit, Copy, Filter, Search, RefreshCw, X, Loader2
} from 'lucide-react'
import { EvaluationCase, EvaluationRun, EvaluationMetrics, EVALUATION_TEMPLATES, EvaluationTemplateKey } from '../types/evaluation'
import { EvaluationCaseEditor } from './evaluations/EvaluationCaseEditor'
import { EvaluationResultsModal } from './evaluations/EvaluationResultsModal'
import { EvaluationRunModal } from './evaluations/EvaluationRunModal'

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000'

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
  const [saveStatus, setSaveStatus] = useState<{ type: 'idle' | 'saving' | 'success' | 'error', message?: string }>({ type: 'idle' })
  const [runStatus, setRunStatus] = useState<{ type: 'idle' | 'running' | 'success' | 'error', message?: string }>({ type: 'idle' })
  const [runProgress, setRunProgress] = useState<{
    [runId: string]: {
      current_step?: number
      total_steps?: number
      current_activity?: string
      percentage?: number
      elapsed_ms?: number
    }
  }>({})
  const [progressPolling, setProgressPolling] = useState<{[runId: string]: NodeJS.Timeout}>({})

  useEffect(() => {
    fetchEvaluationData()
  }, [])

  const fetchEvaluationData = async () => {
    setLoading(true)
    try {
      // Fetch evaluation cases
      const casesResponse = await fetch(`${BACKEND_URL}/api/evaluations/cases`)
      const casesData = casesResponse.ok ? await casesResponse.json() : { cases: [] }
      
      // Fetch evaluation runs
      const runsResponse = await fetch(`${BACKEND_URL}/api/evaluations/runs`)
      const runsData = runsResponse.ok ? await runsResponse.json() : { runs: [] }
      
      // Fetch metrics
      const metricsResponse = await fetch(`${BACKEND_URL}/api/evaluations/metrics`)
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

  const handleStartEvaluationRun = async (runConfig: { 
    name: string; 
    traceId?: string; 
    traceFile?: File; 
    description?: string;
    evaluationCase: EvaluationCase;
  }) => {
    setRunStatus({ type: 'running', message: 'Starting evaluation run...' })
    
    try {
      // Prepare the request data
      const requestData = {
        evaluation_case_id: runConfig.evaluationCase.id,
        run_name: runConfig.name,
        description: runConfig.description,
        trace_id: runConfig.traceId,
        // Note: File upload would need separate handling for actual file content
        trace_file_name: runConfig.traceFile?.name,
        llm_judge: runConfig.evaluationCase.llm_judge,
        checkpoints: runConfig.evaluationCase.checkpoints,
        ground_truth: runConfig.evaluationCase.ground_truth,
        final_output_criteria: runConfig.evaluationCase.final_output_criteria || []
      }

      const response = await fetch(`${BACKEND_URL}/api/evaluations/run`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      })

      const data = await response.json()

      if (response.ok && data.evaluation_id) {        
        // Create a temporary run entry to show in the table immediately
        const tempRun: EvaluationRun = {
          id: data.evaluation_id,
          name: runConfig.name,
          evaluation_case: runConfig.evaluationCase,
          status: 'running',
          result: {
            trace: null, // Will be populated when complete
            hypothesis_answer: null, // Will be populated when complete
            score: 0,
            total_points: 0,
            earned_points: 0,
            checkpoint_results: [],
            ground_truth_results: [],
            final_output_results: []
          },
          duration_ms: 0,
          created_at: new Date().toISOString(),
          trace_id: runConfig.traceId || ''
        }
        
        // Add the temp run to the state immediately
        setEvaluationRuns(prev => [tempRun, ...prev])
        
        // Start progress polling
        startProgressPolling(data.evaluation_id)
        
        // Close modal and refresh data
        setShowRunModal(false)
        setSelectedCase(null)
        
        // Switch to runs tab to show the new run
        setActiveTab('runs')
        
        // Clear any previous status
        setRunStatus({ type: 'idle' })
        
      } else {
        throw new Error(data.message || 'Failed to start evaluation')
      }
    } catch (error) {
      console.error('Failed to start evaluation:', error)
      setRunStatus({ 
        type: 'error', 
        message: `❌ Failed to start evaluation: ${error instanceof Error ? error.message : 'Unknown error'}` 
      })
      
      // Clear error status after 5 seconds
      setTimeout(() => {
        setRunStatus({ type: 'idle' })
      }, 5000)
    }
  }

  const startProgressPolling = (evaluationId: string) => {
    // Clear any existing polling
    if (progressPolling[evaluationId]) {
      clearInterval(progressPolling[evaluationId])
    }

    let isPolling = true // Local flag to track if we should continue polling

    const pollProgress = async () => {
      if (!isPolling) return // Stop if polling was cancelled
      
      try {
        const response = await fetch(`${BACKEND_URL}/api/evaluations/runs/${evaluationId}/progress`)
        if (response.ok) {
          const progressData = await response.json()
          setRunProgress(prev => ({
            ...prev,
            [evaluationId]: {
              current_step: progressData.progress?.current_step,
              total_steps: progressData.progress?.total_steps,
              current_activity: progressData.progress?.current_activity || '',
              percentage: progressData.progress?.percentage || 0,
              elapsed_ms: progressData.elapsed_ms || 0
            }
          }))
          
          if (progressData.status === 'completed') {
            // Evaluation completed - STOP polling immediately
            isPolling = false
            if (progressPolling[evaluationId]) {
              clearInterval(progressPolling[evaluationId])
              setProgressPolling(prev => {
                const newState = { ...prev }
                delete newState[evaluationId]
                return newState
              })
            }
            
            const duration = progressData.elapsed_ms ? `${Math.round(progressData.elapsed_ms / 1000)}s` : 'unknown time'
            setRunStatus({ 
              type: 'success', 
              message: `✅ Evaluation completed successfully in ${duration}!` 
            })
            
            // Clear progress for this run
            setRunProgress(prev => {
              const newState = { ...prev }
              delete newState[evaluationId]
              return newState
            })
            
            // Refresh the evaluation data to get the actual completed results
            fetchEvaluationData()
            
            // Clear success message after 5 seconds
            setTimeout(() => {
              setRunStatus({ type: 'idle' })
            }, 5000)
          } else if (progressData.status === 'failed') {
            // Evaluation failed - STOP polling immediately
            isPolling = false
            if (progressPolling[evaluationId]) {
              clearInterval(progressPolling[evaluationId])
              setProgressPolling(prev => {
                const newState = { ...prev }
                delete newState[evaluationId]
                return newState
              })
            }
            
            setRunStatus({ 
              type: 'error', 
              message: `❌ Evaluation failed` 
            })
            
            // Clear progress for this run
            setRunProgress(prev => {
              const newState = { ...prev }
              delete newState[evaluationId]
              return newState
            })
            
            // Clear error message after 5 seconds
            setTimeout(() => {
              setRunStatus({ type: 'idle' })
            }, 5000)
          }
        }
      } catch (error) {
        console.error('Failed to fetch progress:', error)
        // On error, stop polling to prevent endless failed requests
        isPolling = false
        if (progressPolling[evaluationId]) {
          clearInterval(progressPolling[evaluationId])
          setProgressPolling(prev => {
            const newState = { ...prev }
            delete newState[evaluationId]
            return newState
          })
        }
      }
    }

    // Poll every 2 seconds
    const interval = setInterval(pollProgress, 2000)
    setProgressPolling(prev => ({
      ...prev,
      [evaluationId]: interval
    }))
    
    // Initial poll
    pollProgress()
    
    // Return cleanup function
    return () => {
      isPolling = false
      clearInterval(interval)
    }
  }

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      for (const runId in progressPolling) {
        if (progressPolling[runId]) {
          clearInterval(progressPolling[runId])
        }
      }
    }
  }, [progressPolling])

  const handleViewResults = (run: EvaluationRun) => {
    setSelectedRun(run)
    setShowResultsModal(true)
  }

  const handleSaveEvaluationCase = async (evaluationCase: EvaluationCase) => {
    setSaveStatus({ type: 'saving', message: 'Saving evaluation case...' })
    
    try {
      const response = await fetch(`${BACKEND_URL}/api/evaluations/cases`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(evaluationCase),
      })

      if (!response.ok) {
        throw new Error(`Failed to save evaluation case: ${response.statusText}`)
      }

      const result = await response.json()
      
      setSaveStatus({ 
        type: 'success', 
        message: 'Evaluation case saved successfully!' 
      })
      
      // Close the editor and refresh data
      setShowCaseEditor(false)
      setSelectedCase(null)
      
      // Refresh the evaluation data to show the new case
      await fetchEvaluationData()
      
      // Switch to cases tab to show the saved evaluation
      setActiveTab('cases')
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSaveStatus({ type: 'idle', message: '' })
      }, 3000)
      
    } catch (error) {
      console.error('Failed to save evaluation case:', error)
      setSaveStatus({ 
        type: 'error', 
        message: error instanceof Error ? error.message : 'Failed to save evaluation case. Please try again.' 
      })
      
      // Clear error message after 5 seconds
      setTimeout(() => {
        setSaveStatus({ type: 'idle', message: '' })
      }, 5000)
    }
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

  if (loading && evaluationRuns.length === 0) {
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

        {/* Status Notifications */}
        {(saveStatus.type === 'success' || saveStatus.type === 'error' || runStatus.type === 'success' || runStatus.type === 'error') && (
          <div className="fixed top-4 right-4 z-50 space-y-2">
            {(saveStatus.type === 'success' || saveStatus.type === 'error') && (
              <div className={`max-w-md px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 ${
                saveStatus.type === 'success' ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
              }`}>
                <div className={`w-2 h-2 rounded-full ${
                  saveStatus.type === 'success' ? 'bg-green-500' : 'bg-red-500'
                }`} />
                <span className={`text-sm font-medium ${
                  saveStatus.type === 'success' ? 'text-green-800' : 'text-red-800'
                }`}>
                  {saveStatus.message}
                </span>
                <button
                  onClick={() => setSaveStatus({ type: 'idle', message: '' })}
                  className="ml-auto text-current opacity-70 hover:opacity-100"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
            
            {(runStatus.type === 'success' || runStatus.type === 'error') && (
              <div className={`max-w-md px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 ${
                runStatus.type === 'success' ? 'bg-green-50 border border-green-200' : 
                'bg-red-50 border border-red-200'
              }`}>
                <div className={`w-2 h-2 rounded-full ${
                  runStatus.type === 'success' ? 'bg-green-500' : 'bg-red-500'
                }`} />
                <span className={`text-sm font-medium ${
                  runStatus.type === 'success' ? 'text-green-800' : 'text-red-800'
                }`}>
                  {runStatus.message}
                </span>
                <button
                  onClick={() => setRunStatus({ type: 'idle' })}
                  className="ml-auto text-current opacity-70 hover:opacity-100"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        )}

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
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Evaluation Health Status */}
            <div className="bg-white rounded-lg shadow border">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Evaluation Health</h3>
                <p className="text-sm text-gray-600">Current status of your AI workflow testing</p>
              </div>
              <div className="p-6">
                {evaluationRuns.length === 0 ? (
                  <div className="text-center py-8">
                    <FlaskConical className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                    <h4 className="text-lg font-medium text-gray-900 mb-2">No evaluations yet</h4>
                    <p className="text-gray-600 mb-6">Start testing your AI workflows to ensure reliability and performance</p>
                    <div className="flex flex-col sm:flex-row gap-3 justify-center">
                      <button
                        onClick={() => handleCreateCase()}
                        className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2"
                      >
                        <Plus className="w-4 h-4" />
                        Create Your First Evaluation
                      </button>
                      <button
                        onClick={() => setActiveTab('cases')}
                        className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 flex items-center gap-2"
                      >
                        <FileText className="w-4 h-4" />
                        Browse Templates
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Recent Activity */}
                    <div className="md:col-span-2">
                      <h4 className="font-medium text-gray-900 mb-4">Recent Activity</h4>
                      <div className="space-y-3">
                        {evaluationRuns.slice(0, 5).map((run) => (
                          <div key={run.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <div className="flex items-center gap-3">
                              {getStatusIcon(run.status)}
                              <div>
                                <p className="text-sm font-medium text-gray-900">{run.name}</p>
                                <p className="text-xs text-gray-500">
                                  {new Date(run.created_at).toLocaleDateString()} • 
                                  {run.status === 'completed' && ` ${formatScore(run.result.score)} score`}
                                  {run.status === 'running' && ` In progress`}
                                  {run.status === 'failed' && ` Failed`}
                                </p>
                              </div>
                            </div>
                            {run.status === 'completed' && (
                              <button
                                onClick={() => handleViewResults(run)}
                                className="text-purple-600 hover:text-purple-700 text-sm font-medium"
                              >
                                View Results
                              </button>
                            )}
                          </div>
                        ))}
                        {evaluationRuns.length > 5 && (
                          <button
                            onClick={() => setActiveTab('runs')}
                            className="w-full text-center py-2 text-purple-600 hover:text-purple-700 text-sm font-medium"
                          >
                            View all {evaluationRuns.length} runs →
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Quick Stats */}
                    <div>
                      <h4 className="font-medium text-gray-900 mb-4">Quick Stats</h4>
                      <div className="space-y-3">
                        <div className="p-3 bg-blue-50 rounded-lg">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-blue-700">Total Runs</span>
                            <span className="font-semibold text-blue-900">{evaluationRuns.length}</span>
                          </div>
                        </div>
                        <div className="p-3 bg-green-50 rounded-lg">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-green-700">Completed</span>
                            <span className="font-semibold text-green-900">
                              {evaluationRuns.filter(r => r.status === 'completed').length}
                            </span>
                          </div>
                        </div>
                        <div className="p-3 bg-yellow-50 rounded-lg">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-yellow-700">Running</span>
                            <span className="font-semibold text-yellow-900">
                              {evaluationRuns.filter(r => r.status === 'running').length}
                            </span>
                          </div>
                        </div>
                        {evaluationRuns.filter(r => r.status === 'failed').length > 0 && (
                          <div className="p-3 bg-red-50 rounded-lg">
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-red-700">Failed</span>
                              <span className="font-semibold text-red-900">
                                {evaluationRuns.filter(r => r.status === 'failed').length}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-lg shadow border">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Quick Actions</h3>
                <p className="text-sm text-gray-600">Common evaluation tasks</p>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <button
                    onClick={() => handleCreateCase()}
                    className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-purple-300 hover:bg-purple-50 transition-colors group"
                  >
                    <Plus className="w-8 h-8 text-gray-400 group-hover:text-purple-600 mx-auto mb-2" />
                    <h4 className="font-medium text-gray-900 group-hover:text-purple-700">New Evaluation Case</h4>
                    <p className="text-sm text-gray-600 mt-1">Create a custom evaluation</p>
                  </button>

                  <button
                    onClick={() => handleCreateCase('basic-qa')}
                    className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <FileText className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                    <h4 className="font-medium text-gray-900">Q&A Evaluation</h4>
                    <p className="text-sm text-gray-600 mt-1">Test question-answering workflows</p>
                  </button>

                  <button
                    onClick={() => handleCreateCase('research-workflow')}
                    className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <BarChart3 className="w-8 h-8 text-green-600 mx-auto mb-2" />
                    <h4 className="font-medium text-gray-900">Research Evaluation</h4>
                    <p className="text-sm text-gray-600 mt-1">Evaluate research workflows</p>
                  </button>
                </div>
              </div>
            </div>

            {/* Smart Recommendations */}
            {evaluationRuns.length > 0 && (
              <div className="bg-white rounded-lg shadow border">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900">Recommendations</h3>
                  <p className="text-sm text-gray-600">Suggested actions based on your evaluation history</p>
                </div>
                <div className="p-6">
                  <div className="space-y-4">
                    {/* Failed runs recommendation */}
                    {evaluationRuns.filter(r => r.status === 'failed').length > 0 && (
                      <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
                        <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
                        <div className="flex-1">
                          <h4 className="font-medium text-red-900">
                            {evaluationRuns.filter(r => r.status === 'failed').length} failed evaluation{evaluationRuns.filter(r => r.status === 'failed').length !== 1 ? 's' : ''}
                          </h4>
                          <p className="text-sm text-red-700 mt-1">
                            Review and re-run failed evaluations to ensure your workflows are working correctly.
                          </p>
                          <button
                            onClick={() => {
                              setStatusFilter('failed')
                              setActiveTab('runs')
                            }}
                            className="mt-2 text-sm font-medium text-red-600 hover:text-red-700"
                          >
                            Review failed runs →
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Low scoring runs */}
                    {evaluationRuns.filter(r => r.status === 'completed' && r.result.score < 0.7).length > 0 && (
                      <div className="flex items-start gap-3 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
                        <div className="flex-1">
                          <h4 className="font-medium text-yellow-900">
                            {evaluationRuns.filter(r => r.status === 'completed' && r.result.score < 0.7).length} evaluation{evaluationRuns.filter(r => r.status === 'completed' && r.result.score < 0.7).length !== 1 ? 's' : ''} with low scores
                          </h4>
                          <p className="text-sm text-yellow-700 mt-1">
                            Some evaluations scored below 70%. Consider reviewing these workflows for improvements.
                          </p>
                          <button
                            onClick={() => setActiveTab('runs')}
                            className="mt-2 text-sm font-medium text-yellow-600 hover:text-yellow-700"
                          >
                            Review low-scoring runs →
                          </button>
                        </div>
                      </div>
                    )}

                    {/* No recent evaluations */}
                    {evaluationRuns.length > 0 && 
                     evaluationRuns.filter(r => new Date(r.created_at) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)).length === 0 && (
                      <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                        <Clock className="w-5 h-5 text-blue-600 mt-0.5" />
                        <div className="flex-1">
                          <h4 className="font-medium text-blue-900">No recent evaluations</h4>
                          <p className="text-sm text-blue-700 mt-1">
                            It's been a while since your last evaluation. Regular testing helps catch issues early.
                          </p>
                          <button
                            onClick={() => handleCreateCase()}
                            className="mt-2 text-sm font-medium text-blue-600 hover:text-blue-700"
                          >
                            Run new evaluation →
                          </button>
                        </div>
                      </div>
                    )}

                    {/* All good state */}
                    {evaluationRuns.filter(r => r.status === 'failed').length === 0 && 
                     evaluationRuns.filter(r => r.status === 'completed' && r.result.score < 0.7).length === 0 && 
                     evaluationRuns.filter(r => new Date(r.created_at) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)).length > 0 && (
                      <div className="flex items-start gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
                        <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                        <div className="flex-1">
                          <h4 className="font-medium text-green-900">All evaluations looking good!</h4>
                          <p className="text-sm text-green-700 mt-1">
                            Your recent evaluations are passing with good scores. Keep up the great work!
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
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
                          {/* Show progress if run is active and has progress */}
                          {run.status === 'running' && runProgress[run.id] && (
                            <div className="mt-1">
                              <div className="flex items-center gap-2 text-xs text-blue-600">
                                <Loader2 className="w-3 h-3 animate-spin" />
                                <span>
                                  {runProgress[run.id].current_activity} 
                                  {runProgress[run.id].current_step && runProgress[run.id].total_steps && (
                                    <span> ({runProgress[run.id].current_step}/{runProgress[run.id].total_steps})</span>
                                  )}
                                  {runProgress[run.id].percentage !== undefined && (
                                    <span> {Math.round(runProgress[run.id].percentage!)}%</span>
                                  )}
                                  {runProgress[run.id].elapsed_ms && (
                                    <span> {Math.round(runProgress[run.id].elapsed_ms! / 1000)}s</span>
                                  )}
                                </span>
                              </div>
                              {runProgress[run.id].percentage !== undefined && (
                                <div className="mt-1 w-full bg-gray-200 rounded-full h-1">
                                  <div 
                                    className="bg-blue-500 h-1 rounded-full transition-all duration-300 ease-out" 
                                    style={{ width: `${runProgress[run.id].percentage}%` }}
                                  />
                                </div>
                              )}
                            </div>
                          )}
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
          onSave={handleSaveEvaluationCase}
          isSaving={saveStatus.type === 'saving'}
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
          onRun={handleStartEvaluationRun}
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