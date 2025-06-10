import { NextRequest, NextResponse } from 'next/server'

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000'

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
    
    // Update the Composio MCP server configuration with timeout
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 8000) // 8 second timeout
    
    try {
      const updateResponse = await fetch(`${BACKEND_URL}/mcp/servers/composio-tools`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ env }),
        signal: controller.signal
      })
      
      clearTimeout(timeoutId)
    
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
        const errorData = await updateResponse.json().catch(() => ({ detail: 'Unknown error' }))
        console.error(`❌ Failed to update MCP server: ${updateResponse.status} - ${errorData.detail}`)
        
        return NextResponse.json({ 
          success: false, 
          message: errorData.detail || 'Failed to update MCP server'
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
        message: 'Failed to connect to MCP server'
      }, { status: 500 })
    }
    
  } catch (error) {
    console.error('Error updating MCP Composio server:', error)
    return NextResponse.json({ 
      success: false, 
      message: 'Failed to update MCP server configuration' 
    }, { status: 500 })
  }
} 