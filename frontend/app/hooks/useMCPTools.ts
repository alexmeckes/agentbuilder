import { useState, useEffect } from 'react';

export interface MCPTool {
  id: string;
  name: string;
  type: 'built-in' | 'mcp' | 'composio' | 'app';
  source: 'built-in' | 'composio' | 'mcp';
  description: string;
  category: string;
  server_id?: string;
  server_name?: string;
  server_status?: string;
  app?: string;
  enabled?: boolean;
  // App Node specific fields
  appId?: string;
  availableActions?: string[];
  defaultAction?: string;
  isComposioApp?: boolean;
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
      
      // NEW: If userId is provided, try to get user-specific tools first
      if (userId) {
        try {
          console.log('🔍 Loading user-specific tools for:', userId);
          
          // Get user settings from localStorage
          const userSettingsStr = localStorage.getItem('userSettings');
          const userSettings = userSettingsStr ? JSON.parse(userSettingsStr) : null;
          
          if (userSettings && userSettings.userId === userId) {
            console.log('📝 Found user settings, fetching personalized tools...');
            
            const userToolsResponse = await fetch('/api/mcp/user-tools', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ userId, userSettings })
            });
            
            if (userToolsResponse.ok) {
              const userToolsData = await userToolsResponse.json();
              
              if (userToolsData.success && userToolsData.tools) {
                const toolsArray = userToolsData.tools as MCPTool[];
                setTools(toolsArray);
                setMcpEnabled(toolsArray.some(tool => tool.type === 'mcp' || tool.type === 'composio' || tool.type === 'app'));
                console.log('✅ User-specific tools loaded:', {
                  total: toolsArray.length,
                  appNodes: toolsArray.filter(t => t.type === 'app').length,
                  composio: toolsArray.filter(t => t.type === 'composio').length,
                  mcp: toolsArray.filter(t => t.type === 'mcp').length,
                  builtIn: toolsArray.filter(t => t.type === 'built-in').length
                });
                return; // Success! Exit early
              }
            }
          }
          
          console.log('⚠️ User-specific tools failed or no settings found, falling back to general tools...');
        } catch (userToolsError) {
          console.warn('⚠️ Failed to load user-specific tools:', userToolsError);
          // Continue with fallback approach
        }
      }
      
      // FALLBACK: Use the original general tools approach
      const url = userId ? `/api/mcp/tools?userId=${encodeURIComponent(userId)}` : '/api/mcp/tools';
      console.log('🔍 Loading general tools from:', url);
      
      const response = await fetch(url);
      const data = await response.json();
      
      if (response.ok && data.tools) {
        const toolsArray = Object.values(data.tools) as MCPTool[];
        setTools(toolsArray);
        setMcpEnabled(toolsArray.some(tool => tool.type === 'mcp' || tool.type === 'app'));
        console.log('✅ General tools loaded:', {
          total: toolsArray.length,
          appNodes: toolsArray.filter(t => t.type === 'app').length,
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

  const getAppNodes = () => {
    return tools.filter(tool => tool.type === 'app');
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
    getAppNodes,
    getActiveTools,
    refresh: loadTools
  };
} 