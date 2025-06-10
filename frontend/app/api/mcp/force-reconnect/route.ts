import { NextRequest, NextResponse } from 'next/server'

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000'

export async function POST(request: NextRequest) {
  try {
    const { userId, apiKey } = await request.json()
    
    if (!apiKey) {
      return NextResponse.json({ 
        success: false, 
        message: 'API key is required' 
      }, { status: 400 })
    }

    console.log(`🔄 Forcing MCP Composio server reconnection for user: ${userId}`)
    console.log(`🔗 Backend URL: ${BACKEND_URL}`)
    
    // Step 1: Remove the existing server
    try {
      const controller = new AbortController()
      setTimeout(() => controller.abort(), 5000)
      
      const removeResponse = await fetch(`${BACKEND_URL}/mcp/servers/composio-tools`, {
        method: 'DELETE',
        signal: controller.signal
      })
      console.log(`🗑️ Removed existing server: ${removeResponse.status}`)
    } catch (error) {
      console.log(`⚠️ Remove server failed (expected): ${error}`)
    }

    // Step 2: Wait a moment
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    // Step 3: Create a new server configuration
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
    
    const createController = new AbortController()
    setTimeout(() => createController.abort(), 10000)
    
    const createResponse = await fetch(`${BACKEND_URL}/mcp/servers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(serverConfig),
      signal: createController.signal
    })
    
    console.log(`📡 Create response status: ${createResponse.status}`)
    
    if (createResponse.ok) {
      const result = await createResponse.json()
      console.log(`✅ New MCP server created: ${result.message}`)
      
      // Step 4: Wait for connection and test
      await new Promise(resolve => setTimeout(resolve, 3000))
      
      // Step 5: Check status
      const statusResponse = await fetch(`${BACKEND_URL}/mcp/servers`)
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
      const errorText = await createResponse.text()
      console.error(`❌ Failed to create MCP server: ${createResponse.status}`)
      console.error(`❌ Error response body: ${errorText}`)
      
      let errorData
      try {
        errorData = JSON.parse(errorText)
      } catch {
        errorData = { detail: errorText || 'Unknown error' }
      }
      
      return NextResponse.json({ 
        success: false, 
        message: errorData.detail || 'Failed to create MCP server',
        debugInfo: {
          status: createResponse.status,
          response: errorText
        }
      }, { status: createResponse.status })
    }
    
  } catch (error) {
    console.error('Error forcing MCP Composio server reconnection:', error)
    return NextResponse.json({ 
      success: false, 
      message: 'Failed to force reconnection',
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
} 