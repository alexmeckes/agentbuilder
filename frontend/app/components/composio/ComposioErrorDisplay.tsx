'use client'

import React from 'react'
import { ComposioError, ERROR_MESSAGES } from '../../lib/composio-error-handler'

interface ComposioErrorDisplayProps {
  error: ComposioError
  onRetry?: () => void
  onDismiss?: () => void
  className?: string
}

const getErrorIcon = (type: ComposioError['type']) => {
  switch (type) {
    case 'auth': return '🔑'
    case 'permission': return '🚫'
    case 'rate_limit': return '⏱️'
    case 'network': return '🌐'  
    case 'server_error': return '⚠️'
    case 'tool_not_found': return '🔍'
    case 'validation': return '📝'
    default: return '❌'
  }
}

const getErrorColor = (type: ComposioError['type']) => {
  switch (type) {
    case 'auth': return 'text-yellow-600 bg-yellow-50 border-yellow-200'
    case 'permission': return 'text-red-600 bg-red-50 border-red-200'
    case 'rate_limit': return 'text-orange-600 bg-orange-50 border-orange-200'
    case 'network': return 'text-blue-600 bg-blue-50 border-blue-200'
    case 'server_error': return 'text-purple-600 bg-purple-50 border-purple-200'
    case 'tool_not_found': return 'text-gray-600 bg-gray-50 border-gray-200'
    case 'validation': return 'text-indigo-600 bg-indigo-50 border-indigo-200'
    default: return 'text-gray-600 bg-gray-50 border-gray-200'
  }
}

export default function ComposioErrorDisplay({ 
  error, 
  onRetry, 
  onDismiss, 
  className = '' 
}: ComposioErrorDisplayProps) {
  const errorInfo = ERROR_MESSAGES[error.type]
  const colorClasses = getErrorColor(error.type)
  const icon = getErrorIcon(error.type)

  return (
    <div className={`rounded-md border p-4 ${colorClasses} ${className}`}>
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">{icon}</span>
          <div>
            <h3 className="font-semibold text-sm">
              {errorInfo.title}
            </h3>
            <p className="text-sm opacity-90 mt-1">
              {errorInfo.description}
            </p>
          </div>
        </div>
        
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Dismiss error"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Error Message */}
      <div className="mt-3">
        <p className="text-sm font-medium">
          {error.message}
        </p>
      </div>

      {/* Suggested Actions */}
      {errorInfo.actions && errorInfo.actions.length > 0 && (
        <div className="mt-4">
          <p className="text-sm font-medium mb-2">How to fix this:</p>
          <ul className="space-y-1">
            {errorInfo.actions.map((action: string, index: number) => (
              <li key={index} className="text-sm flex items-start gap-2">
                <span className="text-green-500 mt-0.5">•</span>
                <span>{action}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Action Buttons */}
      <div className="mt-4 flex gap-2">
        {error.retryable && onRetry && (
          <button
            onClick={onRetry}
            className="px-3 py-1.5 text-sm font-medium bg-white border border-current rounded-md hover:bg-opacity-90 transition-colors"
          >
            Try Again
          </button>
        )}
        
        {error.type === 'auth' && (
          <button
            onClick={() => window.open('https://app.composio.dev/settings', '_blank')}
            className="px-3 py-1.5 text-sm font-medium bg-white border border-current rounded-md hover:bg-opacity-90 transition-colors"
          >
            Open Composio Settings
          </button>
        )}
        
        {(error.type === 'permission' || error.type === 'tool_not_found') && (
          <button
            onClick={() => window.open('https://app.composio.dev', '_blank')}
            className="px-3 py-1.5 text-sm font-medium bg-white border border-current rounded-md hover:bg-opacity-90 transition-colors"
          >
            Open Composio Dashboard
          </button>
        )}
      </div>

      {/* Debug Information (collapsed by default) */}
      {error.details && (
        <details className="mt-4">
          <summary className="text-xs cursor-pointer hover:underline opacity-70">
            Show technical details
          </summary>
          <div className="mt-2 p-2 bg-black bg-opacity-5 rounded text-xs font-mono">
            <div><strong>Error Code:</strong> {error.errorCode || 'N/A'}</div>
            <div><strong>Status:</strong> {error.statusCode || 'N/A'}</div>
            <div><strong>Time:</strong> {error.timestamp.toLocaleString()}</div>
            {error.details && (
              <div className="mt-2">
                <strong>Details:</strong>
                <pre className="whitespace-pre-wrap text-xs">
                  {JSON.stringify(error.details, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </details>
      )}
    </div>
  )
}

/**
 * Compact error display for inline use
 */
export function ComposioErrorInline({ 
  error, 
  onRetry,
  className = '' 
}: Omit<ComposioErrorDisplayProps, 'onDismiss'>) {
  const icon = getErrorIcon(error.type)
  
  return (
    <div className={`flex items-center gap-2 text-sm text-red-600 ${className}`}>
      <span>{icon}</span>
      <span>{error.message}</span>
      {error.retryable && onRetry && (
        <button
          onClick={onRetry}
          className="text-blue-600 hover:underline text-xs"
        >
          Retry
        </button>
      )}
    </div>
  )
}

/**
 * Toast-style error notification
 */
export function ComposioErrorToast({ 
  error,
  onRetry,
  onDismiss,
  className = ''
}: ComposioErrorDisplayProps) {
  const colorClasses = getErrorColor(error.type)
  const icon = getErrorIcon(error.type)

  return (
    <div className={`max-w-sm w-full bg-white shadow-lg rounded-lg border ${className}`}>
      <div className="p-4">
        <div className="flex items-start">
          <span className="text-lg mr-3">{icon}</span>
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-900">
              {error.message}
            </p>
            <p className="text-sm text-gray-500 mt-1">
              {error.suggestedAction}
            </p>
          </div>
          {onDismiss && (
            <button
              onClick={onDismiss}
              className="ml-4 text-gray-400 hover:text-gray-600"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
        
        {error.retryable && onRetry && (
          <div className="mt-3">
            <button
              onClick={onRetry}
              className="text-sm bg-blue-600 text-white px-3 py-1 rounded-md hover:bg-blue-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        )}
      </div>
    </div>
  )
} 