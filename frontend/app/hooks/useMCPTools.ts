import { useState, useEffect } from 'react';

export interface MCPTool {
  id: string;
  name: string;
  type: 'built-in' | 'mcp' | 'composio';
  source: 'built-in' | 'composio' | 'mcp';
  description: string;
  category: string;
  server_id?: string;
  server_name?: string;
  server_status?: string;
  app?: string;
  enabled?: boolean;
}

export function useMCPTools(userId?: string) {
  const [tools, setTools] = useState<MCPTool[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mcpEnabled, setMcpEnabled] = useState(false);

  const loadTools = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Build URL with userId parameter if provided
      const url = userId ? `/api/mcp/tools?userId=${encodeURIComponent(userId)}` : '/api/mcp/tools';
      console.log('🔍 Loading tools from:', url);
      
      const response = await fetch(url);
      const data = await response.json();
      
      if (response.ok && data.tools) {
        const toolsArray = Object.values(data.tools) as MCPTool[];
        setTools(toolsArray);
        setMcpEnabled(toolsArray.some(tool => tool.type === 'mcp'));
        console.log('✅ Tools loaded:', {
          total: toolsArray.length,
          composio: toolsArray.filter(t => t.type === 'composio').length,
          mcp: toolsArray.filter(t => t.type === 'mcp').length,
          builtIn: toolsArray.filter(t => t.type === 'built-in').length
        });
      } else {
        setError(data.error || 'Failed to load tools');
        setTools([]);
        setMcpEnabled(false);
      }
    } catch (err) {
      console.error('Error loading MCP tools:', err);
      setError('Failed to connect to backend');
      setTools([]);
      setMcpEnabled(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTools();
  }, [userId]); // Re-load when userId changes

  const getToolsByCategory = () => {
    const categories: Record<string, MCPTool[]> = {};
    
    tools.forEach(tool => {
      const category = tool.category || 'general';
      if (!categories[category]) {
        categories[category] = [];
      }
      categories[category].push(tool);
    });

    return categories;
  };

  const getBuiltInTools = () => {
    return tools.filter(tool => tool.type === 'built-in');
  };

  const getMCPTools = () => {
    return tools.filter(tool => tool.type === 'mcp');
  };

  const getActiveTools = () => {
    return tools.filter(tool => 
      tool.type === 'built-in' || 
      (tool.type === 'mcp' && tool.server_status === 'connected') ||
      (tool.type === 'composio' && (tool.server_status === 'connected' || tool.server_status === 'configured'))
    );
  };

  const getComposioTools = () => {
    return tools.filter(tool => tool.type === 'composio');
  };

  return {
    tools,
    loading,
    error,
    mcpEnabled,
    getToolsByCategory,
    getBuiltInTools,
    getMCPTools,
    getComposioTools,
    getActiveTools,
    refresh: loadTools
  };
} 