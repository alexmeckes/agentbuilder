"use client"

import { useState } from 'react'
import { X, Play, Upload, FileText } from 'lucide-react'
import { EvaluationCase } from '../../types/evaluation'

interface EvaluationRunModalProps {
  evaluationCase: EvaluationCase
  isOpen: boolean
  onClose: () => void
  onRun: (runConfig: {
    name: string
    traceId?: string
    traceFile?: File
    description?: string
    evaluationCase: EvaluationCase
  }) => void
}

export function EvaluationRunModal({ evaluationCase, isOpen, onClose, onRun }: EvaluationRunModalProps) {
  const [runName, setRunName] = useState('')
  const [traceId, setTraceId] = useState('')
  const [traceFile, setTraceFile] = useState<File | null>(null)
  const [description, setDescription] = useState('')
  const [inputMethod, setInputMethod] = useState<'trace-id' | 'file-upload'>('trace-id')

  if (!isOpen) return null

  const handleRun = () => {
    if (!runName.trim()) return

    const config = {
      name: runName,
      description,
      ...(inputMethod === 'trace-id' ? { traceId } : { traceFile: traceFile || undefined }),
      evaluationCase
    }

    onRun(config)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setTraceFile(file)
    }
  }

  const isValid = runName.trim() && (
    (inputMethod === 'trace-id' && traceId.trim()) ||
    (inputMethod === 'file-upload' && traceFile)
  )

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 flex-shrink-0">
          <h2 className="text-xl font-semibold text-gray-900">Run Evaluation</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Evaluation Case Summary */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-medium text-gray-900 mb-2">Evaluation Configuration</h3>
            <div className="text-sm text-gray-600 space-y-1">
              <p><span className="font-medium">Judge Model:</span> {evaluationCase.llm_judge}</p>
              <p><span className="font-medium">Checkpoints:</span> {evaluationCase.checkpoints.length}</p>
              <p><span className="font-medium">Ground Truth Items:</span> {evaluationCase.ground_truth.length}</p>
            </div>
          </div>

          {/* Run Configuration */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Run Name *
            </label>
            <input
              type="text"
              value={runName}
              onChange={(e) => setRunName(e.target.value)}
              placeholder="e.g., Research Workflow Test - v1.2"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description (Optional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what this evaluation run is testing..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              rows={2}
            />
          </div>

          {/* Trace Input Method */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Trace Input Method *
            </label>
            <div className="space-y-3">
              <div className="flex items-center">
                <input
                  type="radio"
                  id="trace-id"
                  name="inputMethod"
                  value="trace-id"
                  checked={inputMethod === 'trace-id'}
                  onChange={(e) => setInputMethod(e.target.value as 'trace-id')}
                  className="mr-2"
                />
                <label htmlFor="trace-id" className="text-sm text-gray-700">
                  Use existing trace ID
                </label>
              </div>
              <div className="flex items-center">
                <input
                  type="radio"
                  id="file-upload"
                  name="inputMethod"
                  value="file-upload"
                  checked={inputMethod === 'file-upload'}
                  onChange={(e) => setInputMethod(e.target.value as 'file-upload')}
                  className="mr-2"
                />
                <label htmlFor="file-upload" className="text-sm text-gray-700">
                  Upload trace file
                </label>
              </div>
            </div>
          </div>

          {/* Trace ID Input */}
          {inputMethod === 'trace-id' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Trace ID *
              </label>
              <input
                type="text"
                value={traceId}
                onChange={(e) => setTraceId(e.target.value)}
                placeholder="Enter the trace ID to evaluate"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">
                You can find trace IDs in the Analytics dashboard or Trace Viewer
              </p>
            </div>
          )}

          {/* File Upload */}
          {inputMethod === 'file-upload' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Trace File *
              </label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                <div className="text-center">
                  <Upload className="w-6 h-6 text-gray-400 mx-auto mb-2" />
                  <div className="text-sm text-gray-600">
                    <label htmlFor="trace-file" className="cursor-pointer text-purple-600 hover:text-purple-700">
                      Click to upload
                    </label>
                    <span> or drag and drop</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">JSON trace files only</p>
                  <input
                    id="trace-file"
                    type="file"
                    accept=".json"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </div>
                {traceFile && (
                  <div className="mt-3 flex items-center gap-2 text-sm text-gray-700">
                    <FileText className="w-4 h-4" />
                    <span>{traceFile.name}</span>
                    <button
                      onClick={() => setTraceFile(null)}
                      className="text-red-600 hover:text-red-800 ml-auto"
                    >
                      Remove
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Evaluation Preview */}
          <div className="bg-blue-50 rounded-lg p-4">
            <h4 className="font-medium text-blue-900 mb-2">What will be evaluated:</h4>
            <ul className="text-sm text-blue-800 space-y-1 max-h-32 overflow-y-auto">
              {evaluationCase.checkpoints.map((checkpoint, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="text-blue-600">•</span>
                  <span>{checkpoint.criteria} ({checkpoint.points} points)</span>
                </li>
              ))}
              {evaluationCase.ground_truth.map((truth, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="text-blue-600">•</span>
                  <span>Direct comparison: {truth.name} should be "{truth.value}" ({truth.points} points)</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 flex-shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleRun}
            disabled={!isValid}
            className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
              isValid
                ? 'bg-purple-600 text-white hover:bg-purple-700'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            <Play className="w-4 h-4" />
            Run Evaluation
          </button>
        </div>
      </div>
    </div>
  )
} 