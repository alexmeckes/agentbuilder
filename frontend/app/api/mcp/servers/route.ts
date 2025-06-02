import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  try {
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:8000';
    
    const response = await fetch(`${backendUrl}/mcp/servers`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Backend responded with status: ${response.status}`);
    }

    const data = await response.json();
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching MCP servers:', error);
    
    return NextResponse.json({
      servers: {},
      error: 'Backend unavailable'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:8000';
    const body = await request.json();
    
    const response = await fetch(`${backendUrl}/mcp/servers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorData = await response.json();
      return NextResponse.json(errorData, { status: response.status });
    }

    const data = await response.json();
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error adding MCP server:', error);
    
    return NextResponse.json({
      detail: 'Failed to add server'
    }, { status: 500 });
  }
} 