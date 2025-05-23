'use client'

import { useEffect, useRef } from 'react'
import { Message } from './chat/Message'
import { ChatInput } from './chat/ChatInput'
import { useChat } from '../hooks/useChat'
import { AlertCircle } from 'lucide-react'

export default function ChatInterface() {
  const { messages, isTyping, error, sendMessage } = useChat()
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-y-auto p-4">
        {messages.map((message) => (
          <Message key={message.id} message={message} />
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
      <ChatInput onSend={sendMessage} disabled={isTyping} />
    </div>
  )
} 