import { Handle, Position } from 'reactflow'

interface AgentNodeProps {
  data: {
    label: string
    type: string
  }
}

export default function AgentNode({ data }: AgentNodeProps) {
  return (
    <div className="px-4 py-2 shadow-md rounded-md bg-white border-2 border-gray-200">
      <Handle type="target" position={Position.Top} className="w-3 h-3" />
      <div className="flex items-center">
        <div className="rounded-full w-3 h-3 bg-blue-500 mr-2" />
        <div className="flex flex-col">
          <div className="text-sm font-bold">{data.label}</div>
          <div className="text-xs text-gray-500">{data.type}</div>
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} className="w-3 h-3" />
    </div>
  )
} 