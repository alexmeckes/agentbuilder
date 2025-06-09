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
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-8 py-6 border-b border-gray-200 flex justify-between items-center flex-shrink-0">
          <h2 className="text-2xl font-semibold text-gray-900">Edit Conditional Router</h2>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-6 h-6 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-8 space-y-8">
            <p className="text-base text-gray-600 leading-relaxed">
              Define the rules to route your workflow. The first rule that evaluates to true will be chosen.
            </p>

            {/* Default Path */}
            {conditions.filter(c => c.is_default).map((condition, index) => (
              <div key={condition.id} className="p-6 border-2 border-dashed border-gray-300 rounded-xl bg-gray-50">
                <div className="flex items-center gap-4">
                  <GripVertical className="w-6 h-6 text-gray-400 cursor-grab flex-shrink-0" />
                  <div className="flex-1">
                    <input
                      type="text"
                      value={condition.name}
                      onChange={(e) => updateConditionName(conditions.findIndex(c => c.id === condition.id), e.target.value)}
                      className="font-semibold text-gray-800 bg-transparent border-none outline-none w-full text-xl mb-1"
                      placeholder="Default Path"
                    />
                    <p className="text-sm text-gray-500">This path will be taken if no other conditions match</p>
                  </div>
                  <div className="px-4 py-2 bg-blue-100 text-blue-700 text-sm font-medium rounded-full">
                    Default
                  </div>
                </div>
              </div>
            ))}

            {/* Conditional Paths */}
            {conditions.filter(c => !c.is_default).map((condition, filteredIndex) => {
              const actualIndex = conditions.findIndex(c => c.id === condition.id);
              return (
                <div key={condition.id} className="p-6 border border-gray-200 rounded-xl bg-white shadow-sm hover:shadow-md transition-shadow">
                  <div className="space-y-6">
                    {/* Path Header */}
                    <div className="flex items-start gap-4">
                      <GripVertical className="w-6 h-6 text-gray-400 mt-3 cursor-grab flex-shrink-0" />
                      <div className="flex-1">
                        <input
                          type="text"
                          value={condition.name}
                          onChange={(e) => updateConditionName(actualIndex, e.target.value)}
                          className="font-semibold text-gray-800 bg-transparent border-b-2 border-gray-200 focus:border-blue-500 outline-none w-full text-xl pb-2 transition-colors"
                          placeholder="Path Name"
                        />
                      </div>
                      <button 
                        onClick={() => handleDeleteCondition(actualIndex)}
                        className="p-3 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0"
                        title="Delete condition"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>

                    {/* Condition Rules */}
                    <div className="ml-10 space-y-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-3">
                          JSONPath Expression
                        </label>
                        <input 
                          type="text" 
                          placeholder="e.g., $.intent" 
                          value={condition.rule?.jsonpath || ''}
                          onChange={(e) => updateConditionRule(actualIndex, 'jsonpath', e.target.value)}
                          className="w-full p-4 border border-gray-300 rounded-lg text-base focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
                        />
                      </div>
                      
                      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
                        <div className="lg:col-span-2">
                          <label className="block text-sm font-medium text-gray-700 mb-3">
                            Operator
                          </label>
                          <select 
                            value={condition.rule?.operator || 'equals'}
                            onChange={(e) => updateConditionRule(actualIndex, 'operator', e.target.value)}
                            className="w-full p-4 border border-gray-300 rounded-lg bg-white text-base focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
                          >
                            {CONDITION_OPERATORS.map(op => (
                              <option key={op.value} value={op.value}>{op.label}</option>
                            ))}
                          </select>
                        </div>
                        <div className="lg:col-span-3">
                          <label className="block text-sm font-medium text-gray-700 mb-3">
                            Value
                          </label>
                          <input 
                            type="text" 
                            placeholder="e.g., 'faq'" 
                            value={condition.rule?.value || ''}
                            onChange={(e) => updateConditionRule(actualIndex, 'value', e.target.value)}
                            className="w-full p-4 border border-gray-300 rounded-lg text-base focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Add Path Button */}
            <button 
              onClick={handleAddPath}
              className="w-full flex items-center justify-center gap-3 p-6 border-2 border-dashed border-gray-300 rounded-xl text-gray-600 hover:text-blue-600 hover:border-blue-300 hover:bg-blue-50 transition-colors text-base font-medium"
            >
              <Plus className="w-6 h-6" />
              Add Path
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="px-8 py-6 border-t border-gray-200 flex justify-end gap-4 flex-shrink-0">
          <button 
            onClick={onClose} 
            className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors text-base font-medium"
          >
            Cancel
          </button>
          <button 
            onClick={handleSave} 
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors flex items-center gap-2 text-base font-medium"
          >
            <Save className="w-5 h-5" />
            Save
          </button>
        </div>
      </div>
    </div>
  );
} 