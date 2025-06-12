import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
    
    const body = await request.json();
    
    const response = await fetch(`${backendUrl}/ai/tool-recommendations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`Backend responded with status: ${response.status}`);
    }

    const data = await response.json();
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error getting AI tool recommendations:', error);
    
    // Return fallback recommendations if backend is unavailable
    return NextResponse.json({
      success: false,
      error: 'AI tool recommendations temporarily unavailable',
      recommendations: [],
      fallback: true
    });
  }
} 