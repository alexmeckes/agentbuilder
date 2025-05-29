"use client"

import { useState } from 'react'
import { X, Plus, Trash2, Save, Bot, Loader2 } from 'lucide-react'
import { EvaluationCase, CheckpointCriteria, GroundTruthAnswer } from '../../types/evaluation'
import { EvaluationAssistant } from './EvaluationAssistant'

interface EvaluationCaseEditorProps {
  evaluationCase: EvaluationCase
  isOpen: boolean
  onClose: () => void
  onSave: (evaluationCase: EvaluationCase) => void
  isSaving?: boolean
}

export function EvaluationCaseEditor({ evaluationCase, isOpen, onClose, onSave, isSaving = false }: EvaluationCaseEditorProps) {
  const [formData, setFormData] = useState<EvaluationCase>(evaluationCase)
  const [isAssistantOpen, setIsAssistantOpen] = useState(false)

  if (!isOpen) return null

  const handleAssistantSuggestion = (suggestion: any) => {
    switch (suggestion.type) {
      case 'checkpoint':
        if (suggestion.data.checkpoints) {
          setFormData({
            ...formData,
            checkpoints: [...formData.checkpoints, ...suggestion.data.checkpoints]
          })
        }
        break
      case 'ground_truth':
        if (suggestion.data.ground_truth) {
          setFormData({
            ...formData,
            ground_truth: [...formData.ground_truth, ...suggestion.data.ground_truth]
          })
        }
        break
      case 'judge_model':
        if (suggestion.data.llm_judge) {
          setFormData({
            ...formData,
            llm_judge: suggestion.data.llm_judge
          })
        }
        break
    }
  }

  const addCheckpoint = () => {
    setFormData({
      ...formData,
      checkpoints: [...formData.checkpoints, { points: 1, criteria: '' }]
    })
  }

  const updateCheckpoint = (index: number, field: keyof CheckpointCriteria, value: string | number) => {
    const updated = [...formData.checkpoints]
    updated[index] = { ...updated[index], [field]: value }
    setFormData({ ...formData, checkpoints: updated })
  }

  const removeCheckpoint = (index: number) => {
    setFormData({
      ...formData,
      checkpoints: formData.checkpoints.filter((_, i) => i !== index)
    })
  }

  const addGroundTruth = () => {
    setFormData({
      ...formData,
      ground_truth: [...formData.ground_truth, { name: '', value: '', points: 1 }]
    })
  }

  const updateGroundTruth = (index: number, field: keyof GroundTruthAnswer, value: string | number) => {
    const updated = [...formData.ground_truth]
    updated[index] = { ...updated[index], [field]: value }
    setFormData({ ...formData, ground_truth: updated })
  }

  const removeGroundTruth = (index: number) => {
    setFormData({
      ...formData,
      ground_truth: formData.ground_truth.filter((_, i) => i !== index)
    })
  }

  const handleSave = () => {
    onSave(formData)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Edit Evaluation Case</h2>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsAssistantOpen(!isAssistantOpen)}
              className="px-3 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 flex items-center gap-2 transition-all"
            >
              <Bot className="w-4 h-4" />
              AI Assistant
            </button>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          <div className="space-y-6">
            {/* LLM Judge */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                LLM Judge Model
              </label>
              <select
                value={formData.llm_judge}
                onChange={(e) => setFormData({ ...formData, llm_judge: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="openai/gpt-4o">OpenAI GPT-4o</option>
                <option value="openai/gpt-4o-mini">OpenAI GPT-4o Mini</option>
                <option value="anthropic/claude-3-sonnet">Anthropic Claude 3 Sonnet</option>
                <option value="anthropic/claude-3-haiku">Anthropic Claude 3 Haiku</option>
              </select>
            </div>

            {/* Checkpoints */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">Evaluation Checkpoints</h3>
                <button
                  onClick={addCheckpoint}
                  className="px-3 py-1 bg-purple-600 text-white rounded hover:bg-purple-700 flex items-center gap-1"
                >
                  <Plus className="w-4 h-4" />
                  Add Checkpoint
                </button>
              </div>
              <div className="space-y-4">
                {formData.checkpoints.map((checkpoint, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start gap-4">
                      <div className="flex-1">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Criteria
                        </label>
                        <textarea
                          value={checkpoint.criteria}
                          onChange={(e) => updateCheckpoint(index, 'criteria', e.target.value)}
                          placeholder="Describe what should be evaluated..."
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                          rows={3}
                        />
                      </div>
                      <div className="w-24">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Points
                        </label>
                        <input
                          type="number"
                          value={checkpoint.points}
                          onChange={(e) => updateCheckpoint(index, 'points', parseInt(e.target.value) || 0)}
                          min="0"
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        />
                      </div>
                      <button
                        onClick={() => removeCheckpoint(index)}
                        className="mt-6 text-red-600 hover:text-red-800"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
                {formData.checkpoints.length === 0 && (
                  <div className="text-center py-8 text-gray-500 border-2 border-dashed border-gray-300 rounded-lg">
                    <p>No checkpoints defined</p>
                    <p className="text-sm">Add checkpoints to evaluate intermediate steps</p>
                  </div>
                )}
              </div>
            </div>

            {/* Ground Truth */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">Ground Truth Answers</h3>
                <button
                  onClick={addGroundTruth}
                  className="px-3 py-1 bg-purple-600 text-white rounded hover:bg-purple-700 flex items-center gap-1"
                >
                  <Plus className="w-4 h-4" />
                  Add Ground Truth
                </button>
              </div>
              <div className="space-y-4">
                {formData.ground_truth.map((truth, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Name
                        </label>
                        <input
                          type="text"
                          value={truth.name}
                          onChange={(e) => updateGroundTruth(index, 'name', e.target.value)}
                          placeholder="e.g., accuracy, result"
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Expected Value
                        </label>
                        <input
                          type="text"
                          value={truth.value}
                          onChange={(e) => updateGroundTruth(index, 'value', e.target.value)}
                          placeholder="Expected answer or value"
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        />
                      </div>
                      <div className="flex items-end gap-2">
                        <div className="flex-1">
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Points
                          </label>
                          <input
                            type="number"
                            value={truth.points || 1}
                            onChange={(e) => updateGroundTruth(index, 'points', parseInt(e.target.value) || 1)}
                            min="0"
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                          />
                        </div>
                        <button
                          onClick={() => removeGroundTruth(index)}
                          className="text-red-600 hover:text-red-800 p-2"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
                {formData.ground_truth.length === 0 && (
                  <div className="text-center py-8 text-gray-500 border-2 border-dashed border-gray-300 rounded-lg">
                    <p>No ground truth answers defined</p>
                    <p className="text-sm">Add expected answers for direct comparison</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isSaving}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 min-w-[140px] justify-center"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Save Evaluation
              </>
            )}
          </button>
        </div>
      </div>

      {/* AI Assistant */}
      <EvaluationAssistant
        evaluationCase={formData}
        onSuggestionApply={handleAssistantSuggestion}
        isOpen={isAssistantOpen}
        onToggle={() => setIsAssistantOpen(!isAssistantOpen)}
      />
    </div>
  )
} 