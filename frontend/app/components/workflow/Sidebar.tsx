'use client'

import { useState } from 'react'
import type { DragEvent } from 'react'
import { ChevronLeft, ChevronRight, Bot, Wrench, FileInput, FileOutput } from 'lucide-react'

const nodeTypes = [
  { type: 'agent', label: 'Agent', description: 'An AI agent node', icon: Bot },
  { type: 'tool', label: 'Tool', description: 'A tool node', icon: Wrench },
  { type: 'input', label: 'Input', description: 'An input node', icon: FileInput },
  { type: 'output', label: 'Output', description: 'An output node', icon: FileOutput },
]

export default function Sidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false)

  const onDragStart = (event: DragEvent<HTMLDivElement>, nodeType: string) => {
    event.dataTransfer.setData('application/reactflow', nodeType)
    event.dataTransfer.effectAllowed = 'move'
  }

  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed)
  }

  return (
    <div className={`h-full bg-white border-r border-gray-200 transition-all duration-300 ease-in-out ${
      isCollapsed ? 'w-12' : 'w-64'
    }`}>
      {/* Header with toggle button */}
      <div className="flex items-center justify-between p-4 border-b border-gray-100">
        {!isCollapsed && (
          <h2 className="text-lg font-semibold text-gray-900">Node Library</h2>
        )}
        <button
          onClick={toggleCollapse}
          className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
          title={isCollapsed ? 'Expand Node Library' : 'Collapse Node Library'}
        >
          {isCollapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <ChevronLeft className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* Node items */}
      <div className="p-4">
        {isCollapsed ? (
          // Collapsed view - show only icons
          <div className="space-y-3">
            {nodeTypes.map((node) => {
              const IconComponent = node.icon
              return (
                <div
                  key={node.type}
                  className="p-2 border border-gray-200 rounded-md cursor-move hover:border-blue-500 hover:bg-blue-50 transition-colors flex items-center justify-center"
                  draggable
                  onDragStart={(e) => onDragStart(e, node.type)}
                  title={`${node.label} - ${node.description}`}
                >
                  <IconComponent className="w-5 h-5 text-gray-600" />
                </div>
              )
            })}
          </div>
        ) : (
          // Expanded view - show full cards
          <div className="space-y-2">
            {nodeTypes.map((node) => {
              const IconComponent = node.icon
              return (
                <div
                  key={node.type}
                  className="p-3 border border-gray-200 rounded-md cursor-move hover:border-blue-500 hover:bg-blue-50 transition-colors"
                  draggable
                  onDragStart={(e) => onDragStart(e, node.type)}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <IconComponent className="w-4 h-4 text-gray-600" />
                    <div className="font-medium text-gray-900">{node.label}</div>
                  </div>
                  <div className="text-sm text-gray-500">{node.description}</div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Helpful tip when collapsed */}
      {isCollapsed && (
        <div className="px-2 py-1">
          <div className="text-xs text-gray-400 text-center transform rotate-90 whitespace-nowrap">
            Drag to add
          </div>
        </div>
      )}
    </div>
  )
} 