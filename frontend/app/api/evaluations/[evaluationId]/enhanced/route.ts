import { NextRequest, NextResponse } from 'next/server'

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000'

export async function GET(
  request: NextRequest,
  { params }: { params: { evaluationId: string } }
) {
  try {
    const { evaluationId } = params
    console.log('🔍 Proxying enhanced evaluation request for:', evaluationId)

    // For now, return mock data until backend endpoint is implemented
    // This would normally fetch from backend /evaluations/{evaluationId}/enhanced
    
    const mockData = {
      result: {
        execution_id: evaluationId,
        overall_score: 0.85,
        final_output_evaluation: {
          score: 0.9,
          total_points: 10,
          earned_points: 9,
          results: [
            {
              passed: true,
              reason: "The output provides comprehensive information about grizzly bear locations",
              criteria: "The workflow produced a clear and comprehensive final result",
              points: 3
            },
            {
              passed: true,
              reason: "The response directly addresses the question about bear spotting locations",
              criteria: "The output directly addresses the original request",
              points: 2
            }
          ]
        },
        step_evaluations: [
          {
            step_name: "Input Processing",
            node_id: "input-1",
            step_score: 1.0,
            duration_ms: 50,
            cost: 0,
            evaluation_results: [
              {
                passed: true,
                reason: "Input was properly received and processed",
                criteria: "This step produced meaningful output that contributes to the workflow",
                points: 2
              }
            ]
          },
          {
            step_name: "Research Agent",
            node_id: "agent-1",
            step_score: 0.8,
            duration_ms: 2500,
            cost: 0.0035,
            evaluation_results: [
              {
                passed: true,
                reason: "Agent gathered relevant information about Yellowstone locations",
                criteria: "Gathered comprehensive and relevant information",
                points: 3
              },
              {
                passed: false,
                reason: "Could have included more diverse sources",
                criteria: "Used appropriate sources and search strategies",
                points: 2
              }
            ]
          }
        ],
        flow_evaluation: {
          flow_coherence: 0.9,
          information_preservation: 0.95,
          efficiency: 0.85,
          transition_quality: []
        },
        step_scores: [1.0, 0.8],
        bottleneck_analysis: [
          "Research Agent took 2.5s - consider caching common queries"
        ],
        performance_metrics: {
          total_duration_ms: 2550,
          total_cost: 0.0035,
          efficiency_score: 0.85
        }
      }
    }

    return NextResponse.json(mockData)

  } catch (error) {
    console.error('Enhanced evaluation API proxy error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}