'use client';

import React, { useState, useEffect } from 'react';
import { 
  Server, 
  Plus, 
  Trash2, 
  TestTube, 
  Database,
  FileText,
  Github,
  MessageSquare,
  Puzzle,
  AlertCircle,
  Loader2,
  Eye,
  EyeOff,
  CheckCircle,
  XCircle,
  Clock
} from 'lucide-react';

interface MCPServer {
  id: string;
  name: string;
  description: string;
  status: 'connected' | 'disconnected' | 'connecting' | 'error';
  last_error?: string;
  tool_count: number;
  capabilities: string[];
}

interface AvailableServer {
  id: string;
  name: string;
  description: string;
  command: string[];
  config_schema: Record<string, any>;
  category: string;
}

const getCategoryIcon = (category: string) => {
  switch (category) {
    case 'database': return <Database className="w-4 h-4" />;
    case 'files': return <FileText className="w-4 h-4" />;
    case 'development': return <Github className="w-4 h-4" />;
    case 'communication': return <MessageSquare className="w-4 h-4" />;
    default: return <Puzzle className="w-4 h-4" />;
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'connected': return 'bg-green-500';
    case 'connecting': return 'bg-yellow-500';
    case 'error': return 'bg-red-500';
    default: return 'bg-gray-500';
  }
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'connected': return <CheckCircle className="w-4 h-4 text-green-600" />;
    case 'connecting': return <Clock className="w-4 h-4 text-yellow-600" />;
    case 'error': return <XCircle className="w-4 h-4 text-red-600" />;
    default: return <XCircle className="w-4 h-4 text-gray-600" />;
  }
};

export default function MCPServersPanel() {
  const [mcpEnabled, setMcpEnabled] = useState(false);
  const [mcpAvailable, setMcpAvailable] = useState(false);
  const [servers, setServers] = useState<MCPServer[]>([]);
  const [availableServers, setAvailableServers] = useState<AvailableServer[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'servers' | 'browse'>('servers');
  const [isAddingServer, setIsAddingServer] = useState(false);
  const [selectedServer, setSelectedServer] = useState<AvailableServer | null>(null);
  const [serverConfig, setServerConfig] = useState<Record<string, any>>({});
  const [testingServer, setTestingServer] = useState<string | null>(null);
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});
  const [showAddDialog, setShowAddDialog] = useState(false);

  useEffect(() => {
    loadMCPStatus();
    loadServers();
    loadAvailableServers();
  }, []);

  const loadMCPStatus = async () => {
    try {
      const response = await fetch('/api/mcp/enabled');
      const data = await response.json();
      setMcpEnabled(data.enabled);
      setMcpAvailable(data.available);
    } catch (error) {
      console.error('Failed to check MCP status:', error);
    }
  };

  const loadServers = async () => {
    try {
      const response = await fetch('/api/mcp/servers');
      const data = await response.json();
      setServers(Object.values(data.servers || {}));
    } catch (error) {
      console.error('Failed to load MCP servers:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadAvailableServers = async () => {
    try {
      const response = await fetch('/api/mcp/servers/available');
      const data = await response.json();
      setAvailableServers(data.servers || []);
    } catch (error) {
      console.error('Failed to load available servers:', error);
    }
  };

  const addServer = async () => {
    if (!selectedServer) return;

    setIsAddingServer(true);
    try {
      const config = {
        id: `${selectedServer.id}-${Date.now()}`,
        name: `${selectedServer.name} Instance`,
        description: selectedServer.description,
        command: selectedServer.command,
        env: serverConfig
      };

      const response = await fetch('/api/mcp/servers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });

      if (response.ok) {
        await loadServers();
        setSelectedServer(null);
        setServerConfig({});
        setShowAddDialog(false);
      } else {
        const error = await response.json();
        console.error('Failed to add server:', error.detail);
      }
    } catch (error) {
      console.error('Error adding server:', error);
    } finally {
      setIsAddingServer(false);
    }
  };

  const removeServer = async (serverId: string) => {
    try {
      const response = await fetch(`/api/mcp/servers/${serverId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        await loadServers();
      }
    } catch (error) {
      console.error('Error removing server:', error);
    }
  };

  const testServer = async (serverId: string) => {
    setTestingServer(serverId);
    try {
      const response = await fetch(`/api/mcp/servers/${serverId}/test`, {
        method: 'POST'
      });
      const result = await response.json();
      
      // Refresh servers to get updated status
      await loadServers();
      
      if (result.success) {
        console.log(`Server ${serverId} test successful:`, result);
      } else {
        console.error(`Server ${serverId} test failed:`, result.error);
      }
    } catch (error) {
      console.error('Error testing server:', error);
    } finally {
      setTestingServer(null);
    }
  };

  const renderConfigField = (key: string, schema: any) => {
    const value = serverConfig[key] || schema.default || '';
    const isPassword = schema.type === 'password';
    const showPassword = showPasswords[key] || false;

    return (
      <div key={key} className="space-y-2">
        <label htmlFor={key} className="flex items-center gap-2 text-sm font-medium text-gray-700">
          {key}
          {schema.required && <span className="text-red-500">*</span>}
        </label>
        {schema.type === 'boolean' ? (
          <label className="flex items-center">
            <input
              type="checkbox"
              id={key}
              checked={value}
              onChange={(e) => 
                setServerConfig(prev => ({ ...prev, [key]: e.target.checked }))
              }
              className="mr-2"
            />
            <span className="text-sm text-gray-600">Enable {key}</span>
          </label>
        ) : (
          <div className="relative">
            <input
              id={key}
              type={isPassword && !showPassword ? 'password' : 'text'}
              value={value}
              onChange={(e) => 
                setServerConfig(prev => ({ ...prev, [key]: e.target.value }))
              }
              placeholder={schema.default || `Enter ${key}`}
              required={schema.required}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {isPassword && (
              <button
                type="button"
                className="absolute right-2 top-2 p-1 text-gray-400 hover:text-gray-600"
                onClick={() => setShowPasswords(prev => ({ ...prev, [key]: !showPassword }))}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            )}
          </div>
        )}
        {schema.description && (
          <p className="text-xs text-gray-500">{schema.description}</p>
        )}
      </div>
    );
  };

  if (!mcpAvailable) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center gap-2 mb-4">
          <Server className="w-5 h-5" />
          <h3 className="text-lg font-semibold">MCP Server Integration</h3>
        </div>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-yellow-600" />
            <p className="text-sm text-yellow-800">
              MCP integration is not available. Please install the MCP dependencies: <code className="bg-yellow-100 px-1 py-0.5 rounded">pip install mcp</code>
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!mcpEnabled) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center gap-2 mb-4">
          <Server className="w-5 h-5" />
          <h3 className="text-lg font-semibold">MCP Server Integration</h3>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-blue-600" />
            <p className="text-sm text-blue-800">
              MCP integration is available but not enabled. Set <code className="bg-blue-100 px-1 py-0.5 rounded">ENABLE_MCP_SERVERS=true</code> in your environment to enable.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <div className="flex items-center gap-2 mb-6">
        <Server className="w-5 h-5" />
        <div>
          <h3 className="text-lg font-semibold">MCP Server Integration</h3>
          <p className="text-sm text-gray-600">Manage Model Context Protocol servers to extend workflow capabilities</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('servers')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'servers'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Configured Servers
          </button>
          <button
            onClick={() => setActiveTab('browse')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'browse'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Browse Available
          </button>
        </nav>
      </div>

      {/* Configured Servers Tab */}
      {activeTab === 'servers' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-lg font-medium">Active MCP Servers</h4>
              <p className="text-sm text-gray-600">
                {servers.length === 0 ? 'No servers configured yet' : `${servers.length} server(s) configured`}
              </p>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          ) : servers.length === 0 ? (
            <div className="text-center py-8">
              <Server className="w-12 h-12 mx-auto text-gray-400 mb-4" />
              <h4 className="text-lg font-medium mb-2">No MCP Servers</h4>
              <p className="text-gray-600 mb-4">
                Add your first MCP server to extend workflow capabilities
              </p>
              <button 
                onClick={() => setActiveTab('browse')}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                <Plus className="w-4 h-4" />
                Browse Available Servers
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {servers.map((server) => (
                <div key={server.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        {getStatusIcon(server.status)}
                        <h4 className="font-medium">{server.name}</h4>
                        <span className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded">
                          {server.tool_count} tools
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">
                        {server.description}
                      </p>
                      {server.capabilities.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-2">
                          {server.capabilities.map((capability) => (
                            <span key={capability} className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded border">
                              {capability}
                            </span>
                          ))}
                        </div>
                      )}
                      {server.last_error && (
                        <div className="bg-red-50 border border-red-200 rounded p-2 mt-2">
                          <div className="flex items-center gap-2">
                            <AlertCircle className="h-4 w-4 text-red-600" />
                            <p className="text-xs text-red-800">{server.last_error}</p>
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <button
                        onClick={() => testServer(server.id)}
                        disabled={testingServer === server.id}
                        className="inline-flex items-center gap-2 px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50"
                      >
                        {testingServer === server.id ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <TestTube className="w-3 h-3" />
                        )}
                        Test
                      </button>
                      <button
                        onClick={() => removeServer(server.id)}
                        className="inline-flex items-center gap-2 px-3 py-1 text-sm text-red-600 border border-red-300 rounded hover:bg-red-50"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Browse Available Tab */}
      {activeTab === 'browse' && (
        <div className="space-y-4">
          <div>
            <h4 className="text-lg font-medium">Available MCP Servers</h4>
            <p className="text-sm text-gray-600">
              Browse and install popular MCP servers from the community
            </p>
          </div>

          <div className="grid gap-4">
            {availableServers.map((server) => (
              <div key={server.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      {getCategoryIcon(server.category)}
                      <h4 className="font-medium">{server.name}</h4>
                      <span className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded">
                        {server.category}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">
                      {server.description}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedServer(server);
                      setServerConfig({});
                      setShowAddDialog(true);
                    }}
                    className="inline-flex items-center gap-2 px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    <Plus className="w-3 h-3" />
                    Add Server
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add Server Dialog */}
      {showAddDialog && selectedServer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center gap-2">
                {getCategoryIcon(selectedServer.category)}
                <h3 className="text-lg font-semibold">Add {selectedServer.name}</h3>
              </div>
              <p className="text-sm text-gray-600 mt-1">
                Configure and add this MCP server to your workflow composer
              </p>
            </div>
            
            <div className="p-6 space-y-4">
              {Object.entries(selectedServer.config_schema).map(([key, schema]) =>
                renderConfigField(key, schema)
              )}
            </div>
            
            <div className="flex items-center justify-end gap-2 p-6 border-t border-gray-200">
              <button
                onClick={() => {
                  setSelectedServer(null);
                  setServerConfig({});
                  setShowAddDialog(false);
                }}
                className="px-4 py-2 text-sm border border-gray-300 rounded hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={addServer}
                disabled={isAddingServer}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
              >
                {isAddingServer ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Plus className="w-3 h-3" />
                )}
                Add Server
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 