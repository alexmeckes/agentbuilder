import { NextRequest, NextResponse } from 'next/server'

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000'

export async function POST(request: NextRequest) {
  try {
    console.log(`🔄 Starting force-reconnect API call`)
    console.log(`🔗 Backend URL: ${BACKEND_URL}`)
    
    // Step 0: Parse request body with error handling
    let userId: string, apiKey: string
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
    
    // Step 1: Remove the existing server (if any)
    try {
      console.log(`🗑️ Step 1: Removing existing server...`)
      const controller = new AbortController()
      setTimeout(() => controller.abort(), 5000)
      
      const removeResponse = await fetch(`${BACKEND_URL}/api/mcp/servers/composio-tools`, {
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
    
    // Step 3: Update Composio configuration directly (bypass MCP protocol)
    console.log(`🔧 Step 3: Updating Composio configuration directly...`)
    
    try {
      // Set environment variables for direct integration
      const configResponse = await fetch(`${BACKEND_URL}/api/composio/update-config`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId: userId,
          apiKey: apiKey,
          enabled: true
        }),
        signal: AbortSignal.timeout(10000) // 10 second timeout
      })
      
      if (configResponse.ok) {
        console.log(`✅ Composio configuration updated successfully`)
        
        // Test the connection
        console.log(`📊 Step 4: Testing Composio connection...`)
        const testResponse = await fetch(`${BACKEND_URL}/api/composio/test-connection`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            userId: userId,
            apiKey: apiKey
          }),
          signal: AbortSignal.timeout(15000) // 15 second timeout
        })
        
        if (testResponse.ok) {
          const testResult = await testResponse.json()
          console.log(`✅ Composio connection test successful:`, testResult)
          
          return NextResponse.json({ 
            success: true, 
            message: 'Composio configuration updated successfully (direct integration)',
            serverStatus: 'connected',
            toolCount: testResult.toolCount || 0,
            connectedApps: testResult.connectedApps || 0,
            method: 'direct_integration',
            userId: userId
          })
        } else {
          console.log(`⚠️ Connection test failed but config was updated`)
          return NextResponse.json({ 
            success: true, 
            message: 'Configuration updated but connection test failed',
            serverStatus: 'configured',
            method: 'direct_integration',
            userId: userId
          })
        }
      } else {
        // Fallback: Try the old MCP approach as last resort
        console.log(`⚠️ Direct config update failed, trying MCP approach...`)
        return await createMCPServer()
      }
    } catch (error) {
      console.error(`❌ Direct config update failed:`, error)
      console.log(`🔄 Falling back to MCP approach...`)
      return await createMCPServer()
    }
    
    // Fallback function for MCP server creation
    async function createMCPServer() {
      console.log(`🔧 Creating MCP server as fallback...`)
      const serverConfig = {
        id: "composio-tools",
        name: "Composio Universal Tools", 
        description: "Access to popular tools (GitHub, Slack, Notion, Gmail, Linear)",
        command: ["python3", "composio_mcp_bridge.py"],
        args: [],
        env: {
          COMPOSIO_API_KEY: apiKey,
          USER_ID: userId,
          ENABLED_TOOLS: "github_star_repo,googledocs_create_doc,gmail_send_email",
          ENCRYPTION_ENABLED: "false"
        }
      }
      
      console.log(`🔧 Creating server with config:`, JSON.stringify(serverConfig, null, 2))
      
      const createController = new AbortController()
      setTimeout(() => {
        console.log(`⏰ MCP creation timeout hit after 30 seconds`)
        createController.abort()
      }, 30000) // Reduced timeout since this is fallback
      
      try {
        const createResponse = await fetch(`${BACKEND_URL}/mcp/servers`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(serverConfig),
          signal: createController.signal
        })
        
        if (createResponse.ok) {
          console.log(`✅ MCP server created successfully`)
          return NextResponse.json({ 
            success: true, 
            message: 'Composio MCP server created (fallback mode)',
            serverStatus: 'configured',
            method: 'mcp_fallback',
            userId: userId
          })
        } else {
          const errorText = await createResponse.text()
          console.error(`❌ MCP server creation failed: ${createResponse.status} - ${errorText}`)
          return NextResponse.json({ 
            success: false, 
            message: 'Both direct integration and MCP server creation failed',
            error: errorText
          }, { status: createResponse.status })
        }
      } catch (fetchError: any) {
        console.error(`❌ MCP server creation failed:`, fetchError)
        
        if (fetchError.name === 'AbortError') {
          return NextResponse.json({ 
            success: false, 
            message: 'MCP server creation timed out after 30 seconds',
            error: 'Timeout during fallback server creation'
          }, { status: 408 })
        }
        
        return NextResponse.json({ 
          success: false, 
          message: 'Both direct integration and MCP approaches failed',
          error: fetchError.message
        }, { status: 500 })
      }
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