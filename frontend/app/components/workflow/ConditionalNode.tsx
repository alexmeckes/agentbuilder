'use client'

import { useState } from 'react'
import { Handle, Position, NodeProps } from 'reactflow'
import { GitBranch, Settings, PlusCircle, Trash2, ChevronDown, ChevronRight, Edit3, Save, X } from 'lucide-react'
import { ConditionalNodeEditorModal } from './ConditionalNodeEditorModal'

const CONDITION_OPERATORS = [
  { value: 'equals', label: 'equals' },
  { value: 'contains', label: 'contains' },
  { value: 'not_equals', label: 'not equals' },
  { value: 'greater_than', label: 'greater than' },
  { value: 'less_than', label: 'less than' },
];

// Assuming a structure for conditions from the backend
interface Condition {
  id: string;
  name: string;
  is_default?: boolean;
  rule?: {
    jsonpath: string;
    operator: string;
    value: string;
  };
}

interface ConditionalNodeData {
  label: string;
  conditions: Condition[];
  onNodeUpdate: (nodeId: string, data: Partial<ConditionalNodeData>) => void;
  onNodeDelete?: (nodeId: string) => void;
}

export function ConditionalNode({ id, data }: NodeProps<ConditionalNodeData>) {
  // Debug: Log what callbacks this node receives
  console.log(`🔧 ConditionalNode ${id} received callbacks:`, {
    hasOnNodeUpdate: !!data.onNodeUpdate,
    hasOnNodeDelete: !!data.onNodeDelete,
    nodeType: 'conditional',
    nodeLabel: data.label
  })
  
  const [isExpanded, setIsExpanded] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingCondition, setEditingCondition] = useState<string | null>(null);

  const handleExpandToggle = () => {
    setIsExpanded(!isExpanded);
  };

  const handleEditClick = () => {
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
  };

  const handleAddCondition = () => {
    const newCondition: Condition = {
      id: `cond_${Date.now()}`,
      name: 'New Condition',
      rule: {
        jsonpath: '$.field',
        operator: 'equals',
        value: ''
      }
    };
    const updatedConditions = [...data.conditions, newCondition];
    data.onNodeUpdate(id, { conditions: updatedConditions });
    
    // Expand the node to show the new condition
    setIsExpanded(true);
  };

  const handleDeleteCondition = (conditionId: string) => {
    const updatedConditions = data.conditions.filter(c => c.id !== conditionId);
    data.onNodeUpdate(id, { conditions: updatedConditions });
  };

  const handleUpdateCondition = (conditionId: string, updates: Partial<Condition>) => {
    const updatedConditions = data.conditions.map(condition =>
      condition.id === conditionId ? { ...condition, ...updates } : condition
    );
    data.onNodeUpdate(id, { conditions: updatedConditions });
  };

  const handleUpdateConditionRule = (conditionId: string, field: keyof NonNullable<Condition['rule']>, value: string) => {
    const condition = data.conditions.find(c => c.id === conditionId);
    if (condition) {
      const updatedRule = {
        jsonpath: condition.rule?.jsonpath || '',
        operator: condition.rule?.operator || 'equals',
        value: condition.rule?.value || '',
        [field]: value
      };
      handleUpdateCondition(conditionId, { rule: updatedRule });
    }
  };

  const handleDeleteNode = (e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    if (data.onNodeDelete) {
      if (window.confirm(`Delete "${data.label}" conditional router?`)) {
        data.onNodeDelete!(id);
      }
    }
  };
  
  return (
    <>
      <div className={`
        relative bg-white rounded-xl shadow-lg border-2 transition-all duration-200 border-yellow-300
        ${isExpanded ? 'min-w-[600px]' : 'min-w-[300px]'}
        hover:shadow-xl
      `}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-yellow-400 to-yellow-600 flex items-center justify-center shadow-sm flex-shrink-0">
              <GitBranch className="w-5 h-5 text-white" />
            </div>
            
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-semibold text-gray-900 truncate">
                {data.label}
              </h3>
              
              <div className="flex items-center gap-2 mt-1">
                <span className="text-sm text-gray-500 capitalize">conditional</span>
                
                {data.conditions.length > 0 && (
                  <>
                    <span className="text-gray-300">•</span>
                    <span className="text-xs text-yellow-600 font-medium">
                      {data.conditions.length} path{data.conditions.length > 1 ? 's' : ''}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2 flex-shrink-0 nodrag">
            <button
              onClick={handleEditClick}
              onMouseDown={(e) => e.stopPropagation()}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              title="Edit conditions"
            >
              <Settings className="w-4 h-4" />
            </button>
            
            <button
              onClick={handleExpandToggle}
              onMouseDown={(e) => e.stopPropagation()}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              title={isExpanded ? "Collapse" : "Expand"}
            >
              {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Collapsed Content */}
        {!isExpanded && (
          <div className="p-4 space-y-2">
            {data.conditions.slice(0, 3).map((condition, index) => (
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
            
            {data.conditions.length > 3 && (
              <div className="text-xs text-gray-500">
                +{data.conditions.length - 3} more conditions...
              </div>
            )}
            
            {/* Quick Add Button */}
            <button 
              onClick={handleAddCondition} 
              className="mt-2 w-full flex items-center justify-center gap-2 text-sm text-blue-600 hover:text-blue-800 nodrag"
            >
              <PlusCircle className="w-4 h-4" />
              Add Condition
            </button>
          </div>
        )}

        {/* Expanded Content */}
        {isExpanded && (
          <div className="p-4 space-y-4 nodrag">
            {/* Conditions Summary */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <GitBranch className="w-4 h-4" />
                  Routing Conditions
                </h4>
                
                {/* Add Condition Button in Expanded State */}
                <button 
                  onClick={handleAddCondition}
                  className="flex items-center gap-1 px-2 py-1 text-xs bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-md transition-colors"
                  title="Add new condition"
                >
                  <PlusCircle className="w-3 h-3" />
                  Add
                </button>
              </div>
              
              <div className="space-y-3">
                {/* Default Path */}
                <div className="p-3 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                    <span className="text-sm font-medium text-gray-700">Default Path</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Taken when no conditions match
                  </p>
                </div>

                {/* Conditional Paths */}
                {data.conditions.map((condition, index) => (
                  <div key={condition.id} className="p-4 bg-white rounded-lg border border-gray-200 space-y-3">
                    {/* Condition Header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 flex-1">
                        <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                        {editingCondition === condition.id ? (
                          <input
                            type="text"
                            value={condition.name}
                            onChange={(e) => handleUpdateCondition(condition.id, { name: e.target.value })}
                            onBlur={() => setEditingCondition(null)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') setEditingCondition(null);
                              if (e.key === 'Escape') setEditingCondition(null);
                            }}
                            className="text-sm font-medium bg-blue-50 border border-blue-200 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            autoFocus
                          />
                        ) : (
                          <span 
                            className="text-sm font-medium text-gray-700 cursor-pointer hover:text-blue-600"
                            onClick={() => setEditingCondition(condition.id)}
                            title="Click to edit name"
                          >
                            {condition.name}
                          </span>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setEditingCondition(condition.id)}
                          className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
                          title="Edit condition name"
                        >
                          <Edit3 className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => handleDeleteCondition(condition.id)}
                          className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                          title="Delete condition"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>

                    {/* Condition Details */}
                    <div className="grid grid-cols-1 gap-2 text-xs">
                      {/* JSON Path */}
                      <div>
                        <label className="block text-gray-500 mb-1">JSON Path:</label>
                        <input
                          type="text"
                          value={condition.rule?.jsonpath || ''}
                          onChange={(e) => handleUpdateConditionRule(condition.id, 'jsonpath', e.target.value)}
                          className="w-full px-2 py-1 border border-gray-200 rounded text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="$.field"
                        />
                      </div>

                      {/* Operator and Value */}
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-gray-500 mb-1">Operator:</label>
                          <select
                            value={condition.rule?.operator || 'equals'}
                            onChange={(e) => handleUpdateConditionRule(condition.id, 'operator', e.target.value)}
                            className="w-full px-2 py-1 border border-gray-200 rounded text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                          >
                            {CONDITION_OPERATORS.map((op) => (
                              <option key={op.value} value={op.value}>
                                {op.label}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-gray-500 mb-1">Value:</label>
                          <input
                            type="text"
                            value={condition.rule?.value || ''}
                            onChange={(e) => handleUpdateConditionRule(condition.id, 'value', e.target.value)}
                            className="w-full px-2 py-1 border border-gray-200 rounded text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="Expected value"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Connection Handle */}
                    <Handle
                      type="source"
                      position={Position.Right}
                      id={condition.id}
                      style={{ top: `${(index + 1) * 120 + 180}px` }}
                      className="!w-4 !h-4 !bg-yellow-500"
                    />
                  </div>
                ))}

                {/* Empty State */}
                {data.conditions.length === 0 && (
                  <div className="text-center py-6 text-gray-500">
                    <p className="text-sm mb-2">No conditions defined yet</p>
                    <button
                      onClick={handleAddCondition}
                      className="text-xs text-blue-600 hover:text-blue-800"
                    >
                      Add your first condition
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Node Actions */}
            <div className="border-t pt-4">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Node Actions</h4>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleEditClick}
                  className="flex items-center gap-2 px-3 py-2 text-sm bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg transition-colors"
                >
                  <Settings className="w-4 h-4" />
                  Full Editor
                </button>
                
                {data.onNodeDelete ? (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      e.preventDefault()
                      if (window.confirm(`Delete "${data.label}" conditional router?`)) {
                        data.onNodeDelete!(id)
                      }
                    }}
                    className="flex items-center gap-2 px-3 py-2 text-sm bg-red-50 text-red-700 hover:bg-red-100 rounded-lg transition-colors border border-red-200"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete Node
                  </button>
                ) : (
                  <div className="flex items-center gap-2 px-3 py-2 text-sm text-gray-400 rounded-lg border border-gray-200">
                    <Trash2 className="w-4 h-4" />
                    Delete Not Available
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Connection Handles */}
        <Handle
          type="target"
          position={Position.Left}
          className="!w-4 !h-4 !bg-gray-500 !border-2 !border-white !shadow-lg hover:!bg-gray-600 !transition-all !duration-200"
          style={{
            left: -10,
            zIndex: 10,
          }}
          title="Input connection point"
        />

        {/* Source handles for collapsed view */}
        {!isExpanded && data.conditions.map((condition, index) => (
          <Handle
            key={condition.id}
            type="source"
            position={Position.Right}
            id={condition.id}
            className="!w-4 !h-4 !bg-yellow-500 !border-2 !border-white !shadow-lg hover:!bg-yellow-600 !transition-all !duration-200"
            style={{
              top: `${(index + 1) * 30 + 60}px`,
              right: -10,
              zIndex: 10,
            }}
            title={`${condition.name} output`}
          />
        ))}

        {/* Default path handle - always visible */}
        <Handle
          type="source"
          position={Position.Right}
          id="default"
          className="!w-4 !h-4 !bg-gray-400 !border-2 !border-white !shadow-lg hover:!bg-gray-500 !transition-all !duration-200"
          style={{
            bottom: 10,
            right: -10,
            zIndex: 10,
          }}
          title="Default path output"
        />
      </div>

      {/* Full Editor Modal */}
      <ConditionalNodeEditorModal 
        isOpen={showModal}
        onClose={handleCloseModal}
        nodeId={id}
        nodeData={data}
      />
    </>
  );
} 