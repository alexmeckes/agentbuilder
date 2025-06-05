import React from 'react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { GripVertical, Trash2 } from 'lucide-react';

interface AttachedToolNodeProps {
  tool: {
    id: string;
    name: string;
    description: string;
    icon?: React.ReactNode;
  };
  onDelete: (toolId: string) => void;
  isDraggable?: boolean;
}

const AttachedToolNode: React.FC<AttachedToolNodeProps> = ({ tool, onDelete, isDraggable = false }) => {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center justify-between bg-gray-100 border border-gray-300 rounded-md p-2 w-full text-left my-1">
            <div className="flex items-center gap-2">
              {isDraggable && <GripVertical className="h-4 w-4 text-gray-500 cursor-grab" />}
              {tool.icon}
              <span className="text-xs font-medium text-gray-800">{tool.name}</span>
            </div>
            <button
              onClick={() => onDelete(tool.id)}
              className="p-1 rounded-md hover:bg-red-100 hover:text-red-600 text-gray-500"
              aria-label={`Remove ${tool.name} tool`}
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-xs">{tool.description}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default AttachedToolNode; 