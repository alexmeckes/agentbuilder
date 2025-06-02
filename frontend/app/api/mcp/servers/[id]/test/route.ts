import { NextRequest, NextResponse } from 'next/server';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:8000';
    const { id } = params;
    
    const response = await fetch(`${backendUrl}/mcp/servers/${id}/test`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      return NextResponse.json(errorData, { status: response.status });
    }

    const data = await response.json();
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error testing MCP server:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to test server connection'
    }, { status: 500 });
  }
} 