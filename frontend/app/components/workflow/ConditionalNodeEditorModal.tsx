'use client'

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
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
  const [isClient, setIsClient] = useState(false);

  // Ensure we're on the client side before rendering portal
  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (isOpen && nodeData) {
      setConditions(nodeData.conditions || []);
    }
  }, [isOpen, nodeData]);

  // Handle escape key to close modal
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen, onClose]);

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

  if (!isOpen || !isClient) return null;

  const modalContent = (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center modal-overlay p-4 z-50"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div 
        className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden modal-content"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center">
              <GripVertical className="w-4 h-4 text-yellow-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                Edit Conditional Router
              </h2>
              <p className="text-sm text-gray-600">Configure routing conditions and paths</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          <div className="space-y-6">
            <p className="text-sm text-gray-600">
              Define the rules to route your workflow. The first rule that evaluates to true will be chosen.
            </p>

            {/* Default Path */}
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 bg-gray-50">
              <h3 className="text-lg font-medium text-gray-900 mb-2">Default Path</h3>
              <p className="text-sm text-gray-600">
                This path will be taken if no other conditions match.
              </p>
            </div>

            {/* Conditional Paths */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900">Conditional Paths</h3>
                <button
                  onClick={addCondition}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Add Condition
                </button>
              </div>

              {conditions.map((condition, index) => (
                <div key={condition.id} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3 flex-1">
                      <GripVertical className="w-4 h-4 text-gray-400" />
                      <input
                        type="text"
                        value={condition.name}
                        onChange={(e) => updateConditionName(index, e.target.value)}
                        className="text-lg font-medium bg-transparent border-none focus:ring-0 focus:outline-none flex-1"
                        placeholder="Condition name"
                      />
                    </div>
                    <button
                      onClick={() => removeCondition(index)}
                      className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      title="Remove condition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        JSON Path
                      </label>
                      <input
                        type="text"
                        value={condition.rule?.jsonpath || ''}
                        onChange={(e) => updateConditionRule(index, 'jsonpath', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="$.field"
                      />
                    </div>

                    <div className="flex gap-3">
                      <div className="w-48">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Operator
                        </label>
                        <select
                          value={condition.rule?.operator || 'equals'}
                          onChange={(e) => updateConditionRule(index, 'operator', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                          {CONDITION_OPERATORS.map((op) => (
                            <option key={op.value} value={op.value}>
                              {op.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="flex-1">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Value
                        </label>
                        <input
                          type="text"
                          value={condition.rule?.value || ''}
                          onChange={(e) => updateConditionRule(index, 'value', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="Expected value"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {conditions.length === 0 && (
                <div className="text-center py-12 text-gray-500">
                  <p className="mb-4">No conditional paths defined yet.</p>
                  <button
                    onClick={addCondition}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Add Your First Condition
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
} 