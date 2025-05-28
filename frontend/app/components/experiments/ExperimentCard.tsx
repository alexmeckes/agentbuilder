'use client'

import { 
  Play, 
  Eye, 
  Trash2, 
  Clock, 
  CheckCircle, 
  AlertTriangle,
  DollarSign,
  Users
} from 'lucide-react'
import { ExperimentConfiguration, calculateExperimentCost, getExperimentDuration } from '../../types/experiment'

interface ExperimentCardProps {
  experiment: ExperimentConfiguration
  onRun: () => void
  onView: () => void
  onDelete: () => void
}

export function ExperimentCard({ experiment, onRun, onView, onDelete }: ExperimentCardProps) {
  const getStatusColor = (status: ExperimentConfiguration['status']) => {
    switch (status) {
      case 'draft': return 'text-gray-500 bg-gray-100'
      case 'running': return 'text-blue-600 bg-blue-100'
      case 'completed': return 'text-green-600 bg-green-100'
      case 'paused': return 'text-yellow-600 bg-yellow-100'
      case 'failed': return 'text-red-600 bg-red-100'
      default: return 'text-gray-500 bg-gray-100'
    }
  }

  const getStatusIcon = (status: ExperimentConfiguration['status']) => {
    switch (status) {
      case 'running': return <Clock className="w-4 h-4" />
      case 'completed': return <CheckCircle className="w-4 h-4" />
      case 'paused': return <AlertTriangle className="w-4 h-4" />
      case 'failed': return null
      default: return null
    }
  }

  const estimatedCost = calculateExperimentCost(experiment)
  const estimatedDuration = getExperimentDuration(experiment)

  function getElapsedTime(createdAt: string): string {
    const now = new Date()
    const created = new Date(createdAt)
    const diffMs = now.getTime() - created.getTime()
    const diffMinutes = Math.floor(diffMs / (1000 * 60))
    
    if (diffMinutes < 1) {
      return 'Just started'
    } else if (diffMinutes < 60) {
      return `${diffMinutes}m`
    } else {
      const diffHours = Math.floor(diffMinutes / 60)
      return `${diffHours}h ${diffMinutes % 60}m`
    }
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 hover:border-gray-300 transition-colors">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 mb-1">{experiment.name}</h3>
          <p className="text-sm text-gray-600">{experiment.description}</p>
        </div>
        <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(experiment.status)}`}>
          {getStatusIcon(experiment.status)}
          <span className="capitalize">{experiment.status}</span>
        </div>
      </div>

      {/* Variants Preview */}
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-2">
          <Users className="w-4 h-4 text-gray-500" />
          <span className="text-sm font-medium text-gray-700">
            {experiment.variants.length} Variants
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          {experiment.variants.slice(0, 3).map((variant) => (
            <div
              key={variant.id}
              className="flex items-center gap-2 px-3 py-1 bg-gray-50 rounded-lg text-xs"
            >
              <div 
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: variant.color }}
              />
              <span className="font-medium">{variant.name}</span>
            </div>
          ))}
          {experiment.variants.length > 3 && (
            <div className="px-3 py-1 bg-gray-50 rounded-lg text-xs text-gray-500">
              +{experiment.variants.length - 3} more
            </div>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-4 text-sm">
        <div>
          <p className="text-gray-500">Test Inputs</p>
          <p className="font-semibold text-gray-900">{experiment.testInputs.length}</p>
        </div>
        <div>
          <p className="text-gray-500">Est. Duration</p>
          <p className="font-semibold text-gray-900">{estimatedDuration}m</p>
        </div>
        <div>
          <p className="text-gray-500">Est. Cost</p>
          <p className="font-semibold text-gray-900">${estimatedCost.toFixed(3)}</p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 pt-4 border-t border-gray-100">
        {experiment.status === 'draft' && (
          <button
            onClick={onRun}
            className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
          >
            <Play className="w-4 h-4" />
            Run Experiment
          </button>
        )}
        
        {experiment.status === 'completed' && (
          <button
            onClick={onView}
            className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
          >
            <Eye className="w-4 h-4" />
            View Results
          </button>
        )}

        {/* Status Badge */}
        <div className="flex items-center gap-2">
          <div className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(experiment.status)}`}>
            {experiment.status === 'running' && (
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-current rounded-full animate-pulse"></div>
                Running
              </div>
            )}
            {experiment.status === 'completed' && 'Completed'}
            {experiment.status === 'draft' && 'Draft'}
            {experiment.status === 'paused' && 'Paused'}
            {experiment.status === 'failed' && 'Failed'}
          </div>
          
          {experiment.status === 'running' && (
            <div className="text-xs text-gray-500">
              {/* Show elapsed time for running experiments */}
              {getElapsedTime(experiment.created_at)}
            </div>
          )}
        </div>

        <div className="flex-1" />
        
        <button
          onClick={onDelete}
          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          title="Delete experiment"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
} 