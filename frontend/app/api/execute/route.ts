import { NextRequest, NextResponse } from 'next/server'

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000'

interface UserContext {
  userId: string
  composioApiKey?: string
  enabledTools: string[]
  preferences: {
    defaultFramework: string
    autoSaveWorkflows: boolean
  }
}

function extractUserContext(request: NextRequest): UserContext | null {
  try {
    // Try to get user context from headers (sent by frontend)
    const userContextHeader = request.headers.get('x-user-context')
    if (userContextHeader) {
      return JSON.parse(userContextHeader)
    }
    
    // Fallback: check if it's in the request body
    // (This will be handled in the main function)
    return null
  } catch (error) {
    console.error('Failed to extract user context:', error)
    return null
  }
}

export async function POST(request: NextRequest) {
  try {
    // Get the request body (workflow execution request from Designer)
    const executionRequest = await request.json()
    
    // Extract user context from request or headers
    let userContext = extractUserContext(request)
    if (!userContext && executionRequest.userContext) {
      userContext = executionRequest.userContext
    }
    
    console.log('🚀 Proxying execution request to backend:', {
      workflow_name: executionRequest.workflow_name,
      workflow_identity: executionRequest.workflow_identity?.name,
      node_count: executionRequest.workflow?.nodes?.length || 0,
      user_id: userContext?.userId || 'anonymous',
      has_api_key: !!userContext?.composioApiKey,
      enabled_tools: userContext?.enabledTools?.length || 0
    })

    // Enhance the execution request with user context
    const enhancedRequest = {
      ...executionRequest,
      user_context: userContext ? {
        user_id: userContext.userId,
        composio_api_key: userContext.composioApiKey,
        enabled_tools: userContext.enabledTools || [],
        preferences: userContext.preferences || {}
      } : {
        user_id: 'anonymous',
        enabled_tools: [],
        preferences: {}
      }
    }

    // Forward the enhanced request to the backend
    const backendResponse = await fetch(`${BACKEND_URL}/execute`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(enhancedRequest)
    })

    console.log('Backend response status:', backendResponse.status)

    if (!backendResponse.ok) {
      const errorText = await backendResponse.text()
      console.error('Backend response error:', errorText)
      return NextResponse.json(
        { error: `Backend error: ${backendResponse.status} - ${errorText}` },
        { status: backendResponse.status }
      )
    }

    const result = await backendResponse.json()
    console.log('✅ Backend execution result:', {
      execution_id: result.execution_id,
      status: result.status,
      workflow_name: result.workflow_name || executionRequest.workflow_name,
      user_id: userContext?.userId || 'anonymous'
    })

    // Return the backend response with user context metadata
    return NextResponse.json({
      ...result,
      user_context: userContext ? {
        userId: userContext.userId,
        hasApiKey: !!userContext.composioApiKey,
        enabledToolsCount: userContext.enabledTools?.length || 0
      } : null
    })

  } catch (error) {
    console.error('Execute API proxy error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
} 