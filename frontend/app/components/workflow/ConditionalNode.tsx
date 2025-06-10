'use client'

import { useState } from 'react'
import { Handle, Position, NodeProps } from 'reactflow'
import { GitBranch, Settings, PlusCircle, ChevronDown, ChevronRight } from 'lucide-react'
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
  const [isEditing, setIsEditing] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const handleEditClick = () => {
    setIsEditing(true);
  };

  const handleCloseEditor = () => {
    setIsEditing(false);
  };

  const handleExpansionToggle = () => {
    setIsExpanded(!isExpanded);
  };

  const handleAddCondition = () => {
    const newCondition: Condition = {
      id: `cond_${Date.now()}`,
      name: 'New Condition',
    };
    const updatedConditions = [...data.conditions, newCondition];
    data.onNodeUpdate(id, { conditions: updatedConditions });
  };
  
  return (
    <div className={`bg-white rounded-lg shadow-lg border-2 border-yellow-300 transition-all duration-200 ${
      isExpanded ? 'min-w-[400px]' : 'w-64'
    }`}>
      <div className="p-4 border-b border-gray-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-yellow-100 rounded-full">
            <GitBranch className="w-5 h-5 text-yellow-600" />
          </div>
          <h3 className="font-bold text-lg text-gray-800">{data.label}</h3>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={handleEditClick} 
            className="text-gray-400 hover:text-gray-600 p-1 rounded transition-colors"
            title="Edit conditions"
          >
            <Settings className="w-5 h-5" />
          </button>
          <button
            onClick={handleExpansionToggle}
            className="text-gray-400 hover:text-gray-600 p-1 rounded transition-colors"
            title={isExpanded ? "Collapse" : "Expand"}
          >
            {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
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

      {/* Expanded Content */}
      {isExpanded && (
        <div className="border-t border-gray-200 bg-gray-50 p-3">
          <div className="text-xs text-gray-600 space-y-1">
            <p><strong>Conditions:</strong> {data.conditions.length}</p>
            <p><strong>Default path:</strong> Always available</p>
            {data.conditions.length > 0 && (
              <div>
                <p><strong>Active paths:</strong></p>
                <ul className="ml-2 space-y-1">
                  {data.conditions.map((condition) => (
                    <li key={condition.id} className="flex items-center gap-1">
                      <div className="w-1 h-1 bg-yellow-500 rounded-full"></div>
                      {condition.name}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      <Handle
        type="target"
        position={Position.Left}
        className="!w-4 !h-4 !bg-gray-500"
      />

      {/* Inline Editor */}
      <ConditionalNodeEditorModal 
        isOpen={isEditing}
        onClose={handleCloseEditor}
        nodeId={id}
        nodeData={data}
      />
    </div>
  );
} 