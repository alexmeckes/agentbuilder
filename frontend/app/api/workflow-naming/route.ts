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
            instructions: `You are an expert at analyzing AI workflows and generating concise, descriptive names. 

CRITICAL: You must respond with ONLY a valid JSON object - no markdown, no explanations, no additional text before or after the JSON.

Your response must be EXACTLY in this format:
{"name": "Descriptive Workflow Name", "description": "Brief description of what the workflow does", "category": "category_name", "confidence": 0.8, "alternatives": ["Alt Name 1", "Alt Name 2"]}

Categories to choose from: data-analysis, content-creation, automation, research, multi-agent, integration, system, general

Analyze the workflow structure and user context to generate an appropriate name.`,
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
    console.log('Backend URL:', BACKEND_URL)
    console.log('User message content:', userMessage.content?.substring(0, 200) + '...')
    
    // Call our any-agent backend
    const backendResponse = await fetch(`${BACKEND_URL}/execute`, {
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
    console.log('Result.result:', result.result)
    console.log('Result type:', typeof result.result)
    console.log('Full result keys:', Object.keys(result))
    
    // Check if result might be in different places
    let possibleResult = result.result || result.output || result.trace?.final_output || result.data
    
    // If result is nested in trace outputs, try to extract it
    if (!possibleResult && result.trace?.outputs) {
      const outputs = Object.values(result.trace.outputs)
      if (outputs.length > 0) {
        possibleResult = outputs[0]
      }
    }
    
    console.log('Possible result:', possibleResult)
    console.log('Possible result type:', typeof possibleResult)
    
    // If the result is already an object, stringify it
    if (possibleResult && typeof possibleResult === 'object') {
      possibleResult = JSON.stringify(possibleResult)
    }
    
    if (result.status === 'failed') {
      console.error('Backend execution failed:', result.error)
      
      // Return a fallback response instead of throwing
      return NextResponse.json({
        content: '{"name": "Custom Workflow", "description": "A workflow for processing tasks", "category": "general", "confidence": 0.5, "alternatives": ["Task Processor", "Data Handler", "Custom Pipeline"]}'
      })
    }

    // Return the content in the format expected by the workflow naming service
    return NextResponse.json({
      content: possibleResult || '{"name": "Unknown Workflow", "description": "A workflow", "category": "general", "confidence": 0.5, "alternatives": []}'
    })

  } catch (error) {
    console.error('Workflow naming API error:', error)
    
    // Return a fallback response instead of error
    return NextResponse.json({
      content: '{"name": "Custom Workflow", "description": "A workflow for processing tasks", "category": "general", "confidence": 0.5, "alternatives": ["Task Processor", "Data Handler", "Custom Pipeline"]}'
    })
  }
} 