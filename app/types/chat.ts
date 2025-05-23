export type MessageRole = 'user' | 'assistant' | 'system'

export type MessageType = 'text' | 'code' | 'error' | 'success'

export interface ChatMessage {
  id: string
  role: MessageRole
  type: MessageType
  content: string
  timestamp: number
  status?: 'sending' | 'sent' | 'error'
}

export interface ChatState {
  messages: ChatMessage[]
  isTyping: boolean
  error: string | null
} 