"use client"

import { useState, useEffect } from 'react'
import { Clock, DollarSign, Zap, Database, Activity, ChevronDown, ChevronRight } from 'lucide-react'

interface Span {
  name: string
  span_id: string | null
  trace_id: string | null
  start_time: number
  end_time: number
  duration_ms: number | null
  status: any
  attributes: Record<string, any>
  events: any[]
  kind: string
}

interface TraceData {
  final_output: string
  spans: Span[]
  metadata: Record<string, any>
  performance: {
    total_cost?: number
    total_tokens?: number
    total_token_count_prompt?: number
    total_token_count_completion?: number
    total_cost_prompt?: number
    total_cost_completion?: number
    total_duration_ms?: number
  }
}

interface TraceViewerProps {
  executionId: string | null
  onClose: () => void
}

export function TraceViewer({ executionId, onClose }: TraceViewerProps) {
  const [traceData, setTraceData] = useState<TraceData | null>(null)
  const [performanceData, setPerformanceData] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [expandedSpans, setExpandedSpans] = useState<Set<string>>(new Set())
  const [activeTab, setActiveTab] = useState<'overview' | 'spans' | 'performance'>('overview')

  useEffect(() => {
    if (executionId) {
      fetchTraceData()
    }
  }, [executionId])

  const fetchTraceData = async () => {
    if (!executionId) return
    
    setLoading(true)
    try {
      // Fetch trace data
      const traceResponse = await fetch(`http://localhost:8000/executions/${executionId}/trace`)
      if (traceResponse.ok) {
        const traceResult = await traceResponse.json()
        setTraceData(traceResult.trace)
      }

      // Fetch performance data
      const perfResponse = await fetch(`http://localhost:8000/executions/${executionId}/performance`)
      if (perfResponse.ok) {
        const perfResult = await perfResponse.json()
        setPerformanceData(perfResult)
      }
    } catch (error) {
      console.error('Failed to fetch trace data:', error)
    } finally {
      setLoading(false)
    }
  }

  const toggleSpanExpanded = (spanId: string) => {
    const newExpanded = new Set(expandedSpans)
    if (newExpanded.has(spanId)) {
      newExpanded.delete(spanId)
    } else {
      newExpanded.add(spanId)
    }
    setExpandedSpans(newExpanded)
  }

  const formatDuration = (ms: number | null) => {
    if (!ms) return 'N/A'
    if (ms < 1000) return `${Math.round(ms)}ms`
    return `${(ms / 1000).toFixed(2)}s`
  }

  const formatCost = (cost: number) => {
    return `$${cost.toFixed(6)}`
  }

  if (!executionId) {
    return (
      <div className="h-full flex items-center justify-center text-gray-500">
        <div className="text-center">
          <Activity className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>Select an execution to view its trace</p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="border-b p-4 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Execution Trace</h2>
          <p className="text-sm text-gray-600">ID: {executionId}</p>
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600"
        >
          ✕
        </button>
      </div>

      {/* Tabs */}
      <div className="border-b">
        <nav className="flex space-x-8 px-4">
          {[
            { id: 'overview', label: 'Overview', icon: Activity },
            { id: 'spans', label: 'Spans', icon: Database },
            { id: 'performance', label: 'Performance', icon: Zap }
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id as any)}
              className={`py-3 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                activeTab === id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </nav>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4">
        {activeTab === 'overview' && traceData && (
          <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="flex items-center">
                  <Clock className="w-5 h-5 text-blue-600 mr-2" />
                  <div>
                    <p className="text-sm text-blue-600">Duration</p>
                    <p className="font-semibold">{formatDuration(traceData.performance.total_duration_ms || null)}</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-green-50 p-4 rounded-lg">
                <div className="flex items-center">
                  <DollarSign className="w-5 h-5 text-green-600 mr-2" />
                  <div>
                    <p className="text-sm text-green-600">Total Cost</p>
                    <p className="font-semibold">{formatCost(traceData.performance.total_cost || 0)}</p>
                  </div>
                </div>
              </div>

              <div className="bg-purple-50 p-4 rounded-lg">
                <div className="flex items-center">
                  <Database className="w-5 h-5 text-purple-600 mr-2" />
                  <div>
                    <p className="text-sm text-purple-600">Total Tokens</p>
                    <p className="font-semibold">{traceData.performance.total_tokens?.toLocaleString() || 'N/A'}</p>
                  </div>
                </div>
              </div>

              <div className="bg-orange-50 p-4 rounded-lg">
                <div className="flex items-center">
                  <Activity className="w-5 h-5 text-orange-600 mr-2" />
                  <div>
                    <p className="text-sm text-orange-600">Spans</p>
                    <p className="font-semibold">{traceData.spans.length}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Output */}
            <div>
              <h3 className="text-lg font-medium mb-3">Final Output</h3>
              <div className="bg-gray-50 p-4 rounded-lg">
                <pre className="whitespace-pre-wrap text-sm">{traceData.final_output}</pre>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'spans' && traceData && (
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Execution Spans</h3>
            {traceData.spans.map((span, index) => (
              <div key={index} className="border rounded-lg">
                <div
                  className="p-4 cursor-pointer hover:bg-gray-50"
                  onClick={() => toggleSpanExpanded(`${index}`)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      {expandedSpans.has(`${index}`) ? (
                        <ChevronDown className="w-4 h-4 mr-2" />
                      ) : (
                        <ChevronRight className="w-4 h-4 mr-2" />
                      )}
                      <div>
                        <p className="font-medium">{span.name}</p>
                        <p className="text-sm text-gray-600">
                          {formatDuration(span.duration_ms)} • {span.kind}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">
                        {span.attributes['llm.model_name'] || 'Unknown Model'}
                      </p>
                      <p className="text-xs text-gray-500">
                        {span.attributes['llm.token_count.prompt'] && 
                          `${span.attributes['llm.token_count.prompt']}→${span.attributes['llm.token_count.completion']} tokens`
                        }
                      </p>
                    </div>
                  </div>
                </div>
                
                {expandedSpans.has(`${index}`) && (
                  <div className="border-t p-4 bg-gray-50">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <h4 className="font-medium mb-2">Attributes</h4>
                        <div className="space-y-1">
                          {Object.entries(span.attributes).map(([key, value]) => (
                            <div key={key} className="text-sm">
                              <span className="text-gray-600">{key}:</span>{' '}
                              <span className="font-mono">{String(value)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div>
                        <h4 className="font-medium mb-2">Timing</h4>
                        <div className="space-y-1 text-sm">
                          <div>
                            <span className="text-gray-600">Start:</span>{' '}
                            <span className="font-mono">{new Date(span.start_time / 1000000).toISOString()}</span>
                          </div>
                          <div>
                            <span className="text-gray-600">End:</span>{' '}
                            <span className="font-mono">{new Date(span.end_time / 1000000).toISOString()}</span>
                          </div>
                          <div>
                            <span className="text-gray-600">Duration:</span>{' '}
                            <span className="font-mono">{formatDuration(span.duration_ms)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {activeTab === 'performance' && performanceData && (
          <div className="space-y-6">
            <h3 className="text-lg font-medium">Performance Analysis</h3>
            
            {/* Overall Performance */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-medium mb-3">Overall Metrics</h4>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Total Cost</p>
                  <p className="font-semibold">{formatCost(performanceData.overall_performance.total_cost || 0)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total Tokens</p>
                  <p className="font-semibold">{performanceData.overall_performance.total_tokens?.toLocaleString() || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Duration</p>
                  <p className="font-semibold">{formatDuration(performanceData.overall_performance.total_duration_ms)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Avg Token Cost</p>
                  <p className="font-semibold">
                    {performanceData.overall_performance.total_tokens ? 
                      formatCost((performanceData.overall_performance.total_cost || 0) / performanceData.overall_performance.total_tokens * 1000) + '/1K'
                      : 'N/A'
                    }
                  </p>
                </div>
              </div>
            </div>

            {/* Bottlenecks */}
            {performanceData.bottlenecks && performanceData.bottlenecks.length > 0 && (
              <div>
                <h4 className="font-medium mb-3">Performance Bottlenecks</h4>
                <div className="space-y-2">
                  {performanceData.bottlenecks.map((span: any, index: number) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                      <div>
                        <p className="font-medium">{span.name}</p>
                        <p className="text-sm text-gray-600">{span.model}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-red-600">{formatDuration(span.duration_ms)}</p>
                        <p className="text-xs text-gray-500">
                          {span.token_usage.prompt + span.token_usage.completion} tokens
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Cost Breakdown */}
            {performanceData.cost_breakdown?.most_expensive_spans && performanceData.cost_breakdown.most_expensive_spans.length > 0 && (
              <div>
                <h4 className="font-medium mb-3">Most Expensive Operations</h4>
                <div className="space-y-2">
                  {performanceData.cost_breakdown.most_expensive_spans.map((span: any, index: number) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                      <div>
                        <p className="font-medium">{span.name}</p>
                        <p className="text-sm text-gray-600">{span.model}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-yellow-600">
                          {formatCost((span.cost.prompt || 0) + (span.cost.completion || 0))}
                        </p>
                        <p className="text-xs text-gray-500">
                          {span.token_usage.prompt + span.token_usage.completion} tokens
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
} 