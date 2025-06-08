'use client'

import React from 'react'
import {
  EdgeProps,
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  getStraightPath,
} from 'reactflow'
import { X, Trash2 } from 'lucide-react'

interface DeletableEdgeProps extends EdgeProps {
  onEdgeDelete?: (edgeId: string) => void
}

export default function DeletableEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
  selected,
  data,
}: DeletableEdgeProps) {
  // Debug log to check if selection is working
  React.useEffect(() => {
    if (selected) {
      console.log('🔵 Edge selected:', id, 'X button should be visible!')
    } else {
      console.log('⚪ Edge deselected:', id, 'X button hidden')
    }
  }, [selected, id])
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  })

  // Apply active styles if the edge is part of the executed path
  const activeStyle = data.isActive ? { stroke: '#2563EB', strokeWidth: 3 } : {}

  const onEdgeClick = (event: React.MouseEvent) => {
    event.stopPropagation()
    event.preventDefault()
    
    console.log('🗑️ Deleting edge:', id)
    
    // Use the callback passed from the parent component
    if (data?.onEdgeDelete) {
      data.onEdgeDelete(id)
    }
  }

  return (
    <>
      <BaseEdge 
        path={edgePath} 
        markerEnd={markerEnd} 
        style={{
          ...style,
          ...activeStyle,
          strokeWidth: selected ? 4 : 2,
          stroke: selected ? '#ef4444' : style?.stroke || '#b1b1b7',
          strokeDasharray: selected ? '5,5' : 'none',
        }} 
      />
      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            fontSize: 12,
            // everything inside EdgeLabelRenderer has no pointer events by default
            // if you have an interactive element, set pointer-events: all
            pointerEvents: 'all',
          }}
          className="nodrag nopan"
        >
          {/* Larger hover area to make button easier to discover */}
          <div 
            className={`w-10 h-10 flex items-center justify-center transition-all duration-200 ${
              selected 
                ? 'opacity-100 bg-red-100 rounded-full' 
                : 'opacity-0 hover:opacity-100'
            }`}
            title="Delete connection"
          >
            <button
              className={`w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center shadow-lg transition-all duration-200 hover:scale-110 ${
                selected ? 'animate-pulse' : ''
              }`}
              onClick={onEdgeClick}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </EdgeLabelRenderer>
    </>
  )
} 