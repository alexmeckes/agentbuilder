import { NextRequest, NextResponse } from 'next/server'

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000'

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Proxying workflow analytics request to backend')

    // Forward the request to the backend
    const backendResponse = await fetch(`${BACKEND_URL}/analytics/workflows`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    })

    console.log('Backend analytics response status:', backendResponse.status)

    if (!backendResponse.ok) {
      const errorText = await backendResponse.text()
      console.error('Backend analytics response error:', errorText)
      return NextResponse.json(
        { error: `Backend error: ${backendResponse.status} - ${errorText}` },
        { status: backendResponse.status }
      )
    }

    const result = await backendResponse.json()
    console.log('✅ Backend analytics result:', {
      total_workflows: result.total_workflows,
      total_executions: result.total_executions
    })

    // Return the backend response as-is
    return NextResponse.json(result)

  } catch (error) {
    console.error('Analytics API proxy error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
} 