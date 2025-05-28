'use client'

import { cn } from '../../lib/utils'
import type { ChatMessage } from '../../types/chat'
import { CheckCircle2, XCircle, Check, Copy, Play } from 'lucide-react'
import { memo, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism'

interface MessageProps {
  message: ChatMessage
  onExecuteActions?: (actions: any[]) => void
}

interface CodeProps {
  node?: any
  inline?: boolean
  className?: string
  children?: React.ReactNode
}

export const Message = memo(function Message({ message, onExecuteActions }: MessageProps) {
  const [copied, setCopied] = useState(false)

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy text: ', err)
    }
  }

  const isUser = message.role === 'user'

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

        {/* Action Buttons */}
        {!isUser && message.actions && message.actions.length > 0 && (
          <div className="mt-3 pt-2 border-t border-gray-300">
            <button
              onClick={() => onExecuteActions?.(message.actions || [])}
              className="mt-2 inline-flex items-center gap-1 px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-xs rounded-md font-medium transition-colors"
            >
              <Play className="h-3 w-3" />
              Create These Nodes
            </button>
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