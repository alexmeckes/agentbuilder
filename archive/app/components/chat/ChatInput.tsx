"use client"

import { Send, Lightbulb, Play, CheckCircle, X, Eye, EyeOff, Copy } from 'lucide-react'
import { useState, useEffect } from 'react'
import { generateContextualPlaceholder } from '../../lib/workflowExtractor'

interface ChatInputProps {
  onSend: (message: string) => void
  disabled?: boolean
  suggestion?: string
  workflowContext?: string
  onSuggestionToWorkflow?: (suggestion: string) => void
}

export function ChatInput({ onSend, disabled, suggestion, workflowContext, onSuggestionToWorkflow }: ChatInputProps) {
  const [message, setMessage] = useState('')
  const [suggestionVisible, setSuggestionVisible] = useState(true)
  const [suggestionUsed, setSuggestionUsed] = useState(false)
  const [copied, setCopied] = useState(false)

  // Reset suggestion visibility when a new suggestion arrives
  useEffect(() => {
    if (suggestion) {
      setSuggestionVisible(true)
      setSuggestionUsed(false)
    }
  }, [suggestion])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (message.trim() && !disabled) {
      onSend(message.trim())
      setMessage('')
    }
  }

  const useSuggestion = () => {
    if (suggestion && onSuggestionToWorkflow) {
      onSuggestionToWorkflow(suggestion)
      setSuggestionUsed(true)
      // Show success message briefly
      setTimeout(() => setSuggestionUsed(false), 3000)
    }
  }

  const copyToClipboard = async () => {
    if (suggestion) {
      try {
        await navigator.clipboard.writeText(suggestion)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      } catch (err) {
        console.error('Failed to copy text: ', err)
      }
    }
  }

  const toggleSuggestionVisibility = () => {
    setSuggestionVisible(!suggestionVisible)
  }

  const dismissSuggestion = () => {
    setSuggestionVisible(false)
  }

  const getPlaceholder = () => {
    return generateContextualPlaceholder(workflowContext)
  }

  const hasSuggestion = suggestion && suggestion.trim().length > 0

  return (
    <div className="border-t border-gray-200">
      {/* Success Banner */}
      {suggestionUsed && (
        <div className="bg-green-50 border-b border-green-200 p-3">
          <div className="flex items-center gap-2 text-green-800">
            <CheckCircle className="h-4 w-4" />
            <span className="text-sm font-medium">✨ Suggestion added to workflow execution!</span>
            <span className="text-sm text-green-600">Switch to Visual Designer to run it.</span>
          </div>
        </div>
      )}
      
      {/* Smart Context Tool - Always visible when there's a suggestion */}
      {hasSuggestion && suggestionVisible && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-200">
          <div className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 flex-1 min-w-0">
                <div className="flex-shrink-0 mt-0.5">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <Lightbulb className="h-4 w-4 text-blue-600" />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-sm font-semibold text-blue-900">💡 Smart Context Suggestion</span>
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">AI Generated</span>
                  </div>
                  <div className="bg-white border border-blue-200 rounded-lg p-4 mb-4 shadow-sm">
                    <p className="text-sm text-gray-800 leading-relaxed font-medium">"{suggestion}"</p>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      onClick={useSuggestion}
                      className="flex items-center gap-2 text-sm bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-all duration-200 font-medium shadow-sm hover:shadow-md"
                    >
                      <Play className="h-4 w-4" />
                      Use in Workflow
                    </button>
                    <button
                      onClick={() => setMessage(suggestion)}
                      className="flex items-center gap-2 text-sm bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-all duration-200 border border-gray-200"
                    >
                      <Send className="h-4 w-4" />
                      Send as Message
                    </button>
                    <button
                      onClick={copyToClipboard}
                      className="flex items-center gap-2 text-sm bg-gray-50 text-gray-600 px-3 py-2 rounded-lg hover:bg-gray-100 transition-all duration-200 border border-gray-200"
                      title="Copy to clipboard"
                    >
                      <Copy className="h-4 w-4" />
                      {copied ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <button
                  onClick={toggleSuggestionVisibility}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-white rounded-lg transition-all duration-200 border border-transparent hover:border-gray-200"
                  title="Hide suggestion"
                >
                  <EyeOff className="h-4 w-4" />
                </button>
                <button
                  onClick={dismissSuggestion}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-white rounded-lg transition-all duration-200 border border-transparent hover:border-gray-200"
                  title="Dismiss suggestion"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toggle button when suggestion is hidden */}
      {hasSuggestion && !suggestionVisible && (
        <div className="bg-gray-50 border-b border-gray-200 p-3">
          <button
            onClick={toggleSuggestionVisibility}
            className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-800 transition-colors px-2 py-1 rounded-md hover:bg-gray-100"
          >
            <Eye className="h-4 w-4" />
            <span>Show smart suggestion</span>
            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">1 available</span>
          </button>
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="p-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={getPlaceholder()}
            disabled={disabled}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <button
            type="submit"
            disabled={disabled || !message.trim()}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </form>
    </div>
  )
} 