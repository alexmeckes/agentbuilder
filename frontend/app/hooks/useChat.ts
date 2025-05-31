"use client"

import { useCallback, useState, useEffect } from 'react'
import { v4 as uuidv4 } from 'uuid'
import type { ChatMessage } from '../types/chat'
import { sendMessageToAI } from '../services/ai'

const STORAGE_KEY = 'workflow-composer-chat-messages'

export function useChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isTyping, setIsTyping] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Load messages from localStorage on initialization
  useEffect(() => {
    try {
      const storedMessages = localStorage.getItem(STORAGE_KEY)
      if (storedMessages) {
        const parsed = JSON.parse(storedMessages)
        // Convert timestamp strings back to Date objects
        const messagesWithDates = parsed.map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp)
        }))
        setMessages(messagesWithDates)
      }
    } catch (error) {
      console.warn('Failed to load chat messages from localStorage:', error)
    }
  }, [])

  // Save messages to localStorage whenever messages change
  useEffect(() => {
    try {
      if (messages.length > 0) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(messages))
      }
    } catch (error) {
      console.warn('Failed to save chat messages to localStorage:', error)
    }
  }, [messages])

  const sendMessage = useCallback(async (content: string, workflowContext?: any) => {
    const userMessage: ChatMessage = {
      id: uuidv4(),
      role: 'user',
      type: 'default',
      content,
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setIsTyping(true)
    setError(null)

    try {
      const response = await sendMessageToAI([...messages, userMessage], workflowContext)
      
      const assistantMessage: ChatMessage = {
        id: uuidv4(),
        role: 'assistant',
        type: 'default',
        content: response.message,
        timestamp: new Date(),
        actions: response.actions || [],
        hasWorkflowActions: response.hasWorkflowActions,
        // 🎯 Store the original user query for context generation
        originalUserQuery: content
      }

      setMessages(prev => [...prev, assistantMessage])
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to send message'
      setError(errorMessage)
      
      // Add error message to chat
      const errorChatMessage: ChatMessage = {
        id: uuidv4(),
        role: 'assistant',
        type: 'error',
        content: `Sorry, I encountered an error: ${errorMessage}`,
        timestamp: new Date()
      }
      setMessages(prev => [...prev, errorChatMessage])
    } finally {
      setIsTyping(false)
    }
  }, [messages])

  const clearMessages = useCallback(() => {
    setMessages([])
    setError(null)
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch (error) {
      console.warn('Failed to clear chat messages from localStorage:', error)
    }
  }, [])

  return {
    messages,
    isTyping,
    error,
    sendMessage,
    clearMessages,
  }
} 