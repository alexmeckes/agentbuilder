import type { ChatMessage } from '../types/chat'

export interface AIResponse {
  message: string
  error?: string
}

export async function sendMessageToAI(
  messages: ChatMessage[]
): Promise<AIResponse> {
  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: messages.map(({ role, content }) => ({ role, content })),
      }),
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data = await response.json()
    return { message: data.message }
  } catch (error) {
    console.error('Error sending message to AI:', error)
    return {
      message: '',
      error: error instanceof Error ? error.message : 'Failed to send message',
    }
  }
} 