import { NextRequest, NextResponse } from 'next/server'

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000'

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Proxying decision paths analytics request to backend')

    // Extract x-user-id header if present
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    }
    
    const userId = request.headers.get('x-user-id')
    if (userId) {
      headers['x-user-id'] = userId
    }

    // Forward the request to the backend
    const backendResponse = await fetch(`${BACKEND_URL}/analytics/decision-paths`, {
      method: 'GET',
      headers,
    })

    console.log('Backend decision paths response status:', backendResponse.status)

    if (!backendResponse.ok) {
      const errorText = await backendResponse.text()
      console.error('Backend decision paths response error:', errorText)
      return NextResponse.json(
        { error: `Backend error: ${backendResponse.status} - ${errorText}` },
        { status: backendResponse.status }
      )
    }

    const result = await backendResponse.json()
    console.log('✅ Backend decision paths analytics retrieved successfully')

    // Return the backend response as-is
    return NextResponse.json(result)

  } catch (error) {
    console.error('Decision paths analytics API proxy error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}