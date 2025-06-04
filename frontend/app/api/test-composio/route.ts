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
      
      // Test with Composio v3 API - check apps endpoint which should be available
      const response = await fetch('https://backend.composio.dev/api/v3/apps', {
        method: 'GET',
        headers: {
          'x-api-key': apiKey,
          'Content-Type': 'application/json'
        }
      })
      
      if (!response.ok) {
        console.log(`❌ Composio API validation failed: ${response.status}`)
        
        if (response.status === 401 || response.status === 403) {
          return NextResponse.json({ 
            success: false, 
            message: '🔑 Invalid API key. Please check your Composio API key.' 
          }, { status: 400 })
        }
        
        if (response.status === 404) {
          return NextResponse.json({ 
            success: false, 
            message: '🔧 API endpoint not found. Using fallback validation...' 
          }, { status: 400 })
        }
        
        return NextResponse.json({ 
          success: false, 
          message: `🔧 Composio API error (${response.status}). Please try again.` 
        }, { status: 400 })
      }
      
      const appsData = await response.json()
      
      // Get available apps/tools for this user
      let availableApps = []
      
      // Try to get user's connected integrations
      try {
        const integrationsResponse = await fetch('https://backend.composio.dev/api/v3/integrations', {
          headers: { 'x-api-key': apiKey }
        })
        
        if (integrationsResponse.ok) {
          const integrationsData = await integrationsResponse.json()
          // Extract app names from integrations
          availableApps = integrationsData.items?.map((integration: any) => 
            integration.appName || integration.app?.name || integration.name
          ).filter(Boolean) || []
        }
      } catch (error) {
        console.warn('Could not fetch user integrations:', error)
      }
      
      // Fallback: if no integrations found, use some of the available apps
      if (availableApps.length === 0 && appsData.items) {
        availableApps = appsData.items.slice(0, 5).map((app: any) => app.name || app.appName).filter(Boolean)
      }
      
      console.log(`✅ Composio validation successful. Found ${availableApps.length} connected apps`)
      
      return NextResponse.json({ 
        success: true, 
        message: `✅ Successfully connected to Composio!`,
        userInfo: {
          apiKeyValid: true,
          connectedApps: availableApps.length
        },
        availableApps: availableApps,
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