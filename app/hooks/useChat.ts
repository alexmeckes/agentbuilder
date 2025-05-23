import { useCallback, useState } from 'react'
import { v4 as uuidv4 } from 'uuid'
import type { ChatMessage } from '../types/chat'
import { sendMessageToAI } from '../services/ai'

export function useChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isTyping, setIsTyping] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const sendMessage = useCallback(async (content: string) => {
    const userMessage: ChatMessage = {
      id: uuidv4(),
      role: 'user',
      type: 'text',
      content,
      timestamp: Date.now(),
      status: 'sending',
    }

    setMessages((prev) => [...prev, userMessage])
    setIsTyping(true)
    setError(null)

    try {
      const response = await sendMessageToAI([...messages, userMessage])

      if (response.error) {
        throw new Error(response.error)
      }

      const assistantMessage: ChatMessage = {
        id: uuidv4(),
        role: 'assistant',
        type: 'text',
        content: response.message,
        timestamp: Date.now(),
      }

      setMessages((prev) => [
        ...prev.map((msg) =>
          msg.id === userMessage.id
            ? { ...msg, status: 'sent' as const }
            : msg
        ),
        assistantMessage,
      ])
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to send message')
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === userMessage.id
            ? { ...msg, status: 'error' as const }
            : msg
        )
      )
    } finally {
      setIsTyping(false)
    }
  }, [messages])

  const clearMessages = useCallback(() => {
    setMessages([])
    setError(null)
  }, [])

  return {
    messages,
    isTyping,
    error,
    sendMessage,
    clearMessages,
  }
} 