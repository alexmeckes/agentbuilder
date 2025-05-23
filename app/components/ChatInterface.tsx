'use client'

import { useEffect, useRef } from 'react'
import { Message } from './chat/Message'
import { ChatInput } from './chat/ChatInput'
import { useChat } from '../hooks/useChat'
import { AlertCircle, Bot, Workflow } from 'lucide-react'

interface ChatInterfaceProps {
  workflowContext?: any
  onExecuteActions?: (actions: any[]) => void
}

export default function ChatInterface({ workflowContext, onExecuteActions }: ChatInterfaceProps) {
  const { messages, isTyping, error, sendMessage } = useChat()
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSendMessage = (content: string) => {
    sendMessage(content, workflowContext)
  }

  const handleExecuteActions = (actions: any[]) => {
    if (onExecuteActions) {
      onExecuteActions(actions)
    }
  }

  return (
    <div className="flex h-full flex-col">
      {/* Workflow Assistant Header */}
      <div className="border-b bg-muted/30 px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <Bot className="h-4 w-4" />
          </div>
          <div>
            <h3 className="font-semibold text-sm">Workflow Building Assistant</h3>
            <p className="text-xs text-muted-foreground">Ask me about creating agents, connecting nodes, and optimizing workflows</p>
          </div>
          <Workflow className="ml-auto h-5 w-5 text-muted-foreground" />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
            <Bot className="h-12 w-12 mb-4 opacity-50" />
            <h3 className="font-medium mb-2">Welcome to your Workflow Assistant!</h3>
            <p className="text-sm mb-4 max-w-sm">
              I'm here to help you build amazing AI workflows. Ask me about:
            </p>
            <div className="text-xs space-y-1 max-w-sm">
              <div>• How to configure agent nodes</div>
              <div>• Best practices for workflow design</div>
              <div>• Connecting nodes and data flow</div>
              <div>• Troubleshooting and optimization</div>
              <div>• <strong>Creating nodes automatically!</strong></div>
            </div>
          </div>
        )}
        {messages.map((message) => (
          <Message 
            key={message.id} 
            message={message} 
            onExecuteActions={handleExecuteActions}
          />
        ))}
        {isTyping && (
          <div className="flex items-center gap-2 p-4 text-sm text-muted-foreground">
            <div className="h-2 w-2 animate-bounce rounded-full bg-primary"></div>
            <div className="h-2 w-2 animate-bounce rounded-full bg-primary [animation-delay:0.2s]"></div>
            <div className="h-2 w-2 animate-bounce rounded-full bg-primary [animation-delay:0.4s]"></div>
          </div>
        )}
        {error && (
          <div className="flex items-center gap-2 p-4 text-sm text-destructive">
            <AlertCircle className="h-4 w-4" />
            <span>{error}</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      <ChatInput onSend={handleSendMessage} disabled={isTyping} />
    </div>
  )
} 