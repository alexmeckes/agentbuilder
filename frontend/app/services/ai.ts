import type { ChatMessage } from '../types/chat'

export interface AIResponse {
  message: string
  actions?: Array<{
    type: 'CREATE_NODE' | 'CONNECT_NODES'
    nodeType?: string
    name?: string
    instructions?: string
    model?: string
    sourceId?: string
    targetId?: string
  }>
  error?: string
  hasWorkflowActions?: boolean
}

// Get user preferences from localStorage
function getUserPreferences() {
  if (typeof window === 'undefined') return null
  
  try {
    const prefs = localStorage.getItem('userPreferences')
    return prefs ? JSON.parse(prefs) : null
  } catch {
    return null
  }
}

export async function sendMessageToAI(
  messages: ChatMessage[],
  workflowContext?: any
): Promise<AIResponse> {
  try {
    const userPrefs = getUserPreferences()
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }
    
    // Include user preferences in headers if available
    if (userPrefs) {
      headers['x-user-preferences'] = JSON.stringify(userPrefs)
    }
    
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        messages: messages.map(({ role, content }) => ({ role, content })),
        workflowContext
      }),
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data = await response.json()
    return { 
      message: data.message,
      actions: data.actions || [],
      hasWorkflowActions: data.hasWorkflowActions
    }
  } catch (error) {
    console.error('Error sending message to AI:', error)
    return {
      message: '',
      error: error instanceof Error ? error.message : 'Failed to send message',
    }
  }
} 