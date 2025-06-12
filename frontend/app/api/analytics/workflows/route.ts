import { NextRequest, NextResponse } from 'next/server'

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000'

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Proxying workflow analytics request to backend')
    
    // Extract user ID from request headers
    const userId = request.headers.get('x-user-id') || 'anonymous'
    console.log('📊 Analytics request for user:', userId)

    // Forward the request to the backend with cache-busting and user ID
    const backendResponse = await fetch(`${BACKEND_URL}/analytics/workflows?_t=${Date.now()}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'X-User-Id': userId,
      },
      cache: 'no-store'
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

    // Return the backend response with no-cache headers
    return NextResponse.json(result, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
        'Pragma': 'no-cache',
        'Expires': '0',
      }
    })

  } catch (error) {
    console.error('Analytics API proxy error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
} 