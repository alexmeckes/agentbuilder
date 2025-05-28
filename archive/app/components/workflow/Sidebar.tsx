import type { DragEvent } from 'react'

const nodeTypes = [
  { type: 'agent', label: 'Agent', description: 'An AI agent node' },
  { type: 'tool', label: 'Tool', description: 'A tool node' },
  { type: 'input', label: 'Input', description: 'An input node' },
  { type: 'output', label: 'Output', description: 'An output node' },
]

export default function Sidebar() {
  const onDragStart = (event: DragEvent<HTMLDivElement>, nodeType: string) => {
    event.dataTransfer.setData('application/reactflow', nodeType)
    event.dataTransfer.effectAllowed = 'move'
  }

  return (
    <div className="w-64 h-full bg-white border-r border-gray-200 p-4">
      <h2 className="text-lg font-semibold mb-4">Node Library</h2>
      <div className="space-y-2">
        {nodeTypes.map((node) => (
          <div
            key={node.type}
            className="p-3 border border-gray-200 rounded-md cursor-move hover:border-blue-500 transition-colors"
            draggable
            onDragStart={(e) => onDragStart(e, node.type)}
          >
            <div className="font-medium">{node.label}</div>
            <div className="text-sm text-gray-500">{node.description}</div>
          </div>
        ))}
      </div>
    </div>
  )
} 