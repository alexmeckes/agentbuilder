import { NextRequest, NextResponse } from 'next/server'

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000'

export async function POST(request: NextRequest) {
  let userMessage = ''
  
  try {
    const requestData = await request.json()
    userMessage = requestData.userMessage
    
    if (!userMessage) {
      return NextResponse.json(
        { error: 'User message is required for context generation' },
        { status: 400 }
      )
    }

    console.log('🎯 Generating smart context for:', userMessage.substring(0, 100) + '...')
    
    const contextExtractionPrompt = `Analyze this user request for building an AI workflow and generate a concise, actionable input suggestion for their workflow.

User Request: "${userMessage}"

Based on this request, generate a specific input suggestion (10-60 characters) that would be perfect as the initial input for their workflow.

Examples:
- If they want to find grizzly bear spots → "Find grizzly bear spots in Yellowstone"  
- If they want data analysis → "Analyze customer purchase data"
- If they want content creation → "Create blog post about AI trends"

Focus on the core task/goal, not the workflow structure itself.

Respond with ONLY the suggestion text, nothing else. If no clear suggestion can be made, respond with "null".`

    const contextWorkflow = {
      nodes: [
        {
          id: 'context-generator',
          type: 'agent', 
          data: {
            name: 'ContextGenerator',
            instructions: 'You are a workflow input suggestion expert. Generate concise, actionable input suggestions for AI workflows. Respond with only the suggestion text.',
            model_id: 'gpt-4o-mini',
            type: 'agent'  // Add explicit type
          },
          position: { x: 0, y: 0 }
        }
      ],
      edges: []
    }

    const response = await fetch(`${BACKEND_URL}/api/execute`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        workflow: contextWorkflow,
        input_data: contextExtractionPrompt,
        framework: 'openai'
      })
    })

    if (!response.ok) {
      throw new Error(`Context generation failed: ${response.status}`)
    }

    const initialResult = await response.json()
    
    if (initialResult.status === 'failed') {
      throw new Error(initialResult.error || 'Context generation failed')
    }

    let result = initialResult

    // If backend is running asynchronously, poll for completion
    if (result.status === 'running' && result.execution_id) {
      console.log('🔄 Context generation running asynchronously, polling for completion...')
      
      const maxAttempts = 20 // 20 seconds timeout (shorter than main chat)
      const pollInterval = 1000 // 1 second

      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        await new Promise(resolve => setTimeout(resolve, pollInterval))
        
        try {
          const pollResponse = await fetch(`${BACKEND_URL}/api/executions/${result.execution_id}`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            }
          })

          if (pollResponse.ok) {
            const pollResult = await pollResponse.json()
            console.log(`🔄 Context poll attempt ${attempt + 1}:`, pollResult.status)
            
            if (pollResult.status === 'completed') {
              result = pollResult
              console.log('✅ Context generation completed successfully')
              break
            } else if (pollResult.status === 'failed') {
              console.error('❌ Context generation failed during polling:', pollResult.error)
              throw new Error(pollResult.error || 'Context generation failed during processing')
            }
            // Continue polling if still running
          }
        } catch (pollError) {
          console.error('Context poll request failed:', pollError)
          // Continue polling on network errors
        }
      }

      if (result.status === 'running') {
        console.warn('⏰ Context generation polling timeout reached')
        throw new Error('Context generation timeout - falling back to simple extraction')
      }
    }

    const suggestion = result.result?.trim()
    
    if (suggestion && suggestion !== 'null' && suggestion.length >= 10 && suggestion.length <= 100) {
      console.log('✨ Generated smart context:', suggestion)
      return NextResponse.json({ smartContext: suggestion })
    }

    // Fallback to simple extraction from user message
    const fallbackContext = extractSimpleContext(userMessage)
    return NextResponse.json({ smartContext: fallbackContext })

  } catch (error) {
    console.error('❌ Context generation error:', error)
    
    // Fallback to simple extraction using already stored userMessage
    const fallbackContext = extractSimpleContext(userMessage || '')
    return NextResponse.json({ smartContext: fallbackContext })
  }
}

/**
 * Simple fallback context extraction from user message
 */
function extractSimpleContext(userMessage: string): string | null {
  // Simple extraction patterns as fallback
  const cleanMessage = userMessage.toLowerCase().trim()
  
  if (cleanMessage.includes('grizzly') || cleanMessage.includes('bear')) {
    return 'Find grizzly bear viewing spots'
  }
  if (cleanMessage.includes('data') || cleanMessage.includes('analyz')) {
    return 'Analyze data insights'
  }
  if (cleanMessage.includes('content') || cleanMessage.includes('blog') || cleanMessage.includes('write')) {
    return 'Create content'
  }
  if (cleanMessage.includes('research') || cleanMessage.includes('find information')) {
    return 'Research information'
  }
  
  // Generic fallback - take more words to preserve user intent
  if (userMessage.length > 20) {
    const firstWords = userMessage.split(' ').slice(0, 12).join(' ') // Increased from 6 to 12 words
    if (firstWords.length >= 10 && firstWords.length <= 80) { // Added upper limit
      return firstWords.charAt(0).toUpperCase() + firstWords.slice(1)
    }
  }
  
  return null
} 