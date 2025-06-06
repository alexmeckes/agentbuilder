'use client';

import React from 'react';
import { Check, X, AlertTriangle } from 'lucide-react';

interface ConfirmationModalProps {
  isOpen: boolean;
  plan: any[]; // The list of actions from the AI
  onConfirm: () => void;
  onCancel: () => void;
}

const getActionVerb = (action: string) => {
  switch (action) {
    case 'ADD_NODE': return 'Add';
    case 'DELETE_NODE': return 'Delete';
    case 'UPDATE_NODE': return 'Update';
    case 'CREATE_EDGE': return 'Connect';
    case 'DELETE_EDGE': return 'Disconnect';
    default: return 'Perform';
  }
};

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({ isOpen, plan, onConfirm, onCancel }) => {
  if (!isOpen) {
    return null;
  }

  const destructiveActions = plan.filter(a => a.action.includes('DELETE'));

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg">
        <div className="p-6 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">Confirm Changes</h2>
              <p className="text-sm text-slate-500">The AI assistant wants to perform the following actions.</p>
            </div>
          </div>
        </div>
        
        <div className="p-6 max-h-80 overflow-y-auto">
          <p className="text-sm text-slate-600 mb-4">Please review this plan before it's executed. This includes {destructiveActions.length} potentially destructive action(s).</p>
          <div className="space-y-2">
            {plan.map((item, index) => (
              <div key={index} className={`p-3 rounded-lg border ${item.action.includes('DELETE') ? 'bg-red-50 border-red-200' : 'bg-slate-50 border-slate-200'}`}>
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-bold uppercase tracking-wider ${item.action.includes('DELETE') ? 'text-red-600' : 'text-slate-600'}`}>
                    {getActionVerb(item.action)}
                  </span>
                  <div className="text-sm text-slate-800 font-mono bg-white px-2 py-0.5 rounded">
                    {item.nodeId || item.edgeId || item.payload?.id}
                  </div>
                </div>
                {item.payload && (
                  <div className="text-xs text-slate-500 mt-1 pl-4">
                    with data: {JSON.stringify(item.payload, null, 2)}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="p-4 bg-slate-50 flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-green-600 to-emerald-600 rounded-lg hover:opacity-90 transition-opacity"
          >
            <Check className="w-4 h-4 inline-block mr-1" />
            Confirm & Apply
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationModal; 