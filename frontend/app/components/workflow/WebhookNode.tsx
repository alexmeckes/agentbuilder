'use client'

import { useState, useEffect } from 'react'
import { Handle, Position, NodeProps } from 'reactflow'
import { Link2, Copy, Check, AlertTriangle } from 'lucide-react'
import { useReactFlow } from 'reactflow';

// This should match the backend's WorkflowDefinition model
interface WorkflowDefinition {
  nodes: any[];
  edges: any[];
}

export function WebhookNode({ data, id }: NodeProps<{ label: string }>) {
  const [webhookUrl, setWebhookUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const { getNodes, getEdges } = useReactFlow();

  useEffect(() => {
    // Function to register the webhook and get the URL
    const registerWebhook = async () => {
      try {
        const nodes = getNodes();
        const edges = getEdges();
        
        const workflow: WorkflowDefinition = {
          nodes: nodes.map(n => ({ ...n, data: { ...n.data } })),
          edges: edges,
        };

        const response = await fetch('/api/webhooks/register', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(workflow),
        });

        if (!response.ok) {
          throw new Error('Failed to register webhook');
        }

        const result = await response.json();
        setWebhookUrl(result.url);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An unknown error occurred');
        setWebhookUrl(null);
      }
    };

    registerWebhook();
  }, [id, getNodes, getEdges]);

  const handleCopy = () => {
    if (webhookUrl) {
      navigator.clipboard.writeText(webhookUrl);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md border border-gray-200 p-4 w-64">
      <div className="flex items-center gap-2 mb-2">
        <div className="p-2 bg-purple-100 rounded-full">
          <Link2 className="w-5 h-5 text-purple-600" />
        </div>
        <h3 className="font-bold text-lg text-gray-800">{data.label}</h3>
      </div>

      <p className="text-sm text-gray-600 mb-4">
        This workflow is triggered by a POST request to the URL below.
      </p>

      {error && (
        <div className="p-2 bg-red-100 text-red-700 rounded-md text-sm flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" />
          <span>Error: {error}</span>
        </div>
      )}

      {webhookUrl ? (
        <div className="flex items-center gap-2 p-2 bg-gray-100 rounded-md">
          <input
            type="text"
            value={webhookUrl}
            readOnly
            className="w-full bg-transparent text-sm text-gray-700 outline-none"
          />
          <button onClick={handleCopy} className="p-1 text-gray-500 hover:text-gray-800">
            {isCopied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>
      ) : (
        <div className="p-2 bg-gray-100 rounded-md text-sm text-gray-500">
        Generating webhook URL...
        </div>
      )}
      
      <Handle
        type="source"
        position={Position.Right}
        className="!w-4 !h-4 !bg-gray-500"
      />
    </div>
  );
} 