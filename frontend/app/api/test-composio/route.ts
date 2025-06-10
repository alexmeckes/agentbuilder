import { NextRequest, NextResponse } from 'next/server'
import { ComposioErrorHandler, RetryManager } from '../../lib/composio-error-handler'

export async function POST(request: NextRequest) {
  try {
    const { apiKey, userId } = await request.json()
    
    if (!apiKey) {
      return NextResponse.json({ 
        success: false, 
        message: 'API key is required' 
      }, { status: 400 })
    }

    console.log(`🧪 Testing Composio API key directly for user: ${userId}`)
    console.log(`🔑 Key format: ${apiKey.substring(0, 8)}...`)
    
    // Basic format validation first
    if (apiKey.length < 8) {
      return NextResponse.json({ 
        success: false, 
        message: 'API key appears to be too short' 
      }, { status: 400 })
    }

    // Accept various formats: alphanumeric, dashes, underscores
    const isValidFormat = /^[a-zA-Z0-9_-]{8,}$/.test(apiKey)
    if (!isValidFormat) {
      return NextResponse.json({ 
        success: false, 
        message: 'API key contains invalid characters' 
      }, { status: 400 })
    }

    // Test Composio API with enhanced error handling
    const testComposioConnection = async () => {
      const composioEndpoints = [
        'https://backend.composio.dev/api/v1/connectedAccounts',
        'https://backend.composio.dev/api/v2/connectedAccounts',
        'https://backend.composio.dev/api/v1/apps'
      ]
      
      for (const endpoint of composioEndpoints) {
        try {
          console.log(`🔍 Testing endpoint: ${endpoint}`)
          
          const response = await fetch(endpoint, {
            method: 'GET',
            headers: {
              'x-api-key': apiKey,
              'Content-Type': 'application/json'
            },
            signal: AbortSignal.timeout(10000) // 10 second timeout
          })
          
          if (!response.ok) {
            // Create error object with status for proper classification
            const error = new Error(`HTTP ${response.status}`)
            ;(error as any).status = response.status
            ;(error as any).statusCode = response.status
            throw error
          }
          
          const data = await response.json()
          console.log(`✅ Composio API success with: ${endpoint}`)
          
          // Extract connected accounts/apps
          const connectedApps = data.items && Array.isArray(data.items) 
            ? data.items.map((item: any) => 
                item.appName || item.name || item.slug
              ).filter(Boolean).slice(0, 10)
            : []
          
          return { success: true, connectedApps, endpoint }
        } catch (error) {
          console.log(`❌ Error with ${endpoint}:`, error)
          // If this is the last endpoint, throw the error to be handled
          if (endpoint === composioEndpoints[composioEndpoints.length - 1]) {
            throw error
          }
          // Otherwise continue to next endpoint
        }
      }
      
      // If we get here, all endpoints failed
      throw new Error('All Composio endpoints failed')
    }
    
    // Execute with retry logic
    let testResult
    try {
      testResult = await RetryManager.executeWithRetry(testComposioConnection, {
        maxRetries: 2,
        baseDelay: 1000,
        maxDelay: 5000,
        backoffMultiplier: 2
      })
    } catch (error) {
      const composioError = ComposioErrorHandler.classifyError(error)
      console.error('🚨 Composio connection test failed:', composioError)
      
      return NextResponse.json({ 
        success: false, 
        message: composioError.message,
        suggestedAction: composioError.suggestedAction,
        errorType: composioError.type,
        retryable: composioError.retryable,
        errorDetails: {
          errorCode: composioError.errorCode,
          statusCode: composioError.statusCode,
          timestamp: composioError.timestamp
        }
      }, { status: 400 })
    }
    
    // Success with real Composio API
    return NextResponse.json({ 
      success: true, 
      message: `✅ Successfully connected to Composio! Found ${testResult.connectedApps.length} connected apps.`,
      userInfo: {
        apiKeyValid: true,
        connectedApps: testResult.connectedApps.length,
        validationMethod: 'direct_composio_api_with_retry'
      },
      availableApps: testResult.connectedApps.length > 0 ? testResult.connectedApps : ['GitHub', 'Googledocs', 'Gmail'],
      totalApps: testResult.connectedApps.length > 0 ? testResult.connectedApps.length : 3,
      source: 'direct_composio_api',
      endpoint: testResult.endpoint,
      note: testResult.connectedApps.length > 0 
        ? 'Connected apps discovered from your Composio account'
        : 'API key validated. Connect apps in your Composio dashboard to see them here.'
    })
    
  } catch (error) {
    console.error('Error testing Composio connection:', error)
    return NextResponse.json({ 
      success: false, 
      message: 'Failed to test connection. Please try again.' 
    }, { status: 500 })
  }
} 