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

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(message.content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const isUser = message.role === 'user'
  const hasActions = message.actions && message.actions.length > 0

  return (
    <div
      className={cn(
        'flex w-full items-start gap-4 p-4',
        isUser ? 'bg-muted/50' : 'bg-background'
      )}
    >
      {!isUser && (
        <div className="flex h-8 w-8 shrink-0 select-none items-center justify-center rounded-full bg-primary text-primary-foreground">
          AI
        </div>
      )}
      <div className="flex-1 space-y-2">
        <div className="prose prose-sm dark:prose-invert max-w-none">
          <ReactMarkdown
            components={{
              code({ node, inline, className, children, ...props }: CodeProps) {
                const match = /language-(\w+)/.exec(className || '')
                return !inline && match ? (
                  <SyntaxHighlighter
                    {...props}
                    style={vscDarkPlus}
                    language={match[1]}
                    PreTag="div"
                  >
                    {String(children).replace(/\n$/, '')}
                  </SyntaxHighlighter>
                ) : (
                  <code {...props} className={className}>
                    {children}
                  </code>
                )
              },
            }}
          >
            {message.content}
          </ReactMarkdown>
        </div>
        {message.status && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {message.status === 'sending' && <span>Sending...</span>}
            {message.status === 'sent' && (
              <>
                <CheckCircle2 className="h-3 w-3" />
                <span>Sent</span>
              </>
            )}
            {message.status === 'error' && (
              <>
                <XCircle className="h-3 w-3 text-destructive" />
                <span className="text-destructive">Failed to send</span>
              </>
            )}
          </div>
        )}
        {!isUser && hasActions && (
          <div className="mt-3 pt-3 border-t border-muted-foreground/20">
            <div className="text-xs text-muted-foreground mb-2">
              💡 I can create these nodes for you:
            </div>
            <div className="space-y-1">
              {message.actions?.map((action: any, index: number) => (
                <div key={index} className="text-xs bg-background/50 rounded px-2 py-1">
                  {action.type === 'CREATE_NODE' && (
                    <span>
                      📦 <strong>{action.nodeType}</strong> node: "{action.name}"
                      {action.instructions && (
                        <div className="text-muted-foreground/70 mt-1">
                          {action.instructions.length > 50 
                            ? action.instructions.substring(0, 50) + '...'
                            : action.instructions
                          }
                        </div>
                      )}
                    </span>
                  )}
                  {action.type === 'CONNECT_NODES' && (
                    <span>🔗 Connect {action.sourceId} → {action.targetId}</span>
                  )}
                </div>
              ))}
            </div>
            <button
              onClick={() => onExecuteActions?.(message.actions)}
              className="mt-2 inline-flex items-center gap-1 px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-xs rounded-md font-medium transition-colors"
            >
              <Play className="h-3 w-3" />
              Create These Nodes
            </button>
          </div>
        )}
        {!isUser && (
          <button
            onClick={copyToClipboard}
            className="mt-1 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            {copied ? (
              <Check className="h-3 w-3" />
            ) : (
              <Copy className="h-3 w-3" />
            )}
            {copied ? 'Copied!' : 'Copy'}
          </button>
        )}
      </div>
      {isUser && (
        <div className="flex h-8 w-8 shrink-0 select-none items-center justify-center rounded-full bg-secondary text-secondary-foreground">
          You
        </div>
      )}
    </div>
  )
}) 