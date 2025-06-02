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
      
      {/* Smart Context Tool - Hidden since it's now automatic with "Create This Workflow" button */}
      
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