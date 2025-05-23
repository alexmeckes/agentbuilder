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
    
    if (workflowContext && workflowContext.nodes && workflowContext.nodes.length > 0) {
      const nodesSummary = workflowContext.nodes.map((node: any) => 
        `- ${node.type} node "${node.data?.name || node.id}": ${node.data?.instructions || 'No instructions set'}`
      ).join('\n')
      
      contextualInput = `Current Workflow Context:
${nodesSummary}

Connected nodes: ${workflowContext.edges?.length || 0} connections

User Question: ${latestMessage.content}`
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
- **Agent Nodes**: AI agents with configurable models (gpt-3.5-turbo, gpt-4, etc.), custom instructions, and names
- **Tool Nodes**: Functions like web search, file processing, API calls
- **Input Nodes**: Data entry points for workflows
- **Output Nodes**: Results and final outputs

**IMPORTANT: ACTIONABLE RESPONSES**
When suggesting workflow improvements, you can provide executable actions. Format your response like this:

For regular advice, just respond normally.

When you want to suggest creating specific nodes, end your response with:

[ACTIONS]
CREATE_NODE:agent:AgentName:Instructions for the agent:gpt-3.5-turbo
CREATE_NODE:tool:ToolName:Tool description
CREATE_NODE:input:InputName:Description
CREATE_NODE:output:OutputName:Description
CONNECT_NODES:sourceNodeId:targetNodeId
[/ACTIONS]

**Action Examples:**
- CREATE_NODE:agent:DataAnalyzer:You are a data analyst. Analyze the provided data and extract key insights.:gpt-3.5-turbo
- CREATE_NODE:tool:WebSearch:Search the web for relevant information
- CONNECT_NODES:input1:agent1

**How to Help Users:**
1. **Workflow Planning**: Help users break down complex tasks into workflow steps
2. **Node Configuration**: Advise on agent instructions, model selection, and tool setup
3. **Connection Strategy**: Suggest how to connect nodes for optimal data flow
4. **Best Practices**: Share workflow design patterns and optimization tips
5. **Troubleshooting**: Help debug workflow issues and improve performance
6. **Interactive Creation**: Actually create the nodes and connections you recommend

**Response Style:**
- Be practical and actionable
- Provide specific examples and configurations
- Use clear step-by-step instructions
- When possible, offer to create the nodes you're suggesting
- Include relevant code snippets when helpful
- Reference their current workflow when context is provided

**Current Context**: The user is working with a visual drag-and-drop workflow editor. When you suggest workflow improvements, you can actually create the nodes for them using the ACTIONS format.

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
      throw new Error(`Backend error: ${backendResponse.status}`)
    }

    const result = await backendResponse.json()

    if (result.status === 'failed') {
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