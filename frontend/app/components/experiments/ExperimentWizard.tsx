'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { 
  X, 
  ArrowLeft, 
  ArrowRight, 
  Check, 
  Plus, 
  Trash2,
  Settings,
  Play,
  Beaker,
  Target,
  FileText,
  Zap
} from 'lucide-react'
import { 
  ExperimentConfiguration, 
  ExperimentVariant, 
  TestInput, 
  ExperimentSettings,
  EXPERIMENT_TEMPLATES,
  getVariantColor,
  calculateExperimentCost,
  getExperimentDuration
} from '../../types/experiment'
import { AgentFramework, POPULAR_MODELS } from '../../types/workflow'

interface ExperimentWizardProps {
  isOpen: boolean
  templateId?: string | null
  onClose: () => void
  onExperimentCreated: (experiment: ExperimentConfiguration) => void
}

export function ExperimentWizard({ isOpen, templateId, onClose, onExperimentCreated }: ExperimentWizardProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [isClient, setIsClient] = useState(false)
  const [formData, setFormData] = useState<Partial<ExperimentConfiguration>>({
    name: '',
    description: '',
    variants: [],
    testInputs: [],
    settings: {
      iterations_per_variant: 3,
      parallel_execution: true,
      timeout_seconds: 60,
      success_criteria: []
    }
  })

  const steps = [
    { id: 'setup', title: 'Setup', icon: FileText },
    { id: 'variants', title: 'Variants', icon: Beaker },
    { id: 'inputs', title: 'Test Inputs', icon: Target },
    { id: 'settings', title: 'Settings', icon: Settings },
    { id: 'review', title: 'Review', icon: Check }
  ]

  // Ensure we're on the client side
  useEffect(() => {
    setIsClient(true)
  }, [])

  // Load template data if provided
  useEffect(() => {
    if (templateId && isOpen) {
      const template = EXPERIMENT_TEMPLATES.find(t => t.id === templateId)
      if (template) {
        setFormData({
          name: template.name,
          description: template.description,
          variants: template.variants.map((v, index) => ({
            id: `variant-${index}`,
            name: v.name || `Variant ${index + 1}`,
            description: v.description || '',
            framework: v.framework || AgentFramework.OPENAI,
            model_id: v.model_id || 'gpt-4o-mini',
            model_parameters: {
              temperature: 0.7,
              max_tokens: 1000
            },
            color: v.color || getVariantColor(index)
          })) as ExperimentVariant[],
          testInputs: template.test_inputs.map((t, index) => ({
            id: `input-${index}`,
            name: t.name || `Test Input ${index + 1}`,
            input_data: t.input_data || '',
            weight: t.weight || 1.0
          })) as TestInput[],
          settings: {
            iterations_per_variant: template.settings.iterations_per_variant || 3,
            parallel_execution: template.settings.parallel_execution ?? true,
            timeout_seconds: template.settings.timeout_seconds || 60,
            cost_limit_usd: template.settings.cost_limit_usd,
            success_criteria: template.settings.success_criteria || []
          }
        })
      }
    }
  }, [templateId, isOpen])

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleCreateExperiment = () => {
    const experiment: ExperimentConfiguration = {
      id: `exp-${Date.now()}`,
      name: formData.name || 'Untitled Experiment',
      description: formData.description || '',
      workflow: {} as any, // TODO: Connect to actual workflow
      variants: formData.variants || [],
      testInputs: formData.testInputs || [],
      settings: formData.settings!,
      created_at: new Date().toISOString(),
      status: 'draft'
    }
    
    onExperimentCreated(experiment)
  }

  const addVariant = () => {
    const newVariant: ExperimentVariant = {
      id: `variant-${Date.now()}`,
      name: `Variant ${(formData.variants?.length || 0) + 1}`,
      description: '',
      framework: AgentFramework.OPENAI,
      model_id: 'gpt-4o-mini',
      model_parameters: {
        temperature: 0.7,
        max_tokens: 1000
      },
      color: getVariantColor(formData.variants?.length || 0)
    }
    
    setFormData(prev => ({
      ...prev,
      variants: [...(prev.variants || []), newVariant]
    }))
  }

  const removeVariant = (id: string) => {
    setFormData(prev => ({
      ...prev,
      variants: prev.variants?.filter(v => v.id !== id) || []
    }))
  }

  const updateVariant = (id: string, updates: Partial<ExperimentVariant>) => {
    setFormData(prev => ({
      ...prev,
      variants: prev.variants?.map(v => v.id === id ? { ...v, ...updates } : v) || []
    }))
  }

  const addTestInput = () => {
    const newInput: TestInput = {
      id: `input-${Date.now()}`,
      name: `Test Input ${(formData.testInputs?.length || 0) + 1}`,
      input_data: '',
      weight: 1.0
    }
    
    setFormData(prev => ({
      ...prev,
      testInputs: [...(prev.testInputs || []), newInput]
    }))
  }

  const removeTestInput = (id: string) => {
    setFormData(prev => ({
      ...prev,
      testInputs: prev.testInputs?.filter(t => t.id !== id) || []
    }))
  }

  const updateTestInput = (id: string, updates: Partial<TestInput>) => {
    setFormData(prev => ({
      ...prev,
      testInputs: prev.testInputs?.map(t => t.id === id ? { ...t, ...updates } : t) || []
    }))
  }

  if (!isOpen || !isClient) return null

  const modalContent = (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose()
        }
      }}
    >
      <div 
        className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-blue-600 rounded-lg flex items-center justify-center">
              <Beaker className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Create A/B Test Experiment</h2>
              <p className="text-sm text-gray-600">Step {currentStep + 1} of {steps.length}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Progress Steps */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => {
              const Icon = step.icon
              const isActive = index === currentStep
              const isCompleted = index < currentStep
              
              return (
                <div key={step.id} className="flex items-center">
                  <div className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                    isActive ? 'bg-blue-100 text-blue-700' :
                    isCompleted ? 'bg-green-100 text-green-700' :
                    'text-gray-500'
                  }`}>
                    <Icon className="w-4 h-4" />
                    <span className="text-sm font-medium">{step.title}</span>
                  </div>
                  {index < steps.length - 1 && (
                    <div className={`w-8 h-0.5 mx-2 ${
                      isCompleted ? 'bg-green-300' : 'bg-gray-200'
                    }`} />
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Content */}
        <div className="p-6 max-h-[60vh] overflow-y-auto">
          {/* Step 1: Setup */}
          {currentStep === 0 && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Experiment Name
                </label>
                <input
                  type="text"
                  value={formData.name || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g., Speed Comparison Test"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={formData.description || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Describe what you want to test and compare..."
                />
              </div>
            </div>
          )}

          {/* Step 2: Variants */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900">Test Variants</h3>
                <button
                  onClick={addVariant}
                  className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                >
                  <Plus className="w-4 h-4" />
                  Add Variant
                </button>
              </div>
              
              <div className="space-y-4">
                {formData.variants?.map((variant, index) => (
                  <div key={variant.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: variant.color }}
                        />
                        <input
                          type="text"
                          value={variant.name}
                          onChange={(e) => updateVariant(variant.id, { name: e.target.value })}
                          className="font-medium text-gray-900 bg-transparent border-none focus:outline-none"
                          placeholder="Variant name"
                        />
                      </div>
                      {formData.variants!.length > 1 && (
                        <button
                          onClick={() => removeVariant(variant.id)}
                          className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Framework
                        </label>
                        <select
                          value={variant.framework}
                          onChange={(e) => updateVariant(variant.id, { framework: e.target.value as AgentFramework })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                        >
                          {Object.values(AgentFramework).map(framework => (
                            <option key={framework} value={framework}>
                              {framework.charAt(0).toUpperCase() + framework.slice(1)}
                            </option>
                          ))}
                        </select>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Model
                        </label>
                        <select
                          value={variant.model_id}
                          onChange={(e) => updateVariant(variant.id, { model_id: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                        >
                          {POPULAR_MODELS.map(model => (
                            <option key={model.id} value={model.id}>
                              {model.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                )) || []}
              </div>
              
              {(!formData.variants || formData.variants.length === 0) && (
                <div className="text-center py-8 text-gray-500">
                  <Beaker className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p>No variants yet. Add your first variant to get started.</p>
                </div>
              )}
            </div>
          )}

          {/* Step 3: Test Inputs */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900">Test Inputs</h3>
                <button
                  onClick={addTestInput}
                  className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                >
                  <Plus className="w-4 h-4" />
                  Add Test Input
                </button>
              </div>
              
              <div className="space-y-4">
                {formData.testInputs?.map((input) => (
                  <div key={input.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-3">
                      <input
                        type="text"
                        value={input.name}
                        onChange={(e) => updateTestInput(input.id, { name: e.target.value })}
                        className="font-medium text-gray-900 bg-transparent border-none focus:outline-none"
                        placeholder="Test input name"
                      />
                      <button
                        onClick={() => removeTestInput(input.id)}
                        className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    
                    <textarea
                      value={input.input_data}
                      onChange={(e) => updateTestInput(input.id, { input_data: e.target.value })}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                      placeholder="Enter the test input data..."
                    />
                    
                    <div className="mt-3 flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <label className="text-sm text-gray-600">Weight:</label>
                        <input
                          type="number"
                          value={input.weight}
                          onChange={(e) => updateTestInput(input.id, { weight: parseFloat(e.target.value) || 1.0 })}
                          min="0.1"
                          max="10"
                          step="0.1"
                          className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
                        />
                      </div>
                    </div>
                  </div>
                )) || []}
              </div>
              
              {(!formData.testInputs || formData.testInputs.length === 0) && (
                <div className="text-center py-8 text-gray-500">
                  <Target className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p>No test inputs yet. Add inputs to test your variants against.</p>
                </div>
              )}
            </div>
          )}

          {/* Step 4: Settings */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-gray-900">Experiment Settings</h3>
              
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Iterations per Variant
                  </label>
                  <input
                    type="number"
                    value={formData.settings?.iterations_per_variant || 3}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      settings: {
                        ...prev.settings!,
                        iterations_per_variant: parseInt(e.target.value) || 3
                      }
                    }))}
                    min="1"
                    max="50"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">How many times to run each variant</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Timeout (seconds)
                  </label>
                  <input
                    type="number"
                    value={formData.settings?.timeout_seconds || 60}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      settings: {
                        ...prev.settings!,
                        timeout_seconds: parseInt(e.target.value) || 60
                      }
                    }))}
                    min="10"
                    max="300"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">Maximum time per execution</p>
                </div>
              </div>
              
              <div>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.settings?.parallel_execution ?? true}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      settings: {
                        ...prev.settings!,
                        parallel_execution: e.target.checked
                      }
                    }))}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-gray-700">Run variants in parallel</span>
                </label>
                <p className="text-xs text-gray-500 mt-1 ml-6">Faster execution but may use more resources</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Cost Limit (USD) - Optional
                </label>
                <input
                  type="number"
                  value={formData.settings?.cost_limit_usd || ''}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    settings: {
                      ...prev.settings!,
                      cost_limit_usd: e.target.value ? parseFloat(e.target.value) : undefined
                    }
                  }))}
                  min="0.01"
                  step="0.01"
                  placeholder="e.g., 1.00"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">Stop experiment if cost exceeds this limit</p>
              </div>
            </div>
          )}

          {/* Step 5: Review */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-gray-900">Review & Create</h3>
              
              <div className="bg-gray-50 rounded-lg p-4 space-y-4">
                <div>
                  <h4 className="font-medium text-gray-900">{formData.name}</h4>
                  <p className="text-sm text-gray-600">{formData.description}</p>
                </div>
                
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Variants:</span>
                    <span className="ml-2 font-medium">{formData.variants?.length || 0}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Test Inputs:</span>
                    <span className="ml-2 font-medium">{formData.testInputs?.length || 0}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Iterations:</span>
                    <span className="ml-2 font-medium">{formData.settings?.iterations_per_variant || 0}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Est. Duration:</span>
                    <span className="ml-2 font-medium">
                      {formData as ExperimentConfiguration ? getExperimentDuration(formData as ExperimentConfiguration) : 0}m
                    </span>
                  </div>
                </div>
                
                <div className="pt-2 border-t border-gray-200">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">Estimated Cost:</span>
                    <span className="font-medium text-lg">
                      ${formData as ExperimentConfiguration ? calculateExperimentCost(formData as ExperimentConfiguration).toFixed(3) : '0.000'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
          <button
            onClick={handlePrevious}
            disabled={currentStep === 0}
            className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Previous
          </button>
          
          <div className="flex items-center gap-3">
            {currentStep < steps.length - 1 ? (
              <button
                onClick={handleNext}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Next
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={handleCreateExperiment}
                className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <Play className="w-4 h-4" />
                Create Experiment
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )

  return createPortal(modalContent, document.body)
} 