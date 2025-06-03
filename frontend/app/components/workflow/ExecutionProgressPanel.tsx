'use client'

import { useState } from 'react'
import { Play, Square, Loader2, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react'
import { WorkflowExecutionState, NodeExecutionStatus } from '../../types/workflow'

interface ExecutionProgressPanelProps {
  executionState: WorkflowExecutionState | null
  isExecuting: boolean
  onStart: () => void
  onStop: () => void
  onReset: () => void
}

const getStatusIcon = (status: NodeExecutionStatus) => {
  switch (status) {
    case 'running': return <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
    case 'completed': return <CheckCircle className="w-4 h-4 text-green-600" />
    case 'failed': return <XCircle className="w-4 h-4 text-red-600" />
    case 'waiting': return <Clock className="w-4 h-4 text-yellow-600" />
    case 'pending': return <Clock className="w-4 h-4 text-gray-400" />
    case 'idle': return <AlertCircle className="w-4 h-4 text-gray-300" />
    default: return null
  }
}

const getStatusColor = (status: NodeExecutionStatus) => {
  switch (status) {
    case 'running': return 'bg-blue-100 text-blue-800'
    case 'completed': return 'bg-green-100 text-green-800'
    case 'failed': return 'bg-red-100 text-red-800'
    case 'waiting': return 'bg-yellow-100 text-yellow-800'
    case 'pending': return 'bg-gray-100 text-gray-800'
    case 'idle': return 'bg-gray-50 text-gray-500'
    default: return 'bg-gray-50 text-gray-500'
  }
}

export default function ExecutionProgressPanel({
  executionState,
  isExecuting,
  onStart,
  onStop,
  onReset
}: ExecutionProgressPanelProps) {
  const [expanded, setExpanded] = useState(false)

  const nodeStates = executionState ? Array.from(executionState.nodes.entries()) : []
  const totalNodes = nodeStates.length
  const completedNodes = nodeStates.filter(([_, state]) => 
    state.status === 'completed' || state.status === 'failed'
  ).length
  const runningNodes = nodeStates.filter(([_, state]) => state.status === 'running').length
  const failedNodes = nodeStates.filter(([_, state]) => state.status === 'failed').length

  return (
    <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-4 w-80">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
            <Play className="w-4 h-4 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Execution Progress</h3>
            <p className="text-xs text-gray-500">Real-time workflow status</p>
          </div>
        </div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-gray-400 hover:text-gray-600 text-sm"
        >
          {expanded ? 'Collapse' : 'Expand'}
        </button>
      </div>

      {/* Overall Progress */}
      {executionState && (
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Overall Progress</span>
            <span className="text-sm text-gray-600">{Math.round(executionState.progress)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${executionState.progress}%` }}
            />
          </div>
          <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
            <span>{completedNodes}/{totalNodes} nodes completed</span>
            <span>${executionState.totalCost.toFixed(4)} total cost</span>
          </div>
        </div>
      )}

      {/* Status Summary */}
      {executionState && (
        <div className="mb-4">
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex items-center gap-1">
              <Loader2 className="w-3 h-3 text-blue-600" />
              <span>{runningNodes} running</span>
            </div>
            <div className="flex items-center gap-1">
              <CheckCircle className="w-3 h-3 text-green-600" />
              <span>{completedNodes - failedNodes} completed</span>
            </div>
            <div className="flex items-center gap-1">
              <XCircle className="w-3 h-3 text-red-600" />
              <span>{failedNodes} failed</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3 text-gray-400" />
              <span>{totalNodes - completedNodes - runningNodes} pending</span>
            </div>
          </div>
        </div>
      )}

      {/* Node Details (Expanded) */}
      {expanded && executionState && nodeStates.length > 0 && (
        <div className="mb-4 max-h-40 overflow-y-auto">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Node Status</h4>
          <div className="space-y-1">
            {nodeStates.map(([nodeId, state]) => (
              <div key={nodeId} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  {getStatusIcon(state.status)}
                  <span className="text-sm text-gray-700 truncate">{nodeId}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(state.status)}`}>
                    {state.status}
                  </span>
                  {state.cost && (
                    <span className="text-xs text-gray-500">${state.cost.toFixed(4)}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Control Buttons */}
      <div className="flex gap-2">
        {!isExecuting ? (
          <button
            onClick={onStart}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
          >
            <Play className="w-4 h-4" />
            Start
          </button>
        ) : (
          <button
            onClick={onStop}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors"
          >
            <Square className="w-4 h-4" />
            Stop
          </button>
        )}
        
        <button
          onClick={onReset}
          className="px-3 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-300 transition-colors"
        >
          Reset
        </button>
      </div>

      {/* Execution Time */}
      {executionState && (
        <div className="mt-3 pt-3 border-t border-gray-200 text-xs text-gray-500 text-center">
          Started: {new Date(executionState.startTime).toLocaleTimeString()}
          {executionState.status === 'completed' && (
            <span className="ml-2">
              • Duration: {Math.round((Date.now() - executionState.startTime) / 1000)}s
            </span>
          )}
        </div>
      )}
    </div>
  )
} 