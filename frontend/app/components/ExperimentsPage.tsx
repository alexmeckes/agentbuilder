'use client'

import { useState, useEffect } from 'react'
import { 
  Plus, 
  Beaker, 
  TrendingUp, 
  Clock, 
  DollarSign,
  AlertCircle,
  Zap,
  Target,
  BarChart3
} from 'lucide-react'
import { ExperimentWizard } from './experiments/ExperimentWizard'
import { ExperimentCard } from './experiments/ExperimentCard'
import { ExperimentResultsModal } from './experiments/ExperimentResultsModal'
import { ExperimentConfiguration, EXPERIMENT_TEMPLATES } from '../types/experiment'
import { ExperimentService } from '../services/experimentService'

export default function ExperimentsPage() {
  const [experiments, setExperiments] = useState<ExperimentConfiguration[]>([])
  const [isWizardOpen, setIsWizardOpen] = useState(false)
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedExperimentId, setSelectedExperimentId] = useState<string | null>(null)
  const [isResultsModalOpen, setIsResultsModalOpen] = useState(false)

  // Load experiments on component mount
  useEffect(() => {
    loadExperiments()
  }, [])

  // Poll for running experiments
  useEffect(() => {
    const runningExperiments = experiments.filter(e => e.status === 'running')
    
    if (runningExperiments.length > 0) {
      const pollInterval = setInterval(() => {
        console.log('🔄 Polling for running experiments...')
        loadExperiments()
      }, 3000) // Poll every 3 seconds
      
      return () => clearInterval(pollInterval)
    }
  }, [experiments])

  const loadExperiments = async () => {
    try {
      setIsLoading(true)
      setError(null)
      const response = await ExperimentService.listExperiments()
      if (response.success) {
        setExperiments(response.experiments)
      } else {
        setError('Failed to load experiments')
      }
    } catch (err) {
      console.error('Error loading experiments:', err)
      setError(err instanceof Error ? err.message : 'Failed to load experiments')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateExperiment = async (experiment: ExperimentConfiguration) => {
    try {
      const response = await ExperimentService.createExperiment(experiment)
      if (response.success) {
        // Add the new experiment to the list
        setExperiments(prev => [response.experiment, ...prev])
        setIsWizardOpen(false)
        setSelectedTemplateId(null)
      } else {
        setError('Failed to create experiment')
      }
    } catch (err) {
      console.error('Error creating experiment:', err)
      setError(err instanceof Error ? err.message : 'Failed to create experiment')
    }
  }

  const handleRunExperiment = async (experimentId: string) => {
    try {
      setError(null)
      await ExperimentService.runExperiment(experimentId)
      await loadExperiments() // Refresh the list
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to run experiment')
    }
  }

  const handleDeleteExperiment = async (experimentId: string) => {
    if (!confirm('Are you sure you want to delete this experiment? This action cannot be undone.')) {
      return
    }
    
    try {
      setError(null)
      await ExperimentService.deleteExperiment(experimentId)
      await loadExperiments() // Refresh the list
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete experiment')
    }
  }

  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplateId(templateId)
    setIsWizardOpen(true)
  }

  // Calculate quick stats
  const stats = {
    total: experiments.length,
    running: experiments.filter(e => e.status === 'running').length,
    completed: experiments.filter(e => e.status === 'completed').length,
    draft: experiments.filter(e => e.status === 'draft').length
  }

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading experiments...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full bg-gray-50 overflow-auto">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-600 rounded-xl flex items-center justify-center">
                <Beaker className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">A/B Testing Lab</h1>
                <p className="text-gray-600">Compare models and frameworks systematically</p>
              </div>
            </div>
            
            <button
              onClick={() => setIsWizardOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-5 h-5" />
              New Experiment
            </button>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                  <BarChart3 className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total</p>
                  <p className="text-xl font-semibold text-gray-900">{stats.total}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center">
                  <Clock className="w-5 h-5 text-yellow-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Running</p>
                  <p className="text-xl font-semibold text-gray-900">{stats.running}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Completed</p>
                  <p className="text-xl font-semibold text-gray-900">{stats.completed}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                  <Target className="w-5 h-5 text-gray-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Draft</p>
                  <p className="text-xl font-semibold text-gray-900">{stats.draft}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-600" />
              <p className="text-red-800">{error}</p>
              <button
                onClick={() => setError(null)}
                className="ml-auto text-red-600 hover:text-red-800"
              >
                ×
              </button>
            </div>
          </div>
        )}

        {/* Main Content */}
        {experiments.length === 0 && !error ? (
          <div className="text-center py-12">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Beaker className="w-10 h-10 text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No experiments yet</h3>
            <p className="text-gray-600 mb-8 max-w-md mx-auto">
              Start by creating your first A/B test experiment to compare different models and frameworks.
            </p>
            
            {/* Quick Start Templates */}
            <div className="max-w-4xl mx-auto">
              <h4 className="text-lg font-medium text-gray-900 mb-4">Quick Start Templates</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {EXPERIMENT_TEMPLATES.map((template) => {
                  const Icon = template.category === 'performance' ? Zap : 
                              template.category === 'cost' ? DollarSign : Target
                  
                  return (
                    <button
                      key={template.id}
                      onClick={() => handleTemplateSelect(template.id)}
                      className="p-6 bg-white border border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-md transition-all text-left"
                    >
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                          <Icon className="w-5 h-5 text-blue-600" />
                        </div>
                        <h5 className="font-medium text-gray-900">{template.name}</h5>
                      </div>
                      <p className="text-sm text-gray-600">{template.description}</p>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {experiments.map((experiment) => (
              <ExperimentCard
                key={experiment.id}
                experiment={experiment}
                onRun={() => handleRunExperiment(experiment.id)}
                onView={() => {
                  setSelectedExperimentId(experiment.id)
                  setIsResultsModalOpen(true)
                }}
                onDelete={() => {
                  handleDeleteExperiment(experiment.id)
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Experiment Wizard */}
      <ExperimentWizard
        isOpen={isWizardOpen}
        templateId={selectedTemplateId}
        onClose={() => {
          setIsWizardOpen(false)
          setSelectedTemplateId(null)
        }}
        onExperimentCreated={handleCreateExperiment}
      />

      {/* Experiment Results Modal */}
      <ExperimentResultsModal
        isOpen={isResultsModalOpen}
        experimentId={selectedExperimentId}
        onClose={() => {
          setIsResultsModalOpen(false)
          setSelectedExperimentId(null)
        }}
      />
    </div>
  )
} 