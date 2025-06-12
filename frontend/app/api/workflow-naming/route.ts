import { NextRequest, NextResponse } from 'next/server'

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000'

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
    
    console.log('🚀 Calling backend with workflow naming request...')
    console.log('🌐 Backend URL:', BACKEND_URL)
    console.log('📝 Naming workflow nodes:', namingWorkflow.nodes.length)
    console.log('📋 WorkflowNamer instructions length:', namingWorkflow.nodes[0].data.instructions.length)
    console.log('💬 User message preview:', userMessage.content?.substring(0, 100) + '...')
    
    // Call our any-agent backend with timeout
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 30000) // 30 second timeout
    
    try {
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
          },
          // Add a flag to help backend prioritize this small workflow
          priority: 'high'
        }),
        signal: controller.signal
      })
      
      clearTimeout(timeout)

      console.log('Backend response status:', backendResponse.status)

      if (!backendResponse.ok) {
        const errorText = await backendResponse.text()
        console.error('Backend response error:', errorText)
        
        // Return a fallback response instead of throwing
        return NextResponse.json({
          content: '{"name": "Custom Workflow", "description": "A workflow for processing tasks", "category": "general", "confidence": 0.5, "alternatives": ["Task Processor", "Data Handler", "Custom Pipeline"]}'
        })
      }

      let result = await backendResponse.json()
      console.log('🔍 Initial backend workflow naming result:', {
        execution_id: result.execution_id,
        status: result.status,
        hasResult: !!result.result,
        hasTrace: !!result.trace,
        resultType: typeof result.result,
        resultLength: result.result ? String(result.result).length : 0,
        error: result.error || 'none'
      })
      
      // If the execution is still running, poll for completion
      if (result.status === 'running' && result.execution_id) {
        console.log('⏳ Workflow naming is running, polling for completion...')
        
        const maxAttempts = 20 // 20 attempts * 500ms = 10 seconds max
        let attempts = 0
        
        while (attempts < maxAttempts && result.status === 'running') {
          // Wait 500ms before polling
          await new Promise(resolve => setTimeout(resolve, 500))
          
          // Poll the execution status
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
        
        console.log('✅ Polling complete. Final status:', result.status)
      }
      
      console.log('📋 Full backend response keys:', Object.keys(result))
      console.log('🎯 Result value:', result.result)
      console.log('🔍 Trace outputs:', result.trace?.outputs || 'none')
      
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
      
    } catch (error: any) {
      clearTimeout(timeout)
      if (error.name === 'AbortError') {
        console.error('🚨 Backend workflow naming timed out after 30s')
      }
      console.error('🚨 Workflow naming API error:', error)
      
      // Return a fallback response instead of error
      return NextResponse.json({
        content: '{"name": "Custom Workflow", "description": "A workflow for processing tasks", "category": "general", "confidence": 0.5, "alternatives": ["Task Processor", "Data Handler", "Custom Pipeline"]}'
      })
    }
  } catch (error) {
    console.error('Workflow naming API route error:', error)
    return NextResponse.json({
      content: '{"name": "Error Workflow", "description": "Failed to generate workflow name", "category": "general", "confidence": 0.1, "alternatives": []}'
    })
  }
} 