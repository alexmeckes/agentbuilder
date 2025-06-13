import { NextRequest, NextResponse } from 'next/server'

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000'

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Proxying workflow analytics request to backend')
    
    // Extract user ID from request headers
    const userId = request.headers.get('x-user-id') || 'anonymous'
    console.log('📊 Analytics request for user:', userId)

    // Try with the user's ID first, then fall back to anonymous if needed
    let backendResponse = await fetch(`${BACKEND_URL}/api/analytics/workflows?userId=${userId}&_t=${Date.now()}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'X-User-Id': userId,
      },
      cache: 'no-store'
    })
    
    // If we got a successful response but no executions, try anonymous
    if (backendResponse.ok) {
      const tempResult = await backendResponse.json()
      if (tempResult.total_executions === 0 && userId !== 'anonymous') {
        console.log('📊 No executions found for user, trying anonymous...')
        backendResponse = await fetch(`${BACKEND_URL}/api/analytics/workflows?userId=anonymous&_t=${Date.now()}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'X-User-Id': 'anonymous',
          },
          cache: 'no-store'
        })
      } else {
        // Recreate response since we already consumed it
        backendResponse = new Response(JSON.stringify(tempResult), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        })
      }
    }

    console.log('Backend analytics response status:', backendResponse.status)

    if (!backendResponse.ok) {
      const errorText = await backendResponse.text()
      console.error('Backend analytics response error:', errorText)
      return NextResponse.json(
        { error: `Backend error: ${backendResponse.status} - ${errorText}` },
        { status: backendResponse.status }
      )
    }

    const result = await backendResponse.json()
    console.log('✅ Backend analytics result:', {
      total_workflows: result.total_workflows,
      total_executions: result.total_executions,
      workflows: result.workflows,
      raw_result: JSON.stringify(result)
    })

    // Transform backend response to match frontend expectations
    const workflows = result.workflows || {}
    console.log('🔄 Transforming workflows:', Object.keys(workflows))
    const workflowArray = Object.entries(workflows).map(([name, data]: [string, any]) => ({
      workflow_id: name.toLowerCase().replace(/\s+/g, '-'),
      workflow_name: name,
      workflow_category: 'user', // Default category
      total_executions: data.count || 0,
      successful_executions: data.successful || 0,
      failed_executions: data.failed || 0,
      average_duration_ms: data.avg_execution_time || 0,
      average_cost: data.total_cost / (data.count || 1),
      total_cost: data.total_cost || 0,
      last_executed: new Date().toISOString(), // Placeholder
      performance_trend: 'stable' as const,
      success_rate: data.count > 0 ? Math.round((data.successful / data.count) * 100) : 0
    }))

    // Sort by total executions to get most used
    const sortedWorkflows = [...workflowArray].sort((a, b) => b.total_executions - a.total_executions)

    // Calculate category breakdown
    const categoryBreakdown: Record<string, number> = {}
    workflowArray.forEach(workflow => {
      const category = workflow.workflow_category
      categoryBreakdown[category] = (categoryBreakdown[category] || 0) + workflow.total_executions
    })

    // Calculate performance overview
    const totalCost = workflowArray.reduce((sum, w) => sum + w.total_cost, 0)
    const totalExecutions = result.total_executions || 0
    const totalDuration = workflowArray.reduce((sum, w) => sum + (w.average_duration_ms * w.total_executions), 0)

    const transformedResult = {
      total_workflows: workflowArray.length,
      total_executions: totalExecutions,
      most_used_workflows: sortedWorkflows.slice(0, 5),
      all_workflows: workflowArray,
      category_breakdown: categoryBreakdown,
      performance_overview: {
        total_cost: totalCost,
        total_tokens: 0, // Not available in backend yet
        total_duration_ms: totalDuration,
        average_cost_per_execution: totalExecutions > 0 ? totalCost / totalExecutions : 0,
        average_tokens_per_execution: 0, // Not available in backend yet
        average_duration_per_execution: totalExecutions > 0 ? totalDuration / totalExecutions : 0
      },
      recent_executions: result.recent_executions || []
    }

    console.log('🔄 Transformed analytics data:', {
      total_workflows: transformedResult.total_workflows,
      total_executions: transformedResult.total_executions,
      all_workflows_count: transformedResult.all_workflows.length
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
    console.error('Analytics API proxy error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
} 