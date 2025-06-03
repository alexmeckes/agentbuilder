import { NextRequest, NextResponse } from 'next/server'

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000'

export async function GET(
  request: NextRequest,
  { params }: { params: { workflowId: string } }
) {
  try {
    const { workflowId } = params
    console.log('🔍 Proxying workflow detail request to backend for workflow:', workflowId)

    // Forward the request to the backend
    const backendResponse = await fetch(`${BACKEND_URL}/analytics/workflows/${workflowId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    })

    console.log('Backend workflow detail response status:', backendResponse.status)

    if (!backendResponse.ok) {
      const errorText = await backendResponse.text()
      console.error('Backend workflow detail response error:', errorText)
      return NextResponse.json(
        { error: `Backend error: ${backendResponse.status} - ${errorText}` },
        { status: backendResponse.status }
      )
    }

    const result = await backendResponse.json()
    console.log('✅ Backend workflow detail result for:', workflowId)

    // Return the backend response as-is
    return NextResponse.json(result)

  } catch (error) {
    console.error('Workflow detail API proxy error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
} 