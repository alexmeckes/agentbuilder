import { NextRequest, NextResponse } from 'next/server'

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000'

export async function POST(request: NextRequest) {
  try {
    const { userId, apiKey, encryptedApiKey, keyId, salt, enabledTools, encrypted } = await request.json()
    
    if (!apiKey && !encryptedApiKey) {
      return NextResponse.json({ 
        success: false, 
        message: 'API key or encrypted API key is required' 
      }, { status: 400 })
    }

    console.log(`🔧 Updating MCP Composio server for user: ${userId} (encrypted: ${encrypted})`)
    console.log(`🔗 Backend URL: ${BACKEND_URL}`)
    
    // Prepare environment variables based on encryption status
    const env = encrypted ? {
      // For encrypted keys, store the encrypted data and metadata
      ENCRYPTED_COMPOSIO_KEY: encryptedApiKey,
      KEY_ID: keyId,
      SALT: salt,
      USER_ID: userId,
      ENABLED_TOOLS: enabledTools ? enabledTools.join(',') : '',
      ENCRYPTION_ENABLED: 'true'
    } : {
      // For legacy unencrypted keys
      COMPOSIO_API_KEY: apiKey,
      USER_ID: userId,
      ENABLED_TOOLS: enabledTools ? enabledTools.join(',') : '',
      ENCRYPTION_ENABLED: 'false'
    }
    
    // Prepare the complete server configuration for update
    const serverConfig = {
      id: "composio-tools",
      name: "Composio Universal Tools",
      description: "Access to popular tools (GitHub, Slack, Notion, Gmail, Linear)",
      command: ["python", "-m", "composio_mcp_bridge"], // Fixed: command as array
      args: [], // Fixed: empty args array
      env: env
    }
    
    console.log(`🔧 Updating server with config:`, JSON.stringify(serverConfig, null, 2))
    
    // Update the Composio MCP server configuration with timeout
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 15000) // 15 second timeout (increased since backend is now non-blocking)
    
    try {
      const updateResponse = await fetch(`${BACKEND_URL}/mcp/servers/composio-tools`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(serverConfig), // Send complete server config, not just env
        signal: controller.signal
      })
      
      clearTimeout(timeoutId)
      
      console.log(`📡 Update response status: ${updateResponse.status}`)
    
      if (updateResponse.ok) {
        const result = await updateResponse.json()
        console.log(`✅ MCP Composio server updated: ${result.message}`)
        
        return NextResponse.json({ 
          success: true, 
          message: 'Composio MCP server updated successfully',
          serverStatus: result.status,
          userId: userId
        })
      } else {
        const errorText = await updateResponse.text()
        console.error(`❌ Failed to update MCP server: ${updateResponse.status}`)
        console.error(`❌ Error response body: ${errorText}`)
        
        let errorData
        try {
          errorData = JSON.parse(errorText)
        } catch {
          errorData = { detail: errorText || 'Unknown error' }
        }
        
        return NextResponse.json({ 
          success: false, 
          message: errorData.detail || 'Failed to update MCP server',
          debugInfo: {
            status: updateResponse.status,
            response: errorText
          }
        }, { status: updateResponse.status })
      }
    } catch (fetchError: any) {
      clearTimeout(timeoutId)
      
      if (fetchError.name === 'AbortError') {
        console.error('❌ MCP server update timed out')
        return NextResponse.json({ 
          success: false, 
          message: 'MCP server update timed out - please try again'
        }, { status: 408 })
      }
      
      console.error('❌ MCP server update failed:', fetchError)
      return NextResponse.json({ 
        success: false, 
        message: 'Failed to connect to MCP server',
        error: fetchError.message
      }, { status: 500 })
    }
    
  } catch (error) {
    console.error('Error updating MCP Composio server:', error)
    return NextResponse.json({ 
      success: false, 
      message: 'Failed to update MCP server configuration',
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
} 