'use client'

import { useState, useEffect } from 'react';
import { X, Save, Plus, Trash2, GripVertical } from 'lucide-react';

const CONDITION_OPERATORS = [
  { value: 'equals', label: 'equals' },
  { value: 'contains', label: 'contains' },
  { value: 'not_equals', label: 'not equals' },
  { value: 'greater_than', label: 'greater than' },
  { value: 'less_than', label: 'less than' },
];

// Assuming the same Condition and NodeData interfaces
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
}

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  nodeId: string;
  nodeData: ConditionalNodeData;
  initialAddCondition?: boolean;
}

export function ConditionalNodeEditorModal({ isOpen, onClose, nodeId, nodeData, initialAddCondition }: ModalProps) {
  const [conditions, setConditions] = useState<Condition[]>([]);

  useEffect(() => {
    if (isOpen) {
      const initialConditions = JSON.parse(JSON.stringify(nodeData.conditions));
      if (initialAddCondition) {
        initialConditions.push({ 
          id: `cond_${Date.now()}`, 
          name: 'New Path', 
          rule: { 
            jsonpath: '', 
            operator: 'equals', 
            value: '' 
          } 
        });
      }
      setConditions(initialConditions);
    }
  }, [isOpen, nodeData.conditions, initialAddCondition]);

  const handleSave = () => {
    nodeData.onNodeUpdate(nodeId, { conditions });
    onClose();
  };

  const handleAddPath = () => {
    setConditions([...conditions, { 
      id: `cond_${Date.now()}`, 
      name: 'New Path', 
      rule: { 
        jsonpath: '', 
        operator: 'equals', 
        value: '' 
      } 
    }]);
  };

  const handleDeleteCondition = (index: number) => {
    const newConditions = conditions.filter((_, i) => i !== index);
    setConditions(newConditions);
  };

  const updateConditionName = (index: number, name: string) => {
    const newConditions = [...conditions];
    newConditions[index].name = name;
    setConditions(newConditions);
  };

  const updateConditionRule = (index: number, field: keyof NonNullable<Condition['rule']>, value: string) => {
    const newConditions = [...conditions];
    newConditions[index].rule = { 
      jsonpath: newConditions[index].rule?.jsonpath || '',
      operator: newConditions[index].rule?.operator || 'equals',
      value: newConditions[index].rule?.value || '',
      [field]: value
    };
    setConditions(newConditions);
  };
  
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Edit Conditional Router</h2>
          <button 
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <p className="text-sm text-gray-600 mb-6">
            Define the rules to route your workflow. The first rule that evaluates to true will be chosen.
          </p>

          <div className="space-y-4">
            {/* Default Path */}
            {conditions.filter(c => c.is_default).map((condition) => (
              <div key={condition.id} className="p-4 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50">
                <div className="flex items-center gap-3">
                  <GripVertical className="w-5 h-5 text-gray-400 cursor-grab" />
                  <div className="flex-1">
                    <input
                      type="text"
                      value={condition.name}
                      onChange={(e) => updateConditionName(conditions.findIndex(c => c.id === condition.id), e.target.value)}
                      className="font-medium text-gray-800 bg-transparent border-none outline-none w-full"
                      placeholder="Default Path"
                    />
                    <p className="text-xs text-gray-500 mt-1">This path will be taken if no other conditions match</p>
                  </div>
                  <div className="px-3 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
                    Default
                  </div>
                </div>
              </div>
            ))}

            {/* Conditional Paths */}
            {conditions.filter(c => !c.is_default).map((condition) => {
              const actualIndex = conditions.findIndex(c => c.id === condition.id);
              return (
                <div key={condition.id} className="p-4 border border-gray-200 rounded-lg bg-white">
                  {/* Path Header */}
                  <div className="flex items-center gap-3 mb-4">
                    <GripVertical className="w-5 h-5 text-gray-400 cursor-grab" />
                    <input
                      type="text"
                      value={condition.name}
                      onChange={(e) => updateConditionName(actualIndex, e.target.value)}
                      className="flex-1 font-medium text-gray-800 bg-transparent border-b border-gray-200 focus:border-blue-500 outline-none pb-1"
                      placeholder="Path Name"
                    />
                    <button 
                      onClick={() => handleDeleteCondition(actualIndex)}
                      className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded"
                      title="Delete condition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Condition Rules */}
                  <div className="ml-8 space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        JSONPath Expression
                      </label>
                      <input 
                        type="text" 
                        placeholder="e.g., $.intent" 
                        value={condition.rule?.jsonpath || ''}
                        onChange={(e) => updateConditionRule(actualIndex, 'jsonpath', e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none"
                      />
                    </div>
                    
                    <div className="flex gap-3">
                      <div className="w-40">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Operator
                        </label>
                        <select 
                          value={condition.rule?.operator || 'equals'}
                          onChange={(e) => updateConditionRule(actualIndex, 'operator', e.target.value)}
                          className="w-full p-2 border border-gray-300 rounded bg-white text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none"
                        >
                          {CONDITION_OPERATORS.map(op => (
                            <option key={op.value} value={op.value}>{op.label}</option>
                          ))}
                        </select>
                      </div>
                      <div className="flex-1">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Value
                        </label>
                        <input 
                          type="text" 
                          placeholder="e.g., 'faq'" 
                          value={condition.rule?.value || ''}
                          onChange={(e) => updateConditionRule(actualIndex, 'value', e.target.value)}
                          className="w-full p-2 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Add Path Button */}
            <button 
              onClick={handleAddPath}
              className="w-full flex items-center justify-center gap-2 p-4 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:text-blue-600 hover:border-blue-300 hover:bg-blue-50 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Path
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-6 border-t border-gray-200">
          <button 
            onClick={onClose} 
            className="px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button 
            onClick={handleSave} 
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            Save
          </button>
        </div>
      </div>
    </div>
  );
} 