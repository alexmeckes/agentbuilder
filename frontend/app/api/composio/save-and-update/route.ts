import { NextRequest, NextResponse } from 'next/server'

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000'

export async function POST(request: NextRequest) {
  try {
    console.log(`🔄 Save and update tools request`)
    console.log(`🔗 Backend URL: ${BACKEND_URL}`)
    
    // Parse request body
    const body = await request.json()
    console.log(`📝 Request body:`, body)
    
    // Forward to backend
    const backendResponse = await fetch(`${BACKEND_URL}/api/composio/save-and-update`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    })
    
    const result = await backendResponse.json()
    console.log(`📊 Backend response:`, result)
    
    if (backendResponse.ok) {
      return NextResponse.json(result)
    } else {
      return NextResponse.json(result, { status: backendResponse.status })
    }
    
  } catch (error) {
    console.error('❌ Save and update error:', error)
    return NextResponse.json({ 
      success: false, 
      message: 'Failed to save and update tools',
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
} 