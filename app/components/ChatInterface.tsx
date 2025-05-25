"use client"

import { useEffect, useRef, useState } from 'react'
import { Message } from './chat/Message'
import { ChatInput } from './chat/ChatInput'
import { useChat } from '../hooks/useChat'
import { extractWorkflowContext } from '../lib/workflowExtractor'
import { AlertCircle, Bot, Workflow, RotateCcw } from 'lucide-react'

interface ChatInterfaceProps {
  workflowContext?: any
  onExecuteActions?: (actions: any[]) => void
  onSuggestionToWorkflow?: (suggestion: string) => void
}

export default function ChatInterface({ workflowContext, onExecuteActions, onSuggestionToWorkflow }: ChatInterfaceProps) {
  const { messages, isTyping, error, sendMessage, clearMessages } = useChat()
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [currentSuggestion, setCurrentSuggestion] = useState<string>('')
  const [currentWorkflowType, setCurrentWorkflowType] = useState<string>('')

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Extract workflow context from the latest assistant message
  useEffect(() => {
    const lastAssistantMessage = messages
      .filter(msg => msg.role === 'assistant')
      .slice(-1)[0]

    if (lastAssistantMessage?.content) {
      const workflowCtx = extractWorkflowContext(lastAssistantMessage.content)
      if (workflowCtx) {
        setCurrentSuggestion(workflowCtx.suggestion)
        setCurrentWorkflowType(workflowCtx.workflowType || '')
      }
    }
  }, [messages])

  const handleSendMessage = (message: string) => {
    sendMessage(message, workflowContext)
  }

  const handleClearChat = () => {
    clearMessages()
    setCurrentSuggestion('')
    setCurrentWorkflowType('')
  }

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-slate-50">
        <div className="flex items-center gap-2">
          <Bot className="h-5 w-5 text-blue-600" />
          <h2 className="text-lg font-semibold text-gray-900">AI Workflow Assistant</h2>
          {currentWorkflowType && (
            <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
              {currentWorkflowType.replace('-', ' ')}
            </span>
          )}
        </div>
        <button
          onClick={handleClearChat}
          className="flex items-center gap-1 px-3 py-1 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
          title="Clear chat history"
        >
          <RotateCcw className="h-4 w-4" />
          Clear
        </button>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center py-8">
            <Workflow className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Welcome to Workflow Composer!</h3>
            <p className="text-gray-600 mb-4">
              I can help you design and build AI agent workflows. Try asking me about:
            </p>
            <div className="space-y-2 text-sm text-left max-w-md mx-auto">
              <div className="bg-blue-50 border border-blue-200 rounded p-3">
                💡 "Create a workflow for data analysis"
              </div>
              <div className="bg-green-50 border border-green-200 rounded p-3">
                🔗 "Build a multi-step research pipeline"
              </div>
              <div className="bg-purple-50 border border-purple-200 rounded p-3">
                ⚡ "Design a content generation workflow"
              </div>
            </div>
          </div>
        )}
        
        {messages.map((message) => (
          <Message 
            key={message.id} 
            message={message} 
            onExecuteActions={onExecuteActions}
          />
        ))}
        
        {isTyping && (
          <div className="flex items-center gap-2 text-gray-500">
            <Bot className="h-4 w-4" />
            <div className="flex gap-1">
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100"></div>
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200"></div>
            </div>
          </div>
        )}
        
        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-800">
            <AlertCircle className="h-4 w-4" />
            <span className="text-sm">{error}</span>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <ChatInput 
        onSend={handleSendMessage} 
        disabled={isTyping}
        suggestion={currentSuggestion}
        workflowContext={currentWorkflowType}
        onSuggestionToWorkflow={onSuggestionToWorkflow}
      />
    </div>
  )
} 