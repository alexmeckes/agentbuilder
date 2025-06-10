'use client'

import { useState } from 'react'
import { Handle, Position, NodeProps } from 'reactflow'
import { GitBranch, Settings, PlusCircle, Trash2 } from 'lucide-react'
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
  onNodeDelete?: (nodeId: string) => void;
}

export function ConditionalNode({ id, data }: NodeProps<ConditionalNodeData>) {
  const [isEditing, setIsEditing] = useState(false);

  const handleEditClick = () => {
    setIsEditing(true);
  };

  const handleCloseEditor = () => {
    setIsEditing(false);
  };

  const handleAddCondition = () => {
    const newCondition: Condition = {
      id: `cond_${Date.now()}`,
      name: 'New Condition',
    };
    const updatedConditions = [...data.conditions, newCondition];
    data.onNodeUpdate(id, { conditions: updatedConditions });
  };

  const handleDeleteNode = () => {
    if (data.onNodeDelete) {
      if (window.confirm(`Delete "${data.label}" conditional router?`)) {
        data.onNodeDelete(id);
      }
    }
  };
  
  return (
    <div className={`bg-white rounded-lg shadow-lg border-2 border-yellow-300 transition-all duration-200 ${
      isEditing ? 'min-w-[500px]' : 'w-64'
    }`}>
      <div className="p-4 border-b border-gray-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-yellow-100 rounded-full">
            <GitBranch className="w-5 h-5 text-yellow-600" />
          </div>
          <h3 className="font-bold text-lg text-gray-800">{data.label}</h3>
        </div>
        <div className="flex items-center gap-2 nodrag">
          <button 
            onClick={handleEditClick} 
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            title="Edit conditions"
          >
            <Settings className="w-5 h-5" />
          </button>
          {data.onNodeDelete && (
            <button
              onClick={handleDeleteNode}
              className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              title="Delete node"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
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
        
        {/* Quick Add Button */}
        <button 
          onClick={handleAddCondition} 
          className="mt-2 w-full flex items-center justify-center gap-2 text-sm text-blue-600 hover:text-blue-800"
        >
          <PlusCircle className="w-4 h-4" />
          Add Condition
        </button>
      </div>

      <Handle
        type="target"
        position={Position.Left}
        className="!w-4 !h-4 !bg-gray-500"
      />

      {/* Inline Editor - Opens when Edit Conditions is clicked */}
      <ConditionalNodeEditorModal 
        isOpen={isEditing}
        onClose={handleCloseEditor}
        nodeId={id}
        nodeData={data}
      />
    </div>
  );
} 