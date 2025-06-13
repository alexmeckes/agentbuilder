import { NextRequest, NextResponse } from 'next/server'

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000'

export async function GET(
  request: NextRequest,
  { params }: { params: { executionId: string } }
) {
  try {
    const { executionId } = params
    
    console.log(`📡 Proxying execution status request for: ${executionId}`)
    
    // Forward the request to the backend
    const backendResponse = await fetch(`${BACKEND_URL}/api/executions/${executionId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    console.log(`Backend response status for ${executionId}:`, backendResponse.status)

    if (!backendResponse.ok) {
      const errorText = await backendResponse.text()
      console.error('Backend response error:', errorText)
      return NextResponse.json(
        { error: `Backend error: ${backendResponse.status} - ${errorText}` },
        { status: backendResponse.status }
      )
    }

    const result = await backendResponse.json()
    console.log(`✅ Execution status for ${executionId}:`, {
      status: result.status,
      hasResult: !!result.result,
      hasProgress: !!result.progress,
      progressPercentage: result.progress?.percentage,
      nodeStatus: result.progress?.node_status ? Object.keys(result.progress.node_status).length : 0
    })

    return NextResponse.json(result)

  } catch (error) {
    console.error('Execution status API proxy error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}