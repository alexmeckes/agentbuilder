'use client'

import { useState, useEffect } from 'react';
import { X, Save, Plus, Trash2, GripVertical } from 'lucide-react';

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
}

export function ConditionalNodeEditorModal({ isOpen, onClose, nodeId, nodeData }: ModalProps) {
  const [conditions, setConditions] = useState<Condition[]>([]);

  useEffect(() => {
    if (isOpen) {
      // Deep copy to avoid direct mutation
      setConditions(JSON.parse(JSON.stringify(nodeData.conditions)));
    }
  }, [isOpen, nodeData.conditions]);

  const handleSave = () => {
    nodeData.onNodeUpdate(nodeId, { conditions });
    onClose();
  };
  
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full">
        <div className="p-4 border-b flex justify-between items-center">
          <h2 className="text-xl font-semibold">Edit Conditional Router</h2>
          <button onClick={onClose}><X className="w-5 h-5" /></button>
        </div>

        <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
          <p className="text-sm text-gray-600">
            Define the rules to route your workflow. The first rule that evaluates to true will be chosen.
          </p>
          {conditions.map((condition, index) => (
            <div key={condition.id} className="p-3 border rounded-md bg-gray-50 flex items-start gap-2">
              <GripVertical className="w-5 h-5 text-gray-400 mt-1 cursor-grab" />
              <div className="flex-1">
                <input
                  type="text"
                  value={condition.name}
                  onChange={(e) => {
                    const newConditions = [...conditions];
                    newConditions[index].name = e.target.value;
                    setConditions(newConditions);
                  }}
                  className="font-semibold text-gray-800 w-full mb-2"
                  disabled={condition.is_default}
                />
                
                {!condition.is_default && (
                  <div className="grid grid-cols-3 gap-2">
                    <input 
                      type="text" 
                      placeholder="JSONPath (e.g., $.intent)" 
                      value={condition.rule?.jsonpath || ''}
                      onChange={(e) => {
                        const newConditions = [...conditions];
                        newConditions[index].rule = { 
                          jsonpath: e.target.value, 
                          operator: newConditions[index].rule?.operator || 'equals',
                          value: newConditions[index].rule?.value || '',
                        };
                        setConditions(newConditions);
                      }}
                      className="text-sm p-1 border rounded"/>
                    <select 
                      value={condition.rule?.operator || 'equals'}
                      onChange={(e) => {
                        const newConditions = [...conditions];
                        newConditions[index].rule = { 
                          jsonpath: newConditions[index].rule?.jsonpath || '',
                          operator: e.target.value,
                          value: newConditions[index].rule?.value || '',
                        };
                        setConditions(newConditions);
                      }}
                      className="text-sm p-1 border rounded">
                      <option value="equals">equals</option>
                      <option value="contains">contains</option>
                      {/* Add other operators as needed */}
                    </select>
                    <input 
                      type="text" 
                      placeholder="Value (e.g., 'faq')" 
                      value={condition.rule?.value || ''}
                      onChange={(e) => {
                        const newConditions = [...conditions];
                        newConditions[index].rule = { 
                          jsonpath: newConditions[index].rule?.jsonpath || '',
                          operator: newConditions[index].rule?.operator || 'equals',
                          value: e.target.value 
                        };
                        setConditions(newConditions);
                      }}
                      className="text-sm p-1 border rounded"/>
                  </div>
                )}
              </div>
              {!condition.is_default && (
                <button 
                  onClick={() => {
                    const newConditions = conditions.filter((_, i) => i !== index);
                    setConditions(newConditions);
                  }}
                  className="text-red-500 hover:text-red-700">
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
          <button 
            onClick={() => setConditions([...conditions, { id: `cond_${Date.now()}`, name: 'New Path', rule: { jsonpath: '', operator: 'equals', value:''} }])}
            className="w-full flex items-center justify-center gap-2 text-sm text-blue-600 hover:text-blue-800 mt-2">
            <Plus className="w-4 h-4" />
            Add Path
          </button>
        </div>

        <div className="p-4 border-t flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 border rounded-md text-gray-700 hover:bg-gray-50">Cancel</button>
          <button onClick={handleSave} className="px-4 py-2 border rounded-md bg-blue-600 text-white hover:bg-blue-700">
            <Save className="w-4 h-4 inline-block mr-2" />
            Save
          </button>
        </div>
      </div>
    </div>
  );
} 