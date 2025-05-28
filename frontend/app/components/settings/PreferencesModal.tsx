'use client'

import React, { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X, Settings, Zap, DollarSign, Brain, Sparkles } from 'lucide-react'
import { POPULAR_MODELS, ModelInfo, AgentFramework } from '../../types/workflow'

interface PreferencesModalProps {
  isOpen: boolean
  onClose: () => void
}

interface UserPreferences {
  defaultModels: {
    chatAssistant: string
    workflowNaming: string
    contentExtraction: string
    experimentAnalysis: string
  }
  defaultFramework: AgentFramework
  performance: {
    preferSpeed: boolean
    preferCost: boolean
  }
}

const DEFAULT_PREFERENCES: UserPreferences = {
  defaultModels: {
    chatAssistant: 'gpt-4o-mini',
    workflowNaming: 'gpt-4o-mini',
    contentExtraction: 'gpt-4o-mini',
    experimentAnalysis: 'gpt-4.1'
  },
  defaultFramework: AgentFramework.OPENAI,
  performance: {
    preferSpeed: false,
    preferCost: true
  }
}

export default function PreferencesModal({ isOpen, onClose }: PreferencesModalProps) {
  const [preferences, setPreferences] = useState<UserPreferences>(DEFAULT_PREFERENCES)
  const [activeTab, setActiveTab] = useState<'models' | 'performance' | 'cost'>('models')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    
    // Load preferences from localStorage
    try {
      const stored = localStorage.getItem('workflow-composer-preferences')
      if (stored) {
        const parsed = JSON.parse(stored)
        setPreferences({
          ...DEFAULT_PREFERENCES,
          ...parsed,
          defaultModels: {
            ...DEFAULT_PREFERENCES.defaultModels,
            ...(parsed.defaultModels || {})
          }
        })
      }
    } catch (error) {
      console.warn('Failed to load preferences:', error)
    }
  }, [])

  const savePreferences = () => {
    try {
      localStorage.setItem('workflow-composer-preferences', JSON.stringify(preferences))
      onClose()
    } catch (error) {
      console.warn('Failed to save preferences:', error)
    }
  }

  const getModelInfo = (modelId: string): ModelInfo | null => {
    return POPULAR_MODELS.find(model => model.id === modelId) || null
  }

  const updateModelPreference = (service: keyof UserPreferences['defaultModels'], modelId: string) => {
    setPreferences(prev => ({
      ...prev,
      defaultModels: {
        ...prev.defaultModels,
        [service]: modelId
      }
    }))
  }

  const ModelSelector = ({ 
    service, 
    title, 
    description, 
    icon: Icon 
  }: { 
    service: keyof UserPreferences['defaultModels']
    title: string
    description: string
    icon: React.ComponentType<any>
  }) => {
    const currentModel = getModelInfo(preferences.defaultModels[service])
    
    return (
      <div className="bg-gray-50 rounded-lg p-4">
        <div className="flex items-center gap-3 mb-3">
          <Icon className="w-5 h-5 text-blue-600" />
          <div>
            <h4 className="font-medium text-gray-900">{title}</h4>
            <p className="text-sm text-gray-600">{description}</p>
          </div>
        </div>
        
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            Current Model: {currentModel?.name || 'Unknown'}
          </label>
          <select
            value={preferences.defaultModels[service]}
            onChange={(e) => updateModelPreference(service, e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {POPULAR_MODELS.map(model => (
              <option key={model.id} value={model.id}>
                {model.name} - ${(model.cost_per_1k_tokens * 1000).toFixed(3)}/1K tokens
              </option>
            ))}
          </select>
          
          {currentModel && (
            <div className="flex items-center gap-4 text-xs text-gray-500">
              <span>💰 ${(currentModel.cost_per_1k_tokens * 1000).toFixed(3)}/1K tokens</span>
              <span>🔧 {currentModel.supports_tools ? 'Tools ✓' : 'No Tools'}</span>
              <span>👁️ {currentModel.supports_vision ? 'Vision ✓' : 'No Vision'}</span>
            </div>
          )}
        </div>
      </div>
    )
  }

  if (!mounted || !isOpen) return null

  return createPortal(
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[10000]">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <Settings className="w-6 h-6 text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-900">Model Preferences</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('models')}
            className={`px-6 py-3 font-medium text-sm transition-colors ${
              activeTab === 'models'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Default Models
          </button>
          <button
            onClick={() => setActiveTab('performance')}
            className={`px-6 py-3 font-medium text-sm transition-colors ${
              activeTab === 'performance'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Performance
          </button>
          <button
            onClick={() => setActiveTab('cost')}
            className={`px-6 py-3 font-medium text-sm transition-colors ${
              activeTab === 'cost'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Cost Management
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {activeTab === 'models' && (
            <div className="space-y-6">
              <div className="mb-6">
                <h3 className="text-lg font-medium text-gray-900 mb-2">System Service Models</h3>
                <p className="text-gray-600">Configure which AI models to use for different system services. These settings affect cost, speed, and quality.</p>
              </div>

              <div className="grid gap-6">
                <ModelSelector
                  service="chatAssistant"
                  title="Chat Assistant"
                  description="Main AI assistant for workflow building and general questions"
                  icon={Sparkles}
                />
                
                <ModelSelector
                  service="workflowNaming"
                  title="Workflow Naming"
                  description="AI service for generating smart workflow names and descriptions"
                  icon={Brain}
                />
                
                <ModelSelector
                  service="contentExtraction"
                  title="Content Extraction"
                  description="AI service for extracting structured information from content"
                  icon={Zap}
                />
                
                <ModelSelector
                  service="experimentAnalysis"
                  title="Experiment Analysis"
                  description="Complex analysis tasks like A/B test evaluation and insights"
                  icon={DollarSign}
                />
              </div>
            </div>
          )}

          {activeTab === 'performance' && (
            <div className="space-y-6">
              <div className="mb-6">
                <h3 className="text-lg font-medium text-gray-900 mb-2">Performance Preferences</h3>
                <p className="text-gray-600">Set your priorities for model selection. These preferences influence automatic recommendations.</p>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Zap className="w-5 h-5 text-yellow-600" />
                    <div>
                      <h4 className="font-medium text-gray-900">Prefer Speed</h4>
                      <p className="text-sm text-gray-600">Prioritize faster response times over quality</p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={preferences.performance.preferSpeed}
                      onChange={(e) => setPreferences(prev => ({
                        ...prev,
                        performance: {
                          ...prev.performance,
                          preferSpeed: e.target.checked
                        }
                      }))}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <DollarSign className="w-5 h-5 text-green-600" />
                    <div>
                      <h4 className="font-medium text-gray-900">Prefer Cost Efficiency</h4>
                      <p className="text-sm text-gray-600">Prioritize lower costs over maximum quality</p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={preferences.performance.preferCost}
                      onChange={(e) => setPreferences(prev => ({
                        ...prev,
                        performance: {
                          ...prev.performance,
                          preferCost: e.target.checked
                        }
                      }))}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'cost' && (
            <div className="space-y-6">
              <div className="mb-6">
                <h3 className="text-lg font-medium text-gray-900 mb-2">Cost Overview</h3>
                <p className="text-gray-600">Monitor and manage your AI model usage costs.</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {Object.entries(preferences.defaultModels).map(([service, modelId]) => {
                  const model = getModelInfo(modelId)
                  const serviceNames = {
                    chatAssistant: 'Chat Assistant',
                    workflowNaming: 'Workflow Naming',
                    contentExtraction: 'Content Extraction',
                    experimentAnalysis: 'Experiment Analysis'
                  }
                  
                  return (
                    <div key={service} className="bg-gray-50 rounded-lg p-4">
                      <h4 className="font-medium text-gray-900 mb-2">
                        {serviceNames[service as keyof typeof serviceNames]}
                      </h4>
                      <div className="text-sm text-gray-600">
                        <div>Model: {model?.name || 'Unknown'}</div>
                        <div className="font-medium text-green-600">
                          ${(model?.cost_per_1k_tokens || 0) * 1000}/1K tokens
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-medium text-blue-900 mb-2">💡 Cost Optimization Tips</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• Use GPT-3.5 Turbo for simple tasks to save 70% on costs</li>
                  <li>• GPT-4o Mini offers the best balance of quality and cost</li>
                  <li>• Reserve GPT-4.1 and o-series models for complex reasoning tasks</li>
                  <li>• Enable "Prefer Cost Efficiency" for automatic cost optimization</li>
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={() => {
              setPreferences(DEFAULT_PREFERENCES)
              localStorage.removeItem('workflow-composer-preferences')
            }}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
          >
            Reset to Defaults
          </button>
          
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={savePreferences}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Save Preferences
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
} 