export type MessageRole = 'user' | 'assistant'

export type MessageType = 'default' | 'success' | 'error'

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
  hasWorkflowActions?: boolean
  originalUserQuery?: string
}

export interface ChatState {
  messages: ChatMessage[]
  isTyping: boolean
  error: string | null
} 