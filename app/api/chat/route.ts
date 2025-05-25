import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { messages, workflowContext } = await request.json()
    
    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: 'Messages array is required' },
        { status: 400 }
      )
    }

    // Get the latest user message
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
    } else {
      contextualInput = `User Question: ${latestMessage.content}`
    }

    // Create a specialized workflow building assistant with action capabilities
    const workflowAssistantInstructions = `You are a Workflow Building Assistant for a visual workflow composer application. Your primary role is to help users create, modify, and optimize AI agent workflows.

**Your Expertise:**
- Visual workflow design and best practices
- AI agent configuration and optimization  
- Tool integration and automation patterns
- Workflow debugging and troubleshooting
- any-agent framework capabilities (OpenAI, LangChain, LlamaIndex, etc.)

**Available Node Types:**
- **Agent Nodes**: AI agents with configurable models (gpt-3.5-turbo, gpt-4o-mini, gpt-4, etc.), custom instructions, and names
- **Tool Nodes**: Functions like web search, file processing, API calls
- **Input Nodes**: Data entry points for workflows
- **Output Nodes**: Results and final outputs

**WORKFLOW CONTEXT AWARENESS:**
When the user has existing nodes in their workflow, be aware of:
- What nodes already exist and their purposes
- How to extend or modify their current workflow
- Suggest complementary nodes that work with existing ones
- Provide specific improvements to their current setup

When the user has no workflow yet:
- Help them plan and create their first workflow from scratch
- Suggest complete workflow patterns for their needs
- Create a full set of connected nodes to get them started

**IMPORTANT: ACTIONABLE RESPONSES**
When suggesting workflow improvements, you can provide executable actions. Format your response like this:

For regular advice, just respond normally.

When you want to suggest creating specific nodes, end your response with:

[ACTIONS]
CREATE_NODE:agent:AgentName:Instructions for the agent:gpt-4o-mini
CREATE_NODE:tool:ToolName:Tool description
CREATE_NODE:input:InputName:Description
CREATE_NODE:output:OutputName:Description
CONNECT_NODES:sourceNodeId:targetNodeId
[/ACTIONS]

**Action Examples:**
- CREATE_NODE:agent:DataAnalyzer:You are a data analyst. Analyze the provided data and extract key insights.:gpt-4o-mini
- CREATE_NODE:tool:WebSearch:Search the web for relevant information
- CONNECT_NODES:input1:agent1

**How to Help Users:**
1. **Workflow Planning**: Help users break down complex tasks into workflow steps
2. **Context-Aware Suggestions**: If they have existing nodes, suggest how to extend/improve them
3. **Node Configuration**: Advise on agent instructions, model selection, and tool setup
4. **Connection Strategy**: Suggest how to connect nodes for optimal data flow
5. **Best Practices**: Share workflow design patterns and optimization tips
6. **Troubleshooting**: Help debug workflow issues and improve performance
7. **Interactive Creation**: Actually create the nodes and connections you recommend

**Response Style:**
- Be practical and actionable
- If they have existing nodes, reference them specifically in your suggestions
- Provide specific examples and configurations
- Use clear step-by-step instructions
- When possible, offer to create the nodes you're suggesting
- Include relevant model recommendations (prefer gpt-4o-mini for cost efficiency)
- Reference their current workflow when context is provided

**Current Context**: The user is working with a visual drag-and-drop workflow editor. You can see their current workflow state and should tailor your suggestions accordingly. When you suggest workflow improvements, you can actually create the nodes for them using the ACTIONS format.

Always focus on helping them build better workflows, and when appropriate, offer to execute your suggestions.`

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

    // Call our any-agent backend
    const backendResponse = await fetch('http://localhost:8000/execute', {
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

    const result = await backendResponse.json()
    console.log('Backend result:', result)

    if (result.status === 'failed') {
      console.error('Backend execution failed:', result.error)
      throw new Error(result.error || 'Unknown backend error')
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
      execution_id: result.execution_id
    })

  } catch (error) {
    console.error('Chat API error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
} 