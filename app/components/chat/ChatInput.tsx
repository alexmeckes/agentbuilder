"use client"

import { Send, Lightbulb, Play, CheckCircle } from 'lucide-react'
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
  const [showSuggestion, setShowSuggestion] = useState(false)
  const [suggestionUsed, setSuggestionUsed] = useState(false)

  // Show suggestion when it changes and input is empty
  useEffect(() => {
    if (suggestion && !message.trim()) {
      setShowSuggestion(true)
      setSuggestionUsed(false)
      const timer = setTimeout(() => setShowSuggestion(false), 5000)
      return () => clearTimeout(timer)
    }
  }, [suggestion, message])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (message.trim() && !disabled) {
      onSend(message.trim())
      setMessage('')
      setShowSuggestion(false)
    }
  }

  const useSuggestion = () => {
    if (suggestion && onSuggestionToWorkflow) {
      onSuggestionToWorkflow(suggestion)
      setShowSuggestion(false)
      setSuggestionUsed(true)
      // Show success message briefly
      setTimeout(() => setSuggestionUsed(false), 3000)
    }
  }

  const getPlaceholder = () => {
    return generateContextualPlaceholder(workflowContext)
  }

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
      
      {/* Dynamic Suggestion Banner */}
      {showSuggestion && suggestion && (
        <div className="bg-blue-50 border-b border-blue-200 p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-blue-800">
              <Lightbulb className="h-4 w-4" />
              <span className="text-sm font-medium">Try this in your workflow:</span>
              <span className="text-sm italic">"{suggestion}"</span>
            </div>
            <button
              onClick={useSuggestion}
              className="flex items-center gap-1 text-xs bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 transition-colors"
            >
              <Play className="h-3 w-3" />
              Use in Workflow
            </button>
          </div>
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