'use client'

import React from 'react'
import {
  EdgeProps,
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
} from 'reactflow'
import { X } from 'lucide-react'

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
      console.log('🔵 Edge selected:', id)
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
          strokeWidth: selected ? 3 : 2,
          stroke: selected ? '#3b82f6' : style?.stroke || '#b1b1b7',
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
            className={`w-8 h-8 flex items-center justify-center transition-opacity duration-200 ${
              selected ? 'opacity-100' : 'opacity-0 hover:opacity-100'
            }`}
            title="Delete connection"
          >
            <button
              className="w-5 h-5 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center shadow-lg transition-all duration-200 hover:scale-110"
              onClick={onEdgeClick}
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        </div>
      </EdgeLabelRenderer>
    </>
  )
} 