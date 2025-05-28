import { NextRequest, NextResponse } from 'next/server'

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
      chatAssistant: 'gpt-4o-mini',
      workflowNaming: 'gpt-4o-mini',
      contentExtraction: 'gpt-4o-mini',
      experimentAnalysis: 'gpt-4o-mini'
    }
  }
}

export async function POST(request: NextRequest) {
  try {
    const { messages, model, temperature = 0.7 } = await request.json()
    const userPrefs = getUserPreferences(request)
    
    // Use user preference for workflow naming, fallback to request model, then default
    const selectedModel = model || userPrefs.defaultModels.workflowNaming
    
    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: 'Messages array is required' },
        { status: 400 }
      )
    }

    // Create a specialized workflow naming agent
    const namingWorkflow = {
      nodes: [
        {
          id: 'workflow-namer',
          type: 'agent',
          data: {
            name: 'WorkflowNamer',
            instructions: 'You are an expert at analyzing AI workflows and generating concise, descriptive names. You must respond ONLY with valid JSON in the exact format requested. Do not include any explanatory text, markdown formatting, or additional content - just the raw JSON object.',
            model_id: selectedModel
          },
          position: { x: 0, y: 0 }
        }
      ],
      edges: []
    }

    // Get the user's prompt (last message)
    const userMessage = messages[messages.length - 1]
    
    console.log('Calling backend with workflow naming request...')
    
    // Call our any-agent backend
    const backendResponse = await fetch('http://localhost:8000/execute', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        workflow: namingWorkflow,
        input_data: userMessage.content,
        framework: 'openai',
        execution_context: {
          type: 'workflow_naming',
          source: 'workflow_naming_api',
          user_prompt_length: userMessage.content?.length || 0
        }
      })
    })

    console.log('Backend response status:', backendResponse.status)

    if (!backendResponse.ok) {
      const errorText = await backendResponse.text()
      console.error('Backend response error:', errorText)
      
      // Return a fallback response instead of throwing
      return NextResponse.json({
        content: '{"name": "Custom Workflow", "description": "A workflow for processing tasks", "category": "general", "confidence": 0.5, "alternatives": ["Task Processor", "Data Handler", "Custom Pipeline"]}'
      })
    }

    const result = await backendResponse.json()
    console.log('Backend result:', result)
    
    if (result.status === 'failed') {
      console.error('Backend execution failed:', result.error)
      
      // Return a fallback response instead of throwing
      return NextResponse.json({
        content: '{"name": "Custom Workflow", "description": "A workflow for processing tasks", "category": "general", "confidence": 0.5, "alternatives": ["Task Processor", "Data Handler", "Custom Pipeline"]}'
      })
    }

    // Return the content in the format expected by the workflow naming service
    return NextResponse.json({
      content: result.result || '{"name": "Unknown Workflow", "description": "A workflow", "category": "general", "confidence": 0.5, "alternatives": []}'
    })

  } catch (error) {
    console.error('Workflow naming API error:', error)
    
    // Return a fallback response instead of error
    return NextResponse.json({
      content: '{"name": "Custom Workflow", "description": "A workflow for processing tasks", "category": "general", "confidence": 0.5, "alternatives": ["Task Processor", "Data Handler", "Custom Pipeline"]}'
    })
  }
} 