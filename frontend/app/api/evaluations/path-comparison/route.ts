import { NextRequest, NextResponse } from 'next/server'

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000'

export async function POST(request: NextRequest) {
  try {
    console.log('🔍 Proxying path comparison request to backend')

    const body = await request.json()

    // Forward the request to the backend
    const backendResponse = await fetch(`${BACKEND_URL}/api/evaluations/path-comparison`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })

    console.log('Backend path comparison response status:', backendResponse.status)

    if (!backendResponse.ok) {
      const errorText = await backendResponse.text()
      console.error('Backend path comparison response error:', errorText)
      return NextResponse.json(
        { error: `Backend error: ${backendResponse.status} - ${errorText}` },
        { status: backendResponse.status }
      )
    }

    const result = await backendResponse.json()
    console.log('✅ Backend path comparison retrieved successfully')

    // Return the backend response as-is
    return NextResponse.json(result)

  } catch (error) {
    console.error('Path comparison API proxy error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}