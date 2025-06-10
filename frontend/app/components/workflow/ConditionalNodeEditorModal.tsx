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
  const [conditions, setConditions] = useState<Condition[]>(nodeData.conditions || []);

  useEffect(() => {
    if (isOpen && nodeData) {
      setConditions(nodeData.conditions || []);
    }
  }, [isOpen, nodeData]);

  const addCondition = () => {
    const newCondition: Condition = {
      id: `condition_${Date.now()}`,
      name: `Path ${conditions.length + 1}`,
      rule: {
        jsonpath: '$.field',
        operator: 'equals',
        value: ''
      }
    };
    setConditions([...conditions, newCondition]);
  };

  const removeCondition = (index: number) => {
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

  const handleSave = () => {
    nodeData.onNodeUpdate(nodeId, { conditions });
    onClose();
  };

  const handleCancel = () => {
    setConditions(nodeData.conditions || []);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="nodrag">
      {/* Editor Header */}
      <div className="border-t border-gray-200 bg-blue-50 px-4 py-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium text-blue-900">Conditional Router Configuration</h3>
            <p className="text-xs text-blue-700 mt-1">
              Define rules to route your workflow. First matching rule will be chosen.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleSave}
              className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors flex items-center gap-1"
            >
              <Save className="w-3 h-3" />
              Save
            </button>
            <button
              onClick={handleCancel}
              className="px-3 py-1 text-gray-600 text-sm rounded hover:bg-gray-100 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>

      {/* Editor Content */}
      <div className="border-t border-gray-200 bg-white max-h-80 overflow-y-auto">
        <div className="p-4 space-y-4">
          {/* Default Path */}
          <div className="border border-dashed border-gray-300 rounded-lg p-3 bg-gray-50">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
              <span className="text-sm font-medium text-gray-700">Default Path</span>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Taken when no other conditions match
            </p>
          </div>

          {/* Conditional Paths */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">Conditional Paths</span>
              <button
                onClick={addCondition}
                className="flex items-center gap-1 px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-3 h-3" />
                Add
              </button>
            </div>

            {conditions.map((condition, index) => (
              <div key={condition.id} className="border border-gray-200 rounded-lg p-3 bg-white">
                {/* Condition Header */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2 flex-1">
                    <GripVertical className="w-3 h-3 text-gray-400" />
                    <input
                      type="text"
                      value={condition.name}
                      onChange={(e) => updateConditionName(index, e.target.value)}
                      className="text-sm font-medium bg-transparent border-none focus:ring-0 focus:outline-none flex-1"
                      placeholder="Condition name"
                    />
                  </div>
                  <button
                    onClick={() => removeCondition(index)}
                    className="p-1 text-red-500 hover:bg-red-50 rounded transition-colors"
                    title="Remove condition"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>

                {/* Condition Rules */}
                <div className="space-y-2">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      JSON Path
                    </label>
                    <input
                      type="text"
                      value={condition.rule?.jsonpath || ''}
                      onChange={(e) => updateConditionRule(index, 'jsonpath', e.target.value)}
                      className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="$.field"
                    />
                  </div>

                  <div className="flex gap-2">
                    <div className="w-24">
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Operator
                      </label>
                      <select
                        value={condition.rule?.operator || 'equals'}
                        onChange={(e) => updateConditionRule(index, 'operator', e.target.value)}
                        className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                      >
                        {CONDITION_OPERATORS.map((op) => (
                          <option key={op.value} value={op.value}>
                            {op.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="flex-1">
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Value
                      </label>
                      <input
                        type="text"
                        value={condition.rule?.value || ''}
                        onChange={(e) => updateConditionRule(index, 'value', e.target.value)}
                        className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Expected value"
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {conditions.length === 0 && (
              <div className="text-center py-6 text-gray-500">
                <p className="text-xs mb-2">No conditional paths defined yet.</p>
                <button
                  onClick={addCondition}
                  className="inline-flex items-center gap-1 px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 transition-colors"
                >
                  <Plus className="w-3 h-3" />
                  Add First Condition
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 