'use client'

import { cn } from '../../lib/utils'
import type { ChatMessage } from '../../types/chat'
import { CheckCircle2, XCircle, Check, Copy, Workflow, Loader2 } from 'lucide-react'
import { memo, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism'

interface MessageProps {
  message: ChatMessage
  onExecuteActions?: (actions: any[]) => void
  onUseWorkflow?: (actions: any[], smartContext?: string) => void
}

interface CodeProps {
  node?: any
  inline?: boolean
  className?: string
  children?: React.ReactNode
}

export const Message = memo(function Message({ message, onExecuteActions, onUseWorkflow }: MessageProps) {
  const [copied, setCopied] = useState(false)
  const [isGeneratingContext, setIsGeneratingContext] = useState(false)

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy text: ', err)
    }
  }

  // 🎯 Generate context and create workflow
  const handleCreateWorkflow = async () => {
    if (!message.actions || message.actions.length === 0) return
    
    setIsGeneratingContext(true)
    
    try {
      // Use the original user query that triggered this AI response
      const userQuery = message.originalUserQuery || "Create workflow" // Fallback
      
      console.log('🎯 Generating context for workflow creation with query:', userQuery)
      
      // Generate smart context
      const contextResponse = await fetch('/api/generate-context', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userMessage: userQuery
        })
      })
      
      let smartContext = null
      if (contextResponse.ok) {
        const contextData = await contextResponse.json()
        smartContext = contextData.smartContext
        console.log('✨ Generated smart context:', smartContext)
      } else {
        console.warn('⚠️ Context generation failed, proceeding without context')
      }
      
      // Create the workflow with the generated context
      onUseWorkflow?.(message.actions, smartContext)
      
    } catch (error) {
      console.error('❌ Error during workflow creation:', error)
      // Still create the workflow without context if generation fails
      onUseWorkflow?.(message.actions, undefined)
    } finally {
      setIsGeneratingContext(false)
    }
  }

  const isUser = message.role === 'user'
  const hasWorkflowActions = message.actions && message.actions.length > 0

  return (
    <div className={cn('flex w-full', isUser ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'max-w-[80%] rounded-lg px-4 py-3',
          isUser
            ? 'bg-blue-600 text-white'
            : 'bg-gray-100 text-gray-900 border border-gray-200'
        )}
      >
        <div className="prose prose-sm max-w-none">
          {message.content && (
            <ReactMarkdown
              components={{
                code({ node, inline, className, children, ...props }: CodeProps) {
                  const match = /language-(\w+)/.exec(className || '')
                  return !inline && match ? (
                    <div className="relative">
                      <SyntaxHighlighter
                        style={vscDarkPlus}
                        language={match[1]}
                        PreTag="div"
                        className="rounded-md"
                        {...props}
                      >
                        {String(children).replace(/\n$/, '')}
                      </SyntaxHighlighter>
                      <button
                        onClick={() => copyToClipboard(String(children))}
                        className="absolute top-2 right-2 p-1 rounded bg-gray-800 text-gray-300 hover:bg-gray-700 transition-colors"
                        title="Copy code"
                      >
                        {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                      </button>
                    </div>
                  ) : (
                    <code className="bg-gray-200 text-gray-900 px-1 py-0.5 rounded text-sm" {...props}>
                      {children}
                    </code>
                  )
                },
                p({ children }) {
                  return <p className="mb-2 last:mb-0">{children}</p>
                },
                ul({ children }) {
                  return <ul className="list-disc pl-4 mb-2">{children}</ul>
                },
                ol({ children }) {
                  return <ol className="list-decimal pl-4 mb-2">{children}</ol>
                },
                li({ children }) {
                  return <li className="mb-1">{children}</li>
                },
              }}
            >
              {message.content}
            </ReactMarkdown>
          )}
        </div>

        {/* 🎯 WORKFLOW CREATION BUTTON - Context Generated On-Demand */}
        {!isUser && hasWorkflowActions && (
          <div className="mt-3 pt-2 border-t border-gray-300">
            <button
              onClick={handleCreateWorkflow}
              disabled={isGeneratingContext}
              className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:from-blue-400 disabled:to-indigo-400 text-white text-sm rounded-lg font-medium transition-all duration-200 shadow-sm hover:shadow-md disabled:cursor-not-allowed"
            >
              {isGeneratingContext ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Workflow className="h-4 w-4" />
              )}
              {isGeneratingContext ? 'Generating Context...' : 'Create This Workflow'}
            </button>
            
            {isGeneratingContext && (
              <p className="text-xs text-gray-500 mt-2">
                ⚡ Generating smart context for optimal workflow execution
              </p>
            )}
          </div>
        )}

        {/* Success/Error States */}
        {message.type === 'success' && (
          <div className="mt-2 flex items-center gap-1 text-green-600">
            <CheckCircle2 className="h-4 w-4" />
            <span className="text-xs">Success</span>
          </div>
        )}
        
        {message.status === 'error' && (
          <div className="mt-2 flex items-center gap-1 text-red-600">
            <XCircle className="h-4 w-4" />
            <span className="text-xs">Error</span>
          </div>
        )}

        {/* Timestamp */}
        <div className={cn(
          'mt-2 text-xs opacity-70',
          isUser ? 'text-blue-100' : 'text-gray-500'
        )}>
          {message.timestamp.toLocaleTimeString()}
        </div>
      </div>
    </div>
  )
}) 