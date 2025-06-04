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

    // Test the Composio API key by making a request to their API
    try {
      console.log(`🧪 Testing Composio API key for user: ${userId}`)
      console.log(`🔑 Key format: ${apiKey.substring(0, 8)}...`)
      
      // Test with Composio auth endpoint
      const response = await fetch('https://backend.composio.dev/api/v1/auth/whoami', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      })
      
      if (!response.ok) {
        console.log(`❌ Composio API validation failed: ${response.status}`)
        
        if (response.status === 401) {
          return NextResponse.json({ 
            success: false, 
            message: '🔑 Invalid API key. Please check your Composio API key.' 
          }, { status: 400 })
        }
        
        return NextResponse.json({ 
          success: false, 
          message: `🔧 Composio API error (${response.status}). Please try again.` 
        }, { status: 400 })
      }
      
      const userData = await response.json()
      
      // Get available apps/tools for this user
      let availableApps = []
      try {
        const appsResponse = await fetch('https://backend.composio.dev/api/v1/integrations', {
          headers: { 'Authorization': `Bearer ${apiKey}` }
        })
        
        if (appsResponse.ok) {
          const appsData = await appsResponse.json()
          availableApps = appsData.items || []
        }
      } catch (error) {
        console.warn('Could not fetch user apps:', error)
      }
      
      console.log(`✅ Composio validation successful for: ${userData.email || userData.user_email || 'user'}`)
      
      return NextResponse.json({ 
        success: true, 
        message: `✅ Successfully connected to Composio!`,
        userInfo: {
          email: userData.email || userData.user_email,
          userId: userData.id || userData.user_id,
          connectedApps: availableApps.length
        },
        availableApps: availableApps.slice(0, 10).map((app: any) => app.appName || app.name),
        totalApps: availableApps.length
      })
      
    } catch (networkError) {
      console.error('Network error testing Composio API:', networkError)
      
      // Fallback: Basic format validation if API is unreachable
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
      
      return NextResponse.json({ 
        success: true, 
        message: '⚠️ API key format looks valid, but could not verify with Composio (network issue)',
        fallback: true
      })
    }
    
  } catch (error) {
    console.error('Error testing Composio connection:', error)
    return NextResponse.json({ 
      success: false, 
      message: 'Failed to test connection. Please try again.' 
    }, { status: 500 })
  }
} 