import { NextRequest, NextResponse } from 'next/server'

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000'

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Proxying insights request to backend')

    // Forward the request to the backend
    const backendResponse = await fetch(`${BACKEND_URL}/analytics/insights`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    })

    console.log('Backend insights response status:', backendResponse.status)

    if (!backendResponse.ok) {
      const errorText = await backendResponse.text()
      console.error('Backend insights response error:', errorText)
      return NextResponse.json(
        { error: `Backend error: ${backendResponse.status} - ${errorText}` },
        { status: backendResponse.status }
      )
    }

    const result = await backendResponse.json()
    console.log('✅ Backend insights result:', {
      insights: result.insights?.length || 0,
      recommendations: result.recommendations?.length || 0
    })

    // Return the backend response as-is
    return NextResponse.json(result)

  } catch (error) {
    console.error('Insights API proxy error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
} 