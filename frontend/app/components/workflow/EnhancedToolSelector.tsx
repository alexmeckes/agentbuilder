'use client';

import React, { useState } from 'react';
import { useMCPTools, MCPTool } from '../../hooks/useMCPTools';
import { 
  Search, 
  Database, 
  FileText, 
  Github, 
  MessageSquare, 
  Puzzle, 
  Globe,
  Settings,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  Loader2,
  Server
} from 'lucide-react';

interface EnhancedToolSelectorProps {
  value: string;
  onChange: (toolId: string) => void;
  className?: string;
  disabled?: boolean;
  onBlur?: () => void;
  onKeyDown?: (e: React.KeyboardEvent) => void;
}

interface BuiltInTool {
  id: string;
  name: string;
  description: string;
  category: string;
  type: 'built-in';
  server_status: string;
  server_name?: never;
}

type CombinedTool = MCPTool | BuiltInTool;

const getCategoryIcon = (category: string) => {
  switch (category) {
    case 'web': return <Globe className="w-4 h-4" />;
    case 'database': return <Database className="w-4 h-4" />;
    case 'files': return <FileText className="w-4 h-4" />;
    case 'development': return <Github className="w-4 h-4" />;
    case 'communication': return <MessageSquare className="w-4 h-4" />;
    case 'integration': return <Server className="w-4 h-4" />;
    default: return <Puzzle className="w-4 h-4" />;
  }
};

const getStatusIcon = (status?: string) => {
  if (!status) return null;
  
  switch (status) {
    case 'connected': return <CheckCircle className="w-3 h-3 text-green-600" />;
    case 'connecting': return <Clock className="w-3 h-3 text-yellow-600" />;
    case 'error': return <XCircle className="w-3 h-3 text-red-600" />;
    default: return <XCircle className="w-3 h-3 text-gray-600" />;
  }
};

const builtInTools: BuiltInTool[] = [
  { 
    id: 'search_web', 
    name: 'Web Search', 
    description: 'Search the internet for information', 
    category: 'web',
    type: 'built-in',
    server_status: 'built-in'
  },
  { 
    id: 'visit_webpage', 
    name: 'Visit Webpage', 
    description: 'Visit and read webpage content', 
    category: 'web',
    type: 'built-in',
    server_status: 'built-in'
  }
];

export default function EnhancedToolSelector({
  value,
  onChange,
  className = '',
  disabled = false,
  onBlur,
  onKeyDown
}: EnhancedToolSelectorProps) {
  const { tools, loading, error, mcpEnabled, getToolsByCategory, getActiveTools } = useMCPTools();
  const [searchQuery, setSearchQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Combine built-in and MCP tools
  const allTools: CombinedTool[] = [
    ...builtInTools,
    ...tools
  ];

  // Filter tools based on search and category
  const filteredTools = allTools.filter(tool => {
    const matchesSearch = tool.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         tool.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || tool.category === selectedCategory;
    const isActive = tool.type === 'built-in' || tool.server_status === 'connected';
    
    return matchesSearch && matchesCategory && isActive;
  });

  // Get unique categories
  const categories = ['all', ...new Set(allTools.map(tool => tool.category))];

  // Get tool by ID
  const selectedTool = allTools.find(tool => tool.id === value);

  const handleToolSelect = (toolId: string) => {
    onChange(toolId);
    setShowDropdown(false);
    setSearchQuery('');
  };

  if (loading) {
    return (
      <div className={`flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 ${className}`}>
        <Loader2 className="w-4 h-4 animate-spin" />
        <span className="text-sm text-gray-600">Loading tools...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`flex items-center gap-2 px-3 py-2 border border-red-300 rounded-lg bg-red-50 ${className}`}>
        <AlertCircle className="w-4 h-4 text-red-600" />
        <span className="text-sm text-red-700">Failed to load tools</span>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      {/* Selected Tool Display */}
      <button
        type="button"
        onClick={() => !disabled && setShowDropdown(!showDropdown)}
        onKeyDown={onKeyDown}
        disabled={disabled}
        className={`w-full flex items-center justify-between px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white ${
          disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-50 cursor-pointer'
        }`}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {selectedTool ? (
            <>
              {getCategoryIcon(selectedTool.category)}
              <span className="font-medium text-gray-900 truncate">{selectedTool.name}</span>
              {selectedTool.type === 'mcp' && selectedTool.server_name && (
                <div className="flex items-center gap-1">
                  {getStatusIcon(selectedTool.server_status)}
                  <span className="text-xs text-gray-500 truncate">
                    {selectedTool.server_name}
                  </span>
                </div>
              )}
            </>
          ) : (
            <>
              <Puzzle className="w-4 h-4 text-gray-400" />
              <span className="text-gray-500">Select a tool...</span>
            </>
          )}
        </div>
        <div className="text-gray-400">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {/* Dropdown */}
      {showDropdown && (
        <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-80 overflow-hidden">
          {/* Search */}
          <div className="p-3 border-b border-gray-200">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search tools..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Category Filter */}
          <div className="px-3 py-2 border-b border-gray-200 bg-gray-50">
            <div className="flex flex-wrap gap-1">
              {categories.map(category => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`px-2 py-1 text-xs rounded-full border transition-colors ${
                    selectedCategory === category
                      ? 'bg-blue-100 text-blue-700 border-blue-300'
                      : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-100'
                  }`}
                >
                  {category === 'all' ? 'All' : category.charAt(0).toUpperCase() + category.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Tool List */}
          <div className="max-h-64 overflow-y-auto">
            {filteredTools.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                {searchQuery ? 'No tools match your search' : 'No tools available'}
              </div>
            ) : (
              <div className="py-1">
                {/* Built-in Tools Section */}
                {filteredTools.some(tool => tool.type === 'built-in') && (
                  <>
                    <div className="px-3 py-2 text-xs font-medium text-gray-500 bg-gray-50 border-b border-gray-200">
                      Built-in Tools
                    </div>
                    {filteredTools
                      .filter(tool => tool.type === 'built-in')
                      .map(tool => (
                        <button
                          key={tool.id}
                          onClick={() => handleToolSelect(tool.id)}
                          className={`w-full flex items-center gap-3 px-3 py-2 hover:bg-gray-50 transition-colors ${
                            value === tool.id ? 'bg-blue-50 text-blue-700' : 'text-gray-900'
                          }`}
                        >
                          {getCategoryIcon(tool.category)}
                          <div className="flex-1 text-left">
                            <div className="font-medium">{tool.name}</div>
                            <div className="text-xs text-gray-500">{tool.description}</div>
                          </div>
                        </button>
                      ))}
                  </>
                )}

                {/* MCP Tools Section */}
                {filteredTools.some(tool => tool.type === 'mcp') && (
                  <>
                    <div className="px-3 py-2 text-xs font-medium text-gray-500 bg-gray-50 border-b border-gray-200 flex items-center gap-2">
                      <Server className="w-3 h-3" />
                      MCP Integration Tools
                      {!mcpEnabled && (
                        <span className="text-red-500">(Disabled)</span>
                      )}
                    </div>
                    {filteredTools
                      .filter(tool => tool.type === 'mcp')
                      .map(tool => (
                        <button
                          key={tool.id}
                          onClick={() => handleToolSelect(tool.id)}
                          className={`w-full flex items-center gap-3 px-3 py-2 hover:bg-gray-50 transition-colors ${
                            value === tool.id ? 'bg-blue-50 text-blue-700' : 'text-gray-900'
                          }`}
                        >
                          {getCategoryIcon(tool.category)}
                          <div className="flex-1 text-left">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{tool.name}</span>
                              {getStatusIcon(tool.server_status)}
                            </div>
                            <div className="text-xs text-gray-500">{tool.description}</div>
                            {tool.type === 'mcp' && tool.server_name && (
                              <div className="text-xs text-blue-600">via {tool.server_name}</div>
                            )}
                          </div>
                        </button>
                      ))}
                  </>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          {mcpEnabled && (
            <div className="px-3 py-2 border-t border-gray-200 bg-gray-50">
              <div className="flex items-center justify-between text-xs text-gray-600">
                <span>{filteredTools.filter(t => t.type === 'mcp').length} MCP tools available</span>
                <button
                  onClick={() => {
                    setShowDropdown(false);
                    // Could open settings modal here
                  }}
                  className="flex items-center gap-1 hover:text-gray-800"
                >
                  <Settings className="w-3 h-3" />
                  Manage
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Click outside to close */}
      {showDropdown && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowDropdown(false)}
        />
      )}
    </div>
  );
} 