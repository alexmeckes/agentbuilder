import { cn } from '../../lib/utils'
import type { ChatMessage } from '../../types/chat'
import { CheckCircle2, XCircle } from 'lucide-react'
import { memo } from 'react'
import ReactMarkdown from 'react-markdown'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism'

interface MessageProps {
  message: ChatMessage
}

interface CodeProps {
  node?: any
  inline?: boolean
  className?: string
  children?: React.ReactNode
}

export const Message = memo(function Message({ message }: MessageProps) {
  const isUser = message.role === 'user'

  return (
    <div
      className={cn(
        'flex w-full items-start gap-4 p-4',
        isUser ? 'bg-muted/50' : 'bg-background'
      )}
    >
      <div className="flex h-8 w-8 shrink-0 select-none items-center justify-center rounded-full bg-primary text-primary-foreground">
        {isUser ? 'U' : 'A'}
      </div>
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
      </div>
    </div>
  )
}) 