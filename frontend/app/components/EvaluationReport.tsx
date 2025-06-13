"use client"

import { useState, useEffect } from 'react'
import { CheckCircle, XCircle, AlertCircle, Activity, TrendingUp, Clock, DollarSign, BarChart3 } from 'lucide-react'

interface EvaluationResult {
  passed: boolean
  reason: string
  criteria: string
  points: number
}

interface StepEvaluation {
  step_name: string
  node_id: string
  step_score: number
  duration_ms: number
  cost: number
  evaluation_results: EvaluationResult[]
}

interface FlowEvaluation {
  flow_coherence: number
  information_preservation: number
  efficiency: number
  transition_quality: any[]
}

interface WorkflowEvaluation {
  execution_id: string
  overall_score: number
  final_output_evaluation: {
    score: number
    total_points: number
    earned_points: number
    results: EvaluationResult[]
  }
  step_evaluations: StepEvaluation[]
  flow_evaluation: FlowEvaluation
  step_scores: number[]
  bottleneck_analysis: string[]
  performance_metrics: {
    total_duration_ms: number
    total_cost: number
    efficiency_score: number
  }
}

interface EvaluationReportProps {
  evaluationId: string
}

export function EvaluationReport({ evaluationId }: EvaluationReportProps) {
  const [evaluation, setEvaluation] = useState<WorkflowEvaluation | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedStep, setSelectedStep] = useState<string | null>(null)

  useEffect(() => {
    fetchEvaluation()
  }, [evaluationId])

  const fetchEvaluation = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/evaluations/${evaluationId}/enhanced`)
      if (!response.ok) throw new Error('Failed to fetch evaluation')
      const data = await response.json()
      setEvaluation(data.result)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
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

  if (error || !evaluation) {
    return (
      <div className="flex items-center justify-center h-96 text-red-600">
        <AlertCircle className="w-6 h-6 mr-2" />
        {error || 'No evaluation data found'}
      </div>
    )
  }

  const overallPassed = evaluation.overall_score >= 0.7

  return (
    <div className="space-y-6">
      {/* Overall Score Card */}
      <div className={`bg-white rounded-lg p-6 shadow-sm border-2 ${
        overallPassed ? 'border-green-500' : 'border-red-500'
      }`}>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              Workflow Evaluation Report
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Execution ID: {evaluation.execution_id}
            </p>
          </div>
          <div className="text-center">
            <div className={`text-4xl font-bold ${
              overallPassed ? 'text-green-600' : 'text-red-600'
            }`}>
              {(evaluation.overall_score * 100).toFixed(1)}%
            </div>
            <p className="text-sm text-gray-600 mt-1">
              {overallPassed ? 'PASSED' : 'FAILED'}
            </p>
          </div>
        </div>

        {/* Score Breakdown */}
        <div className="grid grid-cols-3 gap-4 mt-6">
          <div className="text-center">
            <p className="text-sm text-gray-600">Final Output</p>
            <p className="text-xl font-semibold text-gray-900">
              {(evaluation.final_output_evaluation.score * 100).toFixed(0)}%
            </p>
            <p className="text-xs text-gray-500">
              {evaluation.final_output_evaluation.earned_points}/{evaluation.final_output_evaluation.total_points} pts
            </p>
          </div>
          <div className="text-center">
            <p className="text-sm text-gray-600">Step Quality</p>
            <p className="text-xl font-semibold text-gray-900">
              {evaluation.step_scores.length > 0 
                ? (evaluation.step_scores.reduce((a, b) => a + b, 0) / evaluation.step_scores.length * 100).toFixed(0)
                : 0}%
            </p>
          </div>
          <div className="text-center">
            <p className="text-sm text-gray-600">Flow Quality</p>
            <p className="text-xl font-semibold text-gray-900">
              {((evaluation.flow_evaluation.flow_coherence + evaluation.flow_evaluation.information_preservation) / 2 * 100).toFixed(0)}%
            </p>
          </div>
        </div>
      </div>

      {/* Performance Metrics */}
      <div className="bg-white rounded-lg p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <BarChart3 className="w-5 h-5" />
          Performance Metrics
        </h3>
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Duration</p>
                <p className="text-xl font-semibold text-gray-900">
                  {(evaluation.performance_metrics.total_duration_ms / 1000).toFixed(2)}s
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
                  ${evaluation.performance_metrics.total_cost.toFixed(4)}
                </p>
              </div>
              <DollarSign className="w-8 h-8 text-gray-400" />
            </div>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Efficiency</p>
                <p className="text-xl font-semibold text-gray-900">
                  {(evaluation.performance_metrics.efficiency_score * 100).toFixed(0)}%
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-gray-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Step-by-Step Evaluation */}
      <div className="bg-white rounded-lg p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Activity className="w-5 h-5" />
          Step-by-Step Evaluation
        </h3>
        <div className="space-y-3">
          {evaluation.step_evaluations.map((step, index) => {
            const stepPassed = step.step_score >= 0.7
            const isSelected = selectedStep === step.node_id
            
            return (
              <div 
                key={step.node_id}
                className={`border rounded-lg p-4 cursor-pointer transition-all ${
                  isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => setSelectedStep(isSelected ? null : step.node_id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {stepPassed ? (
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-500" />
                    )}
                    <div>
                      <h4 className="font-medium text-gray-900">{step.step_name}</h4>
                      <p className="text-sm text-gray-600">
                        Node ID: {step.node_id}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-lg font-semibold ${
                      stepPassed ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {(step.step_score * 100).toFixed(0)}%
                    </p>
                    <p className="text-xs text-gray-500">
                      {step.duration_ms.toFixed(0)}ms • ${step.cost.toFixed(4)}
                    </p>
                  </div>
                </div>
                
                {isSelected && (
                  <div className="mt-4 space-y-2">
                    {step.evaluation_results.map((result, i) => (
                      <div key={i} className="bg-white rounded p-3 border border-gray-100">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-2">
                            {result.passed ? (
                              <CheckCircle className="w-4 h-4 text-green-500 mt-0.5" />
                            ) : (
                              <XCircle className="w-4 h-4 text-red-500 mt-0.5" />
                            )}
                            <div className="flex-1">
                              <p className="text-sm text-gray-700">{result.criteria}</p>
                              <p className="text-xs text-gray-500 mt-1">{result.reason}</p>
                            </div>
                          </div>
                          <span className="text-sm font-medium text-gray-600">
                            {result.points} pts
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Flow Evaluation */}
      <div className="bg-white rounded-lg p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Workflow Flow Analysis
        </h3>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <p className="text-sm text-gray-600">Flow Coherence</p>
            <div className="mt-2">
              <div className="flex justify-between text-sm mb-1">
                <span>Logical Connection</span>
                <span>{(evaluation.flow_evaluation.flow_coherence * 100).toFixed(0)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full"
                  style={{ width: `${evaluation.flow_evaluation.flow_coherence * 100}%` }}
                />
              </div>
            </div>
          </div>
          <div>
            <p className="text-sm text-gray-600">Information Preservation</p>
            <div className="mt-2">
              <div className="flex justify-between text-sm mb-1">
                <span>Data Flow</span>
                <span>{(evaluation.flow_evaluation.information_preservation * 100).toFixed(0)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-green-600 h-2 rounded-full"
                  style={{ width: `${evaluation.flow_evaluation.information_preservation * 100}%` }}
                />
              </div>
            </div>
          </div>
          <div>
            <p className="text-sm text-gray-600">Efficiency</p>
            <div className="mt-2">
              <div className="flex justify-between text-sm mb-1">
                <span>No Redundancy</span>
                <span>{(evaluation.flow_evaluation.efficiency * 100).toFixed(0)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-purple-600 h-2 rounded-full"
                  style={{ width: `${evaluation.flow_evaluation.efficiency * 100}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottleneck Analysis */}
      {evaluation.bottleneck_analysis.length > 0 && (
        <div className="bg-white rounded-lg p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Bottleneck Analysis
          </h3>
          <div className="space-y-2">
            {evaluation.bottleneck_analysis.map((bottleneck, index) => (
              <div key={index} className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-yellow-500 mt-0.5" />
                <p className="text-sm text-gray-700">{bottleneck}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Final Output Evaluation */}
      <div className="bg-white rounded-lg p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Final Output Evaluation
        </h3>
        <div className="space-y-3">
          {evaluation.final_output_evaluation.results.map((result, index) => (
            <div key={index} className="flex items-start justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-start gap-3">
                {result.passed ? (
                  <CheckCircle className="w-5 h-5 text-green-500 mt-0.5" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-500 mt-0.5" />
                )}
                <div>
                  <p className="text-sm font-medium text-gray-900">{result.criteria}</p>
                  <p className="text-xs text-gray-600 mt-1">{result.reason}</p>
                </div>
              </div>
              <span className="text-sm font-medium text-gray-600">
                {result.points} pts
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}