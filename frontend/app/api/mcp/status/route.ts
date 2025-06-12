import { NextRequest, NextResponse } from 'next/server'

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000'

export async function GET(request: NextRequest) {
  try {
    console.log(`📊 Checking MCP server status...`)
    console.log(`🔗 Backend URL: ${BACKEND_URL}`)
    
    // Get current MCP server status
    const statusResponse = await fetch(`${BACKEND_URL}/mcp/servers`, {
      method: 'GET',
      headers: {
        'Cache-Control': 'no-cache'
      }
    })
    
    if (!statusResponse.ok) {
      console.error(`❌ Failed to get server status: ${statusResponse.status}`)
      return NextResponse.json({ 
        success: false, 
        message: 'Failed to connect to backend',
        backendStatus: statusResponse.status
      }, { status: 500 })
    }
    
    const statusData = await statusResponse.json()
    const composioServer = statusData.servers?.['composio-tools']
    
    console.log(`📊 Current MCP servers:`, Object.keys(statusData.servers || {}))
    console.log(`📊 Composio server status:`, composioServer)
    
    // Check if composio-tools server exists and is connected
    if (!composioServer) {
      return NextResponse.json({ 
        success: true,
        connected: false,
        message: 'Composio MCP server not configured',
        serverExists: false,
        availableServers: Object.keys(statusData.servers || {})
      })
    }
    
    const isConnected = composioServer.status === 'connected'
    const toolCount = composioServer.tool_count || 0
    
    return NextResponse.json({ 
      success: true,
      connected: isConnected,
      message: isConnected 
        ? `Connected with ${toolCount} tools available` 
        : `Server exists but not connected (status: ${composioServer.status})`,
      serverExists: true,
      serverStatus: composioServer.status,
      toolCount: toolCount,
      lastError: composioServer.last_error || null,
      capabilities: composioServer.capabilities || 0
    })
    
  } catch (error) {
    console.error('❌ Error checking MCP status:', error)
    return NextResponse.json({ 
      success: false, 
      message: 'Failed to check MCP status',
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
} 