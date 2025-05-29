"use client"

import { X, CheckCircle, XCircle, BarChart3, Download, Eye } from 'lucide-react'
import { EvaluationRun, EvaluationResult } from '../../types/evaluation'

interface EvaluationResultsModalProps {
  evaluationRun: EvaluationRun
  isOpen: boolean
  onClose: () => void
}

export function EvaluationResultsModal({ evaluationRun, isOpen, onClose }: EvaluationResultsModalProps) {
  if (!isOpen) return null

  const { result } = evaluationRun
  const allResults = [
    ...result.checkpoint_results,
    ...result.ground_truth_results,
    ...result.final_output_results
  ]

  const totalPoints = result.total_points || allResults.reduce((sum, r) => sum + r.points, 0)
  const earnedPoints = result.earned_points || allResults.filter(r => r.passed).reduce((sum, r) => sum + r.points, 0)
  const passedCount = allResults.filter(r => r.passed).length
  const failedCount = allResults.length - passedCount

  const formatScore = (score: number) => `${Math.round(score * 100)}%`

  const ResultSection = ({ title, results, color }: { 
    title: string
    results: EvaluationResult[]
    color: string 
  }) => {
    if (results.length === 0) return null

    return (
      <div className="space-y-3">
        <h4 className={`font-medium ${color}`}>{title}</h4>
        <div className="space-y-2">
          {results.map((result, index) => (
            <div key={index} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 mt-0.5">
                  {result.passed ? (
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-500" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-medium text-gray-900">{result.criteria}</p>
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                      result.passed 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {result.passed ? `+${result.points}` : '0'} / {result.points} pts
                    </span>
                  </div>
                  <p className="text-sm text-gray-600">{result.reason}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-5xl w-full max-h-[95vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 flex-shrink-0">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">{evaluationRun.name}</h2>
            <p className="text-sm text-gray-600">Evaluation Results</p>
          </div>
          <div className="flex items-center gap-3">
            <button className="px-3 py-1 bg-gray-600 text-white rounded hover:bg-gray-700 flex items-center gap-1">
              <Download className="w-4 h-4" />
              Export
            </button>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-6">
            {/* Overall Score */}
            <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Overall Score</h3>
                  <p className="text-sm text-gray-600">Based on all evaluation criteria</p>
                </div>
                <div className="text-right">
                  <div className={`text-3xl font-bold ${
                    result.score >= 0.8 ? 'text-green-600' :
                    result.score >= 0.6 ? 'text-yellow-600' : 'text-red-600'
                  }`}>
                    {formatScore(result.score)}
                  </div>
                  <p className="text-sm text-gray-600">{earnedPoints} / {totalPoints} points</p>
                </div>
              </div>
              
              {/* Score Breakdown */}
              <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-semibold text-green-600">{passedCount}</div>
                  <div className="text-sm text-gray-600">Passed</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-semibold text-red-600">{failedCount}</div>
                  <div className="text-sm text-gray-600">Failed</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-semibold text-gray-900">{allResults.length}</div>
                  <div className="text-sm text-gray-600">Total Criteria</div>
                </div>
              </div>
            </div>

            {/* Run Information */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-medium text-gray-900 mb-3">Run Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium text-gray-700">Run ID:</span>
                  <span className="ml-2 text-gray-600 font-mono">{evaluationRun.id}</span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Trace ID:</span>
                  <span className="ml-2 text-gray-600 font-mono">{evaluationRun.trace_id}</span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Created:</span>
                  <span className="ml-2 text-gray-600">{new Date(evaluationRun.created_at).toLocaleString()}</span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Duration:</span>
                  <span className="ml-2 text-gray-600">
                    {evaluationRun.duration_ms ? `${(evaluationRun.duration_ms / 1000).toFixed(2)}s` : 'N/A'}
                  </span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Judge Model:</span>
                  <span className="ml-2 text-gray-600">{evaluationRun.evaluation_case.llm_judge}</span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Status:</span>
                  <span className={`ml-2 px-2 py-1 text-xs font-semibold rounded-full ${
                    evaluationRun.status === 'completed' 
                      ? 'bg-green-100 text-green-800'
                      : evaluationRun.status === 'failed'
                      ? 'bg-red-100 text-red-800'
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {evaluationRun.status}
                  </span>
                </div>
              </div>
            </div>

            {/* Final Answer */}
            {result.hypothesis_answer && (
              <div className="bg-blue-50 rounded-lg p-4">
                <h3 className="font-medium text-blue-900 mb-2">Final Answer</h3>
                <p className="text-blue-800 text-sm">{result.hypothesis_answer}</p>
              </div>
            )}

            {/* Detailed Results */}
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Detailed Results
              </h3>

              <ResultSection
                title="Checkpoint Evaluations"
                results={result.checkpoint_results}
                color="text-purple-700"
              />

              <ResultSection
                title="Ground Truth Evaluations"
                results={result.ground_truth_results}
                color="text-blue-700"
              />

              <ResultSection
                title="Final Output Evaluations"
                results={result.final_output_results}
                color="text-green-700"
              />

              {allResults.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <BarChart3 className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No evaluation results available</p>
                </div>
              )}
            </div>

            {/* Recommendations */}
            {result.score < 0.8 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <h3 className="font-medium text-yellow-800 mb-2">Improvement Recommendations</h3>
                <ul className="text-sm text-yellow-700 space-y-1">
                  {failedCount > 0 && (
                    <li>• Review the {failedCount} failed criteria and adjust your workflow accordingly</li>
                  )}
                  {result.score < 0.6 && (
                    <li>• Consider revising your evaluation criteria to ensure they're achievable</li>
                  )}
                  <li>• Analyze the detailed feedback for each criterion to identify specific areas for improvement</li>
                  <li>• Run additional evaluations after making changes to track progress</li>
                </ul>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 flex-shrink-0">
          <button className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2">
            <Eye className="w-4 h-4" />
            View Trace
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
} 