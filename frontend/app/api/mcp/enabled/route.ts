import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:8000';
    
    const response = await fetch(`${backendUrl}/mcp/enabled`, {
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
    console.error('Error checking MCP status:', error);
    
    // Return default state if backend is unavailable
    return NextResponse.json({
      enabled: false,
      available: false,
      error: 'Backend unavailable'
    });
  }
} 