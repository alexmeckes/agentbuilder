import { NextRequest, NextResponse } from 'next/server'

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000'

export async function POST(request: NextRequest) {
  try {
    const { userId, apiKey, enabledTools } = await request.json()
    
    if (!apiKey) {
      return NextResponse.json({ 
        success: false, 
        message: 'API key is required' 
      }, { status: 400 })
    }

    console.log(`🔧 Updating MCP Composio server for user: ${userId}`)
    
    // Update the Composio MCP server configuration
    const updateResponse = await fetch(`${BACKEND_URL}/mcp/servers/composio-tools`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        env: {
          COMPOSIO_API_KEY: apiKey,
          USER_ID: userId,
          ENABLED_TOOLS: enabledTools ? enabledTools.join(',') : ''
        }
      })
    })
    
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
    
  } catch (error) {
    console.error('Error updating MCP Composio server:', error)
    return NextResponse.json({ 
      success: false, 
      message: 'Failed to update MCP server configuration' 
    }, { status: 500 })
  }
} 