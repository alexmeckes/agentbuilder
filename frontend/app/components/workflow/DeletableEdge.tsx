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
      <BaseEdge path={edgePath} markerEnd={markerEnd} style={style} />
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
          <button
            className={`w-5 h-5 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center transition-opacity duration-200 shadow-lg ${
              selected ? 'opacity-100' : 'opacity-0 hover:opacity-100'
            }`}
            onClick={onEdgeClick}
            title="Delete connection"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      </EdgeLabelRenderer>
    </>
  )
} 