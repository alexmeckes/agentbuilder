import { NextRequest, NextResponse } from 'next/server'

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000'

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Proxying insights request to backend')
    
    // Extract user ID from request headers
    const userId = request.headers.get('x-user-id') || 'anonymous'
    console.log('📈 Insights request for user:', userId)

    // Forward the request to the backend with cache-busting and user ID
    const backendResponse = await fetch(`${BACKEND_URL}/api/analytics/insights?_t=${Date.now()}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'X-User-Id': userId,
      },
      cache: 'no-store'
    })

    console.log('Backend insights response status:', backendResponse.status)

    if (!backendResponse.ok) {
      const errorText = await backendResponse.text()
      console.error('Backend insights response error:', errorText)
      return NextResponse.json(
        { error: `Backend error: ${backendResponse.status} - ${errorText}` },
        { status: backendResponse.status }
      )
    }

    const result = await backendResponse.json()
    console.log('✅ Backend insights result:', result)

    // Transform backend response to match frontend expectations
    const transformedResult = {
      insights: [],
      recommendations: [],
      generated_at: new Date().toISOString()
    }

    // Convert performance trends to insights
    if (result.performance_trends) {
      transformedResult.insights.push({
        type: 'performance',
        title: 'Performance Trend',
        description: result.performance_trends.recommendation || 'Your workflows are performing well',
        severity: result.performance_trends.trend === 'improving' ? 'info' : 'warning'
      })
    }

    // Convert cost optimization to insights
    if (result.cost_optimization) {
      if (result.cost_optimization.cost_per_execution > 0.5) {
        transformedResult.insights.push({
          type: 'cost',
          title: 'High Cost per Execution',
          description: `Average cost per execution is $${result.cost_optimization.cost_per_execution.toFixed(2)}. Consider optimizing costly operations.`,
          severity: 'warning'
        })
      }
    }

    // Convert error patterns to insights
    if (result.error_patterns && result.error_patterns.error_rate > 0.1) {
      transformedResult.insights.push({
        type: 'error',
        title: 'Error Rate Alert',
        description: `${(result.error_patterns.error_rate * 100).toFixed(1)}% of executions are failing. Review error logs for patterns.`,
        severity: 'error'
      })
    }

    // Add some generic recommendations if none exist
    if (transformedResult.insights.length === 0) {
      transformedResult.insights.push({
        type: 'general',
        title: 'Analytics Active',
        description: 'Your workflow analytics are being tracked. Execute more workflows to see detailed insights.',
        severity: 'info'
      })
    }

    // Add recommendations
    transformedResult.recommendations.push({
      type: 'optimization',
      title: 'Monitor Performance',
      description: 'Keep an eye on execution times and costs as you scale your workflows.',
      action: 'View performance metrics regularly'
    })

    console.log('🔄 Transformed insights data:', {
      insights: transformedResult.insights.length,
      recommendations: transformedResult.recommendations.length
    })

    // Return the transformed response with no-cache headers
    return NextResponse.json(transformedResult, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
        'Pragma': 'no-cache',
        'Expires': '0',
      }
    })

  } catch (error) {
    console.error('Insights API proxy error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
} 