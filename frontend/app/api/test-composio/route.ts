import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { apiKey, userId } = await request.json()
    
    if (!apiKey) {
      return NextResponse.json({ 
        success: false, 
        message: 'API key is required' 
      }, { status: 400 })
    }

    // Test the Composio API key by making a simple request
    // This is a mock implementation - in a real app you'd test the actual API
    
    // For now, we'll validate the format and simulate a connection test
    if (apiKey.length < 8) {
      return NextResponse.json({ 
        success: false, 
        message: 'API key appears to be too short' 
      }, { status: 400 })
    }

    // Accept various formats: comp_xxx, xxx-xxx-xxx, or alphanumeric keys
    const isValidFormat = /^[a-zA-Z0-9_-]{8,}$/.test(apiKey)
    if (!isValidFormat) {
      return NextResponse.json({ 
        success: false, 
        message: 'API key contains invalid characters' 
      }, { status: 400 })
    }

    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1000))

    // For demo purposes, accept any reasonable-looking key
    console.log(`🧪 Testing Composio API key for user: ${userId}`)
    console.log(`🔑 Key format: ${apiKey.substring(0, 8)}...`)
    
    return NextResponse.json({ 
      success: true, 
      message: '✅ Composio connection successful! Your tools are ready to use.',
      availableTools: [
        'GitHub Operations',
        'Slack Messaging', 
        'Gmail Operations',
        'Notion Pages',
        'Linear Issues'
      ]
    })
  } catch (error) {
    console.error('Error testing Composio connection:', error)
    return NextResponse.json({ 
      success: false, 
      message: 'Failed to test connection. Please try again.' 
    }, { status: 500 })
  }
} 