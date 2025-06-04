import { NextRequest, NextResponse } from 'next/server'

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000'

export async function POST(request: NextRequest) {
  try {
    const { messages, workflowContext, extractionMode } = await request.json()
    
    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: 'Messages array is required' },
        { status: 400 }
      )
    }

    // Handle extraction mode - simple LLM call without workflow context
    if (extractionMode) {
      console.log('🔍 Processing extraction mode request')
      
      const chatWorkflow = {
        nodes: [
          {
            id: 'context-extractor',
            type: 'agent',
            data: {
              name: 'ContextExtractor',
              instructions: 'You are a workflow suggestion expert. Extract actionable workflow suggestions from AI responses. Always respond with valid JSON only.',
              model_id: 'gpt-4o-mini'
            },
            position: { x: 0, y: 0 }
          }
        ],
        edges: []
      }

      const latestMessage = messages[messages.length - 1]
      
      // Call our any-agent backend for extraction
      const backendResponse = await fetch(`${BACKEND_URL}/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          workflow: chatWorkflow,
          input_data: latestMessage.content,
          framework: 'openai'
        })
      })

      if (!backendResponse.ok) {
        const errorText = await backendResponse.text()
        console.error('Backend response error:', errorText)
        throw new Error(`Backend error: ${backendResponse.status} - ${errorText}`)
      }

      const result = await backendResponse.json()
      
      return NextResponse.json({
        message: result.result || 'No extraction result',
        actions: []
      })
    }

    // Regular chat mode continues below...
    const latestMessage = messages[messages.length - 1]
    if (!latestMessage || latestMessage.role !== 'user') {
      return NextResponse.json(
        { error: 'Latest message must be from user' },
        { status: 400 }
      )
    }

    // Create context-aware input for the assistant
    let contextualInput = latestMessage.content
    
    // Build comprehensive workflow context
    if (workflowContext) {
      console.log('Received workflow context:', workflowContext)
      
      let contextInfo = ''
      
      // Include current workflow state if nodes exist
      if (workflowContext.nodes && Array.isArray(workflowContext.nodes) && workflowContext.nodes.length > 0) {
        const nodesSummary = workflowContext.nodes.map((node: any) => {
          const nodeType = node.type || 'unknown'
          const nodeName = node.data?.name || node.data?.label || node.id
          const instructions = node.data?.instructions || 'No instructions set'
          const model = node.data?.model_id ? ` (using ${node.data.model_id})` : ''
          return `- ${nodeType} node "${nodeName}"${model}: ${instructions}`
        }).join('\n')
        
        const edgeCount = workflowContext.edges?.length || 0
        
        contextInfo = `Current Workflow Context:
The user has ${workflowContext.nodes.length} nodes in their workflow:
${nodesSummary}

Connected with ${edgeCount} connections.

This context should help you understand their current workflow and provide relevant suggestions.

`
      } else {
        contextInfo = `Current Workflow Context:
The user has an empty workflow (no nodes created yet).
This is a good opportunity to help them get started with their first workflow.

`
      }
      
      contextualInput = `${contextInfo}User Question: ${latestMessage.content}`
    }

    const workflowAssistantInstructions = `You are a Workflow Building Assistant for a visual workflow composer application. Your primary role is to help users create, modify, and optimize AI agent workflows.

Key Capabilities:
- **Node Creation**: Create input, output, agent, and tool nodes with appropriate configurations
- **Workflow Design**: Design complete workflows with logical connections and flow
- **Best Practices**: Apply workflow design best practices and patterns
- **Troubleshooting**: Help debug and optimize existing workflows

Guidelines for Node Creation:
- **Input Nodes**: For collecting user input or data
- **Output Nodes**: For displaying results or saving output
- **Agent Nodes**: For AI processing, analysis, or decision-making
- **Tool Nodes**: For specific tasks like web search, file operations, API calls

When creating workflows, use this exact format for actions:

[ACTIONS]
CREATE_NODE:nodeType:NodeName:Node instructions or description:model_id
CONNECT_NODES:SourceNodeName:TargetNodeName
[/ACTIONS]

Example:
[ACTIONS]
CREATE_NODE:input:UserQuery:Collect the user's question or request
CREATE_NODE:agent:Analyzer:Analyze the user query and determine the best approach:gpt-4o-mini
CREATE_NODE:output:Response:Present the final answer to the user
CONNECT_NODES:UserQuery:Analyzer
CONNECT_NODES:Analyzer:Response
[/ACTIONS]

Always respond with helpful explanations and actionable workflow suggestions. Focus on practical, working solutions that users can immediately implement.`

    const chatWorkflow = {
      nodes: [
        {
          id: 'workflow-assistant',
          type: 'agent',
          data: {
            name: 'WorkflowBuildingAssistant',
            instructions: workflowAssistantInstructions,
            model_id: 'gpt-4.1'
          },
          position: { x: 0, y: 0 }
        }
      ],
      edges: []
    }

    // Call our any-agent backend for the main response
    const backendResponse = await fetch(`${BACKEND_URL}/execute`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        workflow: chatWorkflow,
        input_data: contextualInput,
        framework: 'openai'
      })
    })

    if (!backendResponse.ok) {
      const errorText = await backendResponse.text()
      console.error('Backend response error:', errorText)
      throw new Error(`Backend error: ${backendResponse.status} - ${errorText}`)
    }

    const initialResult = await backendResponse.json()
    console.log('Backend initial result:', initialResult)

    if (initialResult.status === 'failed') {
      console.error('Backend execution failed:', initialResult.error)
      throw new Error(initialResult.error || 'Unknown backend error')
    }

    let result = initialResult

    // If backend is running asynchronously, poll for completion
    if (result.status === 'running' && result.execution_id) {
      console.log('🔄 Backend is running asynchronously, polling for completion...')
      
      const maxAttempts = 30 // 30 seconds timeout
      const pollInterval = 1000 // 1 second

      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        await new Promise(resolve => setTimeout(resolve, pollInterval))
        
        try {
          const pollResponse = await fetch(`${BACKEND_URL}/executions/${result.execution_id}`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            }
          })

          if (pollResponse.ok) {
            const pollResult = await pollResponse.json()
            console.log(`🔄 Poll attempt ${attempt + 1}:`, pollResult.status)
            
            if (pollResult.status === 'completed') {
              result = pollResult
              console.log('✅ Execution completed successfully')
              break
            } else if (pollResult.status === 'failed') {
              console.error('❌ Execution failed during polling:', pollResult.error)
              throw new Error(pollResult.error || 'Execution failed during processing')
            }
            // Continue polling if still running
          }
        } catch (pollError) {
          console.error('Poll request failed:', pollError)
          // Continue polling on network errors
        }
      }

      if (result.status === 'running') {
        console.warn('⏰ Polling timeout reached')
        throw new Error('Request timeout - the AI is taking longer than expected to respond')
      }
    }

    const responseText = result.result || 'I apologize, but I couldn\'t generate a response. Please try asking about workflow building!'
    
    // Parse actions from the response
    const actions = []
    const actionMatch = responseText.match(/\[ACTIONS\]([\s\S]*?)\[\/ACTIONS\]/)
    
    if (actionMatch) {
      const actionLines = actionMatch[1].trim().split('\n')
      for (const line of actionLines) {
        const trimmedLine = line.trim()
        if (trimmedLine.startsWith('CREATE_NODE:')) {
          const parts = trimmedLine.substring('CREATE_NODE:'.length).split(':')
          if (parts.length >= 3) {
            actions.push({
              type: 'CREATE_NODE',
              nodeType: parts[0],
              name: parts[1],
              instructions: parts[2],
              model: parts[3] || 'gpt-4.1'
            })
          }
        } else if (trimmedLine.startsWith('CONNECT_NODES:')) {
          const parts = trimmedLine.substring('CONNECT_NODES:'.length).split(':')
          if (parts.length >= 2) {
            actions.push({
              type: 'CONNECT_NODES',
              sourceId: parts[0],
              targetId: parts[1]
            })
          }
        }
      }
    }

    // Remove actions section from the displayed message
    const cleanMessage = responseText.replace(/\[ACTIONS\][\s\S]*?\[\/ACTIONS\]/, '').trim()

    return NextResponse.json({
      message: cleanMessage,
      actions: actions,
      execution_id: result.execution_id,
      hasWorkflowActions: actions.length > 0 // Flag to show workflow button
    })

  } catch (error) {
    console.error('Chat API error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
} 