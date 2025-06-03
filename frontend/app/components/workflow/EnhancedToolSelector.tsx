'use client';

import React, { useState, useEffect } from 'react';
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
  Server,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Lightbulb
} from 'lucide-react';

interface ToolRecommendation {
  tool_id: string;
  tool_name: string;
  confidence: number;
  reasoning: string;
  use_case: string;
  category?: string;
  server_name?: string;
  full_description?: string;
}

interface EnhancedToolSelectorProps {
  value: string;
  onChange: (toolId: string) => void;
  className?: string;
  disabled?: boolean;
  onBlur?: () => void;
  onKeyDown?: (e: React.KeyboardEvent) => void;
  // Add context for AI recommendations
  nodeData?: {
    name?: string;
    instructions?: string;
    type?: string;
  };
  workflowContext?: any;
}

type BuiltInTool = {
  id: string;
  name: string;
  description: string;
  category: string;
  type: 'built-in';
  server_status: 'built-in';
};

type CombinedTool = MCPTool | BuiltInTool;

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
  onKeyDown,
  nodeData,
  workflowContext
}: EnhancedToolSelectorProps) {
  const { tools, loading, error, mcpEnabled, getToolsByCategory, getActiveTools } = useMCPTools();
  const [searchQuery, setSearchQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [recommendations, setRecommendations] = useState<ToolRecommendation[]>([]);
  const [loadingRecommendations, setLoadingRecommendations] = useState(false);
  const [showRecommendations, setShowRecommendations] = useState(true);

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

  // Load AI recommendations when dropdown opens and we have context
  useEffect(() => {
    if (showDropdown && nodeData && tools.length > 0 && !loadingRecommendations && recommendations.length === 0) {
      loadToolRecommendations();
    }
  }, [showDropdown, nodeData, tools.length]);

  const loadToolRecommendations = async () => {
    if (!nodeData) return;
    
    setLoadingRecommendations(true);
    try {
      const response = await fetch('/api/ai/tool-recommendations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          node_data: nodeData,
          node_type: 'tool',
          user_query: `Recommend tools for: ${nodeData.name || 'tool node'}`,
          workflow_context: workflowContext
        }),
      });

      const data = await response.json();
      
      if (data.success && data.recommendations) {
        setRecommendations(data.recommendations);
      }
    } catch (error) {
      console.error('Failed to load tool recommendations:', error);
    } finally {
      setLoadingRecommendations(false);
    }
  };

  const handleToolSelect = (toolId: string) => {
    onChange(toolId);
    setShowDropdown(false);
    setSearchQuery('');
  };

  const handleRecommendationSelect = (rec: ToolRecommendation) => {
    onChange(rec.tool_id);
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

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'web': return <Globe className="w-4 h-4" />;
      case 'database': return <Database className="w-4 h-4" />;
      case 'files': return <FileText className="w-4 h-4" />;
      case 'development': 
      case 'repository':
      case 'issues':
      case 'version_control':
      case 'search': return <Github className="w-4 h-4" />;
      case 'communication': return <MessageSquare className="w-4 h-4" />;
      default: return <Puzzle className="w-4 h-4" />;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'connected': return <CheckCircle className="w-3 h-3 text-green-600" />;
      case 'error': return <XCircle className="w-3 h-3 text-red-600" />;
      case 'connecting': return <Clock className="w-3 h-3 text-yellow-600" />;
      default: return <AlertCircle className="w-3 h-3 text-gray-600" />;
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.9) return 'bg-green-100 text-green-800';
    if (confidence >= 0.8) return 'bg-blue-100 text-blue-800';
    if (confidence >= 0.7) return 'bg-yellow-100 text-yellow-800';
    return 'bg-gray-100 text-gray-800';
  };

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
                  {getStatusIcon(selectedTool.server_status || 'unknown')}
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
        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showDropdown ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown */}
      {showDropdown && (
        <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg">
          {/* Search and Category Filter */}
          <div className="p-3 border-b border-gray-200 space-y-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search tools..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {categories.map(category => (
                <option key={category} value={category}>
                  {category === 'all' ? 'All Categories' : category.charAt(0).toUpperCase() + category.slice(1)}
                </option>
              ))}
            </select>
          </div>

          <div className="max-h-80 overflow-y-auto">
            {/* AI Recommendations Section */}
            {(recommendations.length > 0 || loadingRecommendations) && (
              <div className="border-b border-gray-200">
                <button
                  onClick={() => setShowRecommendations(!showRecommendations)}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 transition-colors"
                >
                  <Sparkles className="w-3 h-3" />
                  AI Recommendations
                  {showRecommendations ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </button>
                
                {showRecommendations && (
                  <div className="py-1">
                    {loadingRecommendations ? (
                      <div className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Getting smart recommendations...
                      </div>
                    ) : (
                      recommendations.map((rec, index) => (
                        <button
                          key={rec.tool_id}
                          onClick={() => handleRecommendationSelect(rec)}
                          className={`w-full flex items-start gap-3 px-3 py-3 hover:bg-blue-50 transition-colors border-l-4 ${
                            rec.confidence >= 0.9 ? 'border-green-500' : 
                            rec.confidence >= 0.8 ? 'border-blue-500' : 'border-yellow-500'
                          } ${value === rec.tool_id ? 'bg-blue-50 text-blue-700' : 'text-gray-900'}`}
                        >
                          <Lightbulb className="w-4 h-4 mt-0.5 text-blue-600" />
                          <div className="flex-1 text-left">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{rec.tool_name}</span>
                              <span className={`px-1.5 py-0.5 text-xs rounded-full ${getConfidenceColor(rec.confidence)}`}>
                                {Math.round(rec.confidence * 100)}%
                              </span>
                            </div>
                            <div className="text-xs text-gray-600 mt-1">{rec.reasoning}</div>
                            <div className="text-xs text-blue-600 mt-1">{rec.use_case}</div>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            )}

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
                              {getStatusIcon(tool.server_status || 'unknown')}
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