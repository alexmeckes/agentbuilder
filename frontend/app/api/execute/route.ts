import { NextRequest, NextResponse } from 'next/server'

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000'

export async function POST(request: NextRequest) {
  try {
    // Get the request body (workflow execution request from Designer)
    const executionRequest = await request.json()
    
    console.log('🚀 Proxying execution request to backend:', {
      workflow_name: executionRequest.workflow_name,
      workflow_identity: executionRequest.workflow_identity?.name,
      node_count: executionRequest.workflow?.nodes?.length || 0
    })

    // Forward the request directly to the backend
    const backendResponse = await fetch(`${BACKEND_URL}/execute`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(executionRequest)
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
      workflow_name: result.workflow_name || executionRequest.workflow_name
    })

    // Return the backend response as-is
    return NextResponse.json(result)

  } catch (error) {
    console.error('Execute API proxy error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
} 