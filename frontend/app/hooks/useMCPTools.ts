import { useState, useEffect } from 'react';

export interface MCPTool {
  id: string;
  name: string;
  type: 'built-in' | 'mcp';
  description: string;
  category: string;
  server_id?: string;
  server_name?: string;
  server_status?: string;
}

export function useMCPTools() {
  const [tools, setTools] = useState<MCPTool[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mcpEnabled, setMcpEnabled] = useState(false);

  useEffect(() => {
    loadTools();
  }, []);

  const loadTools = async () => {
    try {
      setLoading(true);
      setError(null);

      // Check if MCP is enabled
      const mcpResponse = await fetch('/api/mcp/enabled');
      const mcpData = await mcpResponse.json();
      setMcpEnabled(mcpData.enabled);

      // Load available tools
      const toolsResponse = await fetch('/api/mcp/tools');
      const toolsData = await toolsResponse.json();
      
      if (toolsData.tools) {
        const formattedTools: MCPTool[] = Object.entries(toolsData.tools).map(([key, info]: [string, any]) => ({
          id: key,
          name: key,
          type: info.type || 'built-in',
          description: info.description || 'No description available',
          category: info.category || 'general',
          server_id: info.server_id,
          server_name: info.server_name,
          server_status: info.server_status
        }));
        
        setTools(formattedTools);
      } else {
        setTools([]);
      }
    } catch (err) {
      console.error('Failed to load tools:', err);
      setError('Failed to load available tools');
      setTools([]);
    } finally {
      setLoading(false);
    }
  };

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
      (tool.type === 'mcp' && tool.server_status === 'connected')
    );
  };

  return {
    tools,
    loading,
    error,
    mcpEnabled,
    getToolsByCategory,
    getBuiltInTools,
    getMCPTools,
    getActiveTools,
    refresh: loadTools
  };
} 