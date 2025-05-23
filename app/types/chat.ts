export type MessageRole = 'user' | 'assistant' | 'system'

export type MessageType = 'text' | 'code' | 'error' | 'success'

export interface ChatMessage {
  id: string
  role: MessageRole
  type: MessageType
  content: string
  timestamp: Date
  status?: 'sending' | 'sent' | 'error'
  actions?: Array<{
    type: 'CREATE_NODE' | 'CONNECT_NODES'
    nodeType?: string
    name?: string
    instructions?: string
    model?: string
    sourceId?: string
    targetId?: string
  }>
}

export interface ChatState {
  messages: ChatMessage[]
  isTyping: boolean
  error: string | null
} 