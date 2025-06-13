# API Reference

Complete reference for the Any-Agent Workflow Composer backend API.

## Base URL

```
Development: http://localhost:8000
Production: https://your-backend-domain.com
```

## Authentication

Currently, API keys are passed per request. Future versions will support session-based authentication.

## Endpoints

### Health Check

#### GET /

Check if the backend is running.

**Response**
```json
{
  "message": "Any-agent backend server is running",
  "status": "healthy"
}
```

---

### Frameworks

#### GET /frameworks

List all available agent frameworks.

**Response**
```json
{
  "frameworks": [
    {
      "id": "openai",
      "name": "OpenAI Agents SDK",
      "models": ["gpt-4", "gpt-3.5-turbo"]
    },
    {
      "id": "langchain",
      "name": "LangChain",
      "models": ["gpt-4", "claude-3", "gemini-pro"]
    }
  ]
}
```

---

### Workflow Execution

#### POST /execute

Execute a workflow with specified framework and configuration.

**Request Body**
```json
{
  "workflow": {
    "nodes": [
      {
        "id": "agent-1",
        "type": "agent",
        "data": {
          "label": "Research Agent",
          "model_id": "gpt-4",
          "instructions": "Research the given topic"
        }
      }
    ],
    "edges": [
      {
        "source": "input-1",
        "target": "agent-1"
      }
    ]
  },
  "framework": "openai",
  "api_key": "sk-...",
  "input_data": "Research topic: AI trends"
}
```

**Response**
```json
{
  "execution_id": "exec_1234567890",
  "status": "queued",
  "message": "Workflow execution started"
}
```

**Status Codes**
- `200`: Execution started successfully
- `400`: Invalid workflow or configuration
- `401`: Invalid API key
- `500`: Server error

---

#### GET /executions/{execution_id}

Get details of a specific execution.

**Path Parameters**
- `execution_id`: The ID returned from POST /execute

**Response**
```json
{
  "execution_id": "exec_1234567890",
  "status": "completed",
  "result": {
    "output": "Research findings...",
    "metadata": {
      "duration": 5.2,
      "tokens_used": 1523
    }
  },
  "error": null,
  "created_at": "2024-01-15T10:30:00Z",
  "completed_at": "2024-01-15T10:30:05Z"
}
```

**Status Values**
- `queued`: Waiting to start
- `running`: Currently executing
- `completed`: Finished successfully
- `failed`: Execution failed

---

### Analytics

#### GET /analytics/workflows

Get analytics data for all workflows.

**Query Parameters**
- `start_date`: ISO format date (optional)
- `end_date`: ISO format date (optional)
- `framework`: Filter by framework (optional)

**Response**
```json
{
  "summary": {
    "total_workflows": 42,
    "total_executions": 156,
    "success_rate": 0.94,
    "total_cost": 12.34
  },
  "workflows": [
    {
      "workflow_id": "workflow_abc123",
      "name": "Research Assistant",
      "executions": 23,
      "success_rate": 0.96,
      "avg_duration": 4.5,
      "avg_cost": 0.15
    }
  ],
  "framework_usage": {
    "openai": 0.6,
    "langchain": 0.3,
    "other": 0.1
  }
}
```

---

#### GET /analytics/executions

Get detailed execution history.

**Query Parameters**
- `limit`: Number of results (default: 100)
- `offset`: Pagination offset (default: 0)
- `workflow_id`: Filter by workflow
- `status`: Filter by status

**Response**
```json
{
  "executions": [
    {
      "execution_id": "exec_123",
      "workflow_id": "workflow_abc",
      "workflow_name": "Content Generator",
      "status": "completed",
      "duration": 3.2,
      "cost": 0.08,
      "created_at": "2024-01-15T10:00:00Z"
    }
  ],
  "total": 156,
  "limit": 100,
  "offset": 0
}
```

---

### WebSocket

#### WS /ws/execution/{execution_id}

Connect to receive real-time updates for an execution.

**Connection URL**
```
ws://localhost:8000/ws/execution/exec_1234567890
```

**Message Format**

Server → Client:
```json
{
  "type": "status",
  "data": {
    "status": "running",
    "progress": 0.5,
    "current_node": "agent-1"
  }
}
```

```json
{
  "type": "node_update",
  "data": {
    "node_id": "agent-1",
    "status": "completed",
    "output": "Analysis complete"
  }
}
```

```json
{
  "type": "completion",
  "data": {
    "status": "completed",
    "result": {...},
    "duration": 5.2,
    "cost": 0.12
  }
}
```

---

## Error Responses

All endpoints may return error responses in this format:

```json
{
  "error": "Error type",
  "message": "Detailed error message",
  "details": {
    "field": "Additional context"
  }
}
```

### Common Error Codes

- `400`: Bad Request - Invalid input
- `401`: Unauthorized - Invalid API key
- `404`: Not Found - Resource doesn't exist
- `429`: Too Many Requests - Rate limit exceeded
- `500`: Internal Server Error

---

## Rate Limiting

- **Default**: 100 requests per minute per IP
- **Execution endpoint**: 10 concurrent executions
- **WebSocket**: 50 concurrent connections

---

## Data Types

### Node Object

```typescript
interface Node {
  id: string;
  type: "agent" | "tool" | "input" | "output";
  data: {
    label: string;
    model_id?: string;
    instructions?: string;
    tool_type?: string;
    [key: string]: any;
  };
  position: {
    x: number;
    y: number;
  };
}
```

### Edge Object

```typescript
interface Edge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
}
```

### Workflow Object

```typescript
interface Workflow {
  nodes: Node[];
  edges: Edge[];
  metadata?: {
    name?: string;
    description?: string;
    version?: string;
  };
}
```

---

## Examples

### Execute a Simple Workflow

```bash
curl -X POST http://localhost:8000/execute \
  -H "Content-Type: application/json" \
  -d '{
    "workflow": {
      "nodes": [
        {
          "id": "input-1",
          "type": "input",
          "data": {"label": "Input"}
        },
        {
          "id": "agent-1",
          "type": "agent",
          "data": {
            "label": "Assistant",
            "model_id": "gpt-3.5-turbo",
            "instructions": "You are a helpful assistant"
          }
        },
        {
          "id": "output-1",
          "type": "output",
          "data": {"label": "Output"}
        }
      ],
      "edges": [
        {"source": "input-1", "target": "agent-1"},
        {"source": "agent-1", "target": "output-1"}
      ]
    },
    "framework": "openai",
    "api_key": "sk-...",
    "input_data": "Hello, how are you?"
  }'
```

### Monitor Execution Progress

```javascript
const ws = new WebSocket('ws://localhost:8000/ws/execution/exec_123');

ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  console.log('Update:', message);
};
```

For more examples, see the [Getting Started Guide](../getting-started.md).