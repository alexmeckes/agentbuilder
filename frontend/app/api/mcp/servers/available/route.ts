import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:8000';
    
    const response = await fetch(`${backendUrl}/mcp/servers/available`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Backend responded with status: ${response.status}`);
    }

    const data = await response.json();
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching available MCP servers:', error);
    
    // Return some sample servers if backend is unavailable
    return NextResponse.json({
      servers: [
        {
          id: 'postgres',
          name: 'PostgreSQL Database',
          description: 'Connect to PostgreSQL databases for querying and data manipulation',
          command: ['npx', '@modelcontextprotocol/server-postgres'],
          config_schema: {
            host: { type: 'string', required: true, default: 'localhost', description: 'Database host' },
            port: { type: 'number', required: true, default: 5432, description: 'Database port' },
            database: { type: 'string', required: true, description: 'Database name' },
            username: { type: 'string', required: true, description: 'Database username' },
            password: { type: 'password', required: true, description: 'Database password' }
          },
          category: 'database'
        },
        {
          id: 'filesystem',
          name: 'File System Access',
          description: 'Read and write files on the local file system',
          command: ['npx', '@modelcontextprotocol/server-filesystem'],
          config_schema: {
            allowed_directories: { type: 'string', required: true, default: '/tmp', description: 'Comma-separated list of allowed directories' },
            read_only: { type: 'boolean', required: false, default: false, description: 'Enable read-only mode' }
          },
          category: 'files'
        },
        {
          id: 'github',
          name: 'GitHub Integration',
          description: 'Access GitHub repositories, issues, and pull requests',
          command: ['npx', '@modelcontextprotocol/server-github'],
          config_schema: {
            github_token: { type: 'password', required: true, description: 'GitHub personal access token' },
            owner: { type: 'string', required: true, description: 'Repository owner' },
            repo: { type: 'string', required: true, description: 'Repository name' }
          },
          category: 'development'
        }
      ]
    });
  }
} 