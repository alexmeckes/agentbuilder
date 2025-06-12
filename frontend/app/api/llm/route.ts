import { NextRequest, NextResponse } from 'next/server'

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000'

// Helper function to get user preferences from request headers or use defaults
function getUserPreferences(request: NextRequest) {
  try {
    const prefsHeader = request.headers.get('x-user-preferences')
    if (prefsHeader) {
      return JSON.parse(prefsHeader)
    }
  } catch (error) {
    console.warn('Failed to parse user preferences from header:', error)
  }
  
  // Default preferences
  return {
    defaultModels: {
      general: 'gpt-4o-mini',
      evaluation: 'gpt-4o-mini'
    }
  }
}

export async function POST(request: NextRequest) {
  try {
    const { prompt, systemPrompt, temperature = 0.7, model } = await request.json()
    const userPrefs = getUserPreferences(request)
    
    // Use model from request, or user preference, or default
    const selectedModel = model || userPrefs.defaultModels.general || 'gpt-4o-mini'
    
    if (!prompt) {
      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400 }
      )
    }

    // Create a simple LLM agent workflow
    const llmWorkflow = {
      nodes: [
        {
          id: 'llm-agent',
          type: 'agent',
          data: {
            name: 'LLMAgent',
            instructions: systemPrompt || 'You are a helpful AI assistant. Please respond to the user\'s request.',
            model_id: selectedModel
          },
          position: { x: 0, y: 0 }
        }
      ],
      edges: []
    }

    console.log('🚀 Calling backend with LLM request...')
    console.log('📝 System prompt:', systemPrompt?.substring(0, 100) + '...')
    console.log('💬 User prompt:', prompt.substring(0, 100) + '...')
    console.log('🤖 Model:', selectedModel)
    
    // Call backend with timeout
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 30000) // 30 second timeout
    
    try {
      const backendResponse = await fetch(`${BACKEND_URL}/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          workflow: llmWorkflow,
          input_data: prompt,
          framework: 'openai',
          execution_context: {
            type: 'llm_call',
            source: 'llm_api'
          }
        }),
        signal: controller.signal
      })
      
      clearTimeout(timeout)

      console.log('Backend response status:', backendResponse.status)

      if (!backendResponse.ok) {
        const errorText = await backendResponse.text()
        console.error('Backend response error:', errorText)
        
        return NextResponse.json(
          { error: 'Failed to process request' },
          { status: backendResponse.status }
        )
      }

      let result = await backendResponse.json()
      
      // Poll for completion if still running
      if (result.status === 'running' && result.execution_id) {
        console.log('⏳ LLM execution running, polling for completion...')
        
        const maxAttempts = 20 // 20 attempts * 500ms = 10 seconds max
        let attempts = 0
        
        while (attempts < maxAttempts && result.status === 'running') {
          await new Promise(resolve => setTimeout(resolve, 500))
          
          const pollResponse = await fetch(`${BACKEND_URL}/executions/${result.execution_id}`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            }
          })
          
          if (pollResponse.ok) {
            result = await pollResponse.json()
            console.log(`📊 Poll attempt ${attempts + 1}/${maxAttempts} - Status: ${result.status}`)
          }
          
          attempts++
        }
      }
      
      // Extract the actual response
      let finalResponse = result.result || result.trace?.final_output || ''
      
      // If result is in trace outputs, extract it
      if (!finalResponse && result.trace?.outputs) {
        const outputs = Object.values(result.trace.outputs)
        if (outputs.length > 0) {
          finalResponse = outputs[0]
        }
      }
      
      console.log('✅ LLM response:', typeof finalResponse === 'string' ? finalResponse.substring(0, 100) + '...' : finalResponse)
      
      return NextResponse.json({
        response: finalResponse,
        model: selectedModel,
        execution_id: result.execution_id
      })
      
    } catch (error: any) {
      clearTimeout(timeout)
      if (error.name === 'AbortError') {
        console.error('🚨 LLM request timed out after 30s')
        return NextResponse.json(
          { error: 'Request timed out' },
          { status: 504 }
        )
      }
      console.error('🚨 LLM API error:', error)
      
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('LLM API route error:', error)
    return NextResponse.json(
      { error: 'Invalid request' },
      { status: 400 }
    )
  }
}