'use client'

import { useState, useMemo } from 'react'
import { Handle, Position, NodeProps } from 'reactflow'
import { GitBranch, Settings, PlusCircle } from 'lucide-react'
import { ConditionalNodeEditorModal } from './ConditionalNodeEditorModal'

// Assuming a structure for conditions from the backend
interface Condition {
  id: string;
  name: string;
  is_default?: boolean;
}

interface ConditionalNodeData {
  label: string;
  conditions: Condition[];
  onNodeUpdate: (nodeId: string, data: Partial<ConditionalNodeData>) => void;
}

export function ConditionalNode({ id, data }: NodeProps<ConditionalNodeData>) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleAddCondition = () => {
    const newCondition: Condition = {
      id: `cond_${Date.now()}`,
      name: 'New Condition',
    };
    const updatedConditions = [...data.conditions, newCondition];
    data.onNodeUpdate(id, { conditions: updatedConditions });
  };
  
  return (
    <div className="bg-white rounded-lg shadow-lg border-2 border-yellow-300 w-64">
      <div className="p-4 border-b border-gray-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
            <div className="p-2 bg-yellow-100 rounded-full">
                <GitBranch className="w-5 h-5 text-yellow-600" />
            </div>
            <h3 className="font-bold text-lg text-gray-800">{data.label}</h3>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="text-gray-400 hover:text-gray-600">
            <Settings className="w-5 h-5" />
        </button>
      </div>

      <div className="p-4 space-y-2">
        {data.conditions.map((condition, index) => (
          <div key={condition.id} className="flex items-center justify-between">
            <span className="text-sm text-gray-700">{condition.name}</span>
            <Handle
              type="source"
              position={Position.Right}
              id={condition.id}
              style={{ top: `${(index + 1) * 30 + 60}px` }}
              className="!w-4 !h-4 !bg-yellow-500"
            />
          </div>
        ))}
        <button onClick={handleAddCondition} className="mt-2 w-full flex items-center justify-center gap-2 text-sm text-blue-600 hover:text-blue-800">
            <PlusCircle className="w-4 h-4" />
            Add Condition
        </button>
      </div>

      <Handle
        type="target"
        position={Position.Left}
        className="!w-4 !h-4 !bg-gray-500"
      />

      <ConditionalNodeEditorModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        nodeId={id}
        nodeData={data}
      />
    </div>
  );
} 