import { NextRequest, NextResponse } from 'next/server'

const BACKEND_URL = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000'

export async function POST(request: NextRequest) {
  try {
    console.log(`🔄 Starting force-reconnect API call`)
    console.log(`🔗 Backend URL: ${BACKEND_URL}`)
    
    // Step 0: Parse request body with error handling
    let userId, apiKey
    try {
      const body = await request.json()
      userId = body.userId
      apiKey = body.apiKey
      console.log(`📝 Request parsed - userId: ${userId}, hasApiKey: ${!!apiKey}`)
    } catch (parseError) {
      console.error(`❌ Failed to parse request body:`, parseError)
      return NextResponse.json({ 
        success: false, 
        message: 'Invalid request body' 
      }, { status: 400 })
    }
    
    if (!apiKey) {
      console.log(`❌ No API key provided`)
      return NextResponse.json({ 
        success: false, 
        message: 'API key is required' 
      }, { status: 400 })
    }

    console.log(`🔄 Forcing MCP Composio server reconnection for user: ${userId}`)
    
    // Step 1: Remove the existing server
    try {
      console.log(`🗑️ Step 1: Removing existing server...`)
      const controller = new AbortController()
      setTimeout(() => controller.abort(), 5000)
      
      const removeResponse = await fetch(`${BACKEND_URL}/mcp/servers/composio-tools`, {
        method: 'DELETE',
        signal: controller.signal
      })
      console.log(`🗑️ Remove server response: ${removeResponse.status}`)
    } catch (error) {
      console.log(`⚠️ Remove server failed (expected): ${error}`)
    }

    // Step 2: Wait a moment
    console.log(`⏳ Step 2: Waiting 2 seconds...`)
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    // Step 3: Create a new server configuration
    console.log(`🔧 Step 3: Preparing server config...`)
    const serverConfig = {
      id: "composio-tools",
      name: "Composio Universal Tools",
      description: "Access to popular tools (GitHub, Slack, Notion, Gmail, Linear)",
      command: ["python", "-m", "composio_mcp_bridge"],
      args: [],
      env: {
        COMPOSIO_API_KEY: apiKey,
        USER_ID: userId,
        ENABLED_TOOLS: "github_star_repo,googledocs_create_doc,gmail_send_email",
        ENCRYPTION_ENABLED: "false"
      }
    }
    
    console.log(`🔧 Creating server with config:`, JSON.stringify(serverConfig, null, 2))
    console.log(`🌐 POST URL will be: ${BACKEND_URL}/mcp/servers`)
    console.log(`🚀 Step 4: Making POST request...`)
    
    const createController = new AbortController()
    setTimeout(() => {
      console.log(`⏰ AbortController timeout hit after 60 seconds`)
      createController.abort()
    }, 60000) // Increased to 60 seconds for Render cold starts
    
    let createResponse: Response
    try {
      createResponse = await fetch(`${BACKEND_URL}/mcp/servers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(serverConfig),
        signal: createController.signal
      })
      console.log(`📡 POST request completed with status: ${createResponse.status}`)
    } catch (fetchError: any) {
      console.error(`❌ POST request failed:`, fetchError)
      console.error(`❌ Error name: ${fetchError.name}`)
      console.error(`❌ Error message: ${fetchError.message}`)
      
      if (fetchError.name === 'AbortError') {
        return NextResponse.json({ 
          success: false, 
          message: 'POST request timed out after 60 seconds',
          error: 'Timeout during server creation'
        }, { status: 408 })
      }
      
      return NextResponse.json({ 
        success: false, 
        message: 'POST request failed',
        error: fetchError.message
      }, { status: 500 })
    }
    
    console.log(`📊 Step 5: Processing response...`)
    if (createResponse.ok) {
      console.log(`✅ Server creation successful, parsing response...`)
      let result
      try {
        result = await createResponse.json()
        console.log(`✅ New MCP server created: ${result.message}`)
      } catch (jsonError) {
        console.error(`❌ Failed to parse success response JSON:`, jsonError)
        return NextResponse.json({ 
          success: false, 
          message: 'Server created but response parsing failed'
        }, { status: 500 })
      }
      
      // Step 5: Wait for connection and test
      console.log(`⏳ Step 6: Waiting 3 seconds for connection...`)
      await new Promise(resolve => setTimeout(resolve, 3000))
      
      // Step 6: Check status
      console.log(`📊 Step 7: Checking server status...`)
      try {
        const statusResponse = await fetch(`${BACKEND_URL}/mcp/servers`)
        if (statusResponse.ok) {
          const statusData = await statusResponse.json()
          const composioServer = statusData.servers?.['composio-tools']
          
          console.log(`📊 Server status after creation:`, composioServer)
          
          return NextResponse.json({ 
            success: true, 
            message: 'Composio MCP server reconnected successfully',
            serverStatus: composioServer?.status || 'unknown',
            toolCount: composioServer?.tool_count || 0,
            userId: userId
          })
        } else {
          console.error(`❌ Status check failed: ${statusResponse.status}`)
          return NextResponse.json({ 
            success: true, 
            message: 'Server created but status check failed',
            userId: userId
          })
        }
      } catch (statusError) {
        console.error(`❌ Status check error:`, statusError)
        return NextResponse.json({ 
          success: true, 
          message: 'Server created but status check failed',
          userId: userId
        })
      }
    } else {
      console.error(`❌ Server creation failed with status: ${createResponse.status}`)
      let errorText
      let errorData
      
      try {
        errorText = await createResponse.text()
        console.error(`❌ Error response body: ${errorText}`)
        
        try {
          errorData = JSON.parse(errorText)
        } catch {
          errorData = { detail: errorText || 'Unknown error' }
        }
      } catch (textError) {
        console.error(`❌ Failed to read error response:`, textError)
        errorData = { detail: 'Failed to read error response' }
      }
      
      return NextResponse.json({ 
        success: false, 
        message: errorData?.detail || 'Failed to create MCP server',
        debugInfo: {
          status: createResponse.status,
          response: errorText || 'No response body'
        }
      }, { status: createResponse.status })
    }
    
  } catch (error) {
    console.error('❌ Unexpected error in force-reconnect:', error)
    console.error('❌ Error stack:', error instanceof Error ? error.stack : 'No stack trace')
    return NextResponse.json({ 
      success: false, 
      message: 'Failed to force reconnection',
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 })
  }
} 