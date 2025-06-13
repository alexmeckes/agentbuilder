import { NextRequest, NextResponse } from 'next/server'

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000'

export async function GET(
  request: NextRequest,
  { params }: { params: { executionId: string } }
) {
  try {
    const { executionId } = params
    console.log('🔍 Proxying execution performance request to backend for execution:', executionId)

    // Forward the request to the backend
    const backendResponse = await fetch(`${BACKEND_URL}/api/executions/${executionId}/performance`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    })

    console.log('Backend performance response status:', backendResponse.status)

    if (!backendResponse.ok) {
      const errorText = await backendResponse.text()
      console.error('Backend performance response error:', errorText)
      return NextResponse.json(
        { error: `Backend error: ${backendResponse.status} - ${errorText}` },
        { status: backendResponse.status }
      )
    }

    const result = await backendResponse.json()
    console.log('✅ Backend performance result for execution:', executionId)

    // Return the backend response as-is
    return NextResponse.json(result)

  } catch (error) {
    console.error('Execution performance API proxy error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
} 