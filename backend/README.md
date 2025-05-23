# any-agent Workflow Composer Backend

Python FastAPI server that bridges the Next.js frontend with the any-agent framework for real workflow execution.

## 🚀 Features

- **Agent Framework Integration**: Supports all any-agent frameworks (OpenAI, LangChain, LlamaIndex, etc.)
- **Visual Workflow Execution**: Convert drag-and-drop workflows into executable agent configurations
- **Real-time Updates**: WebSocket support for live execution status
- **Tool Integration**: Support for any-agent tools (web search, file operations, etc.)
- **Multi-agent Workflows**: Chain multiple agents together

## 📋 Prerequisites

- Python 3.11+ 
- any-agent framework installed in parent directory
- OpenAI API key (or other provider API keys)

## 🛠️ Installation

1. **Install Python dependencies:**
   ```bash
   cd backend
   pip install -r requirements.txt
   ```

2. **Install any-agent with desired frameworks:**
   ```bash
   cd ../..  # Go to any-agent root
   pip install -e .[openai]  # or [all] for all frameworks
   ```

3. **Set environment variables:**
   ```bash
   export OPENAI_API_KEY="your_openai_api_key_here"
   # Add other API keys as needed for different frameworks
   ```

## 🏃‍♂️ Running the Backend

1. **Start the FastAPI server:**
   ```bash
   cd backend
   python main.py
   ```

2. **The backend will be available at:**
   - API: http://localhost:8000
   - Interactive docs: http://localhost:8000/docs
   - WebSocket: ws://localhost:8000/ws/execution/{execution_id}

## 📡 API Endpoints

### GET `/`
Health check endpoint.

### GET `/frameworks`
List available agent frameworks.

**Response:**
```json
{
  "frameworks": ["OPENAI", "LANGCHAIN", "LLAMA_INDEX", ...],
  "default": "OPENAI"
}
```

### POST `/execute`
Execute a workflow using any-agent.

**Request:**
```json
{
  "workflow": {
    "nodes": [...],
    "edges": [...]
  },
  "input_data": "Process this data...",
  "framework": "openai"
}
```

**Response:**
```json
{
  "execution_id": "exec_1",
  "status": "completed",
  "result": "Agent execution result...",
  "trace": {
    "final_output": "...",
    "steps": [...],
    "metadata": {...}
  }
}
```

### GET `/executions/{execution_id}`
Get execution details by ID.

### WebSocket `/ws/execution/{execution_id}`
Real-time execution updates.

## 🔧 Workflow Definition

The backend converts visual workflows from the frontend into any-agent configurations:

### Node Types

1. **Agent Nodes** (`type: "agent"`)
   - Main processing units
   - Map to `AgentConfig` in any-agent
   - Support model selection, instructions, tools

2. **Tool Nodes** (`type: "tool"`)
   - Available tools for agents
   - Map to any-agent tool functions
   - Currently supports: `search_web`

3. **Input Nodes** (`type: "input"`)
   - Entry points for data
   - Define workflow input schema

4. **Output Nodes** (`type: "output"`)
   - Exit points for results
   - Define expected output format

### Example Workflow

```json
{
  "nodes": [
    {
      "id": "agent-1",
      "type": "agent",
      "data": {
        "label": "Research Agent",
        "model_id": "gpt-4",
        "instructions": "Research the given topic thoroughly",
        "name": "ResearchAgent"
      },
      "position": {"x": 100, "y": 100}
    },
    {
      "id": "tool-1", 
      "type": "tool",
      "data": {
        "label": "Web Search",
        "type": "tool"
      },
      "position": {"x": 300, "y": 100}
    }
  ],
  "edges": [
    {
      "id": "edge-1",
      "source": "agent-1",
      "target": "tool-1"
    }
  ]
}
```

## 🔍 Supported Frameworks

The backend supports all any-agent frameworks:

- **OpenAI Agents** - GPT-4, GPT-3.5-turbo
- **LangChain** - Various LLM providers
- **LlamaIndex** - Document-based agents
- **Google ADK** - Google AI models
- **Smolagents** - Hugging Face agents
- **Agno AI** - Agno platform

## 🛡️ Error Handling

The backend includes comprehensive error handling:

- **Validation Errors**: Invalid workflow definitions
- **API Errors**: Framework-specific errors
- **Execution Errors**: Runtime agent failures
- **Network Errors**: Connection issues

## 🔄 Real-time Updates

WebSocket connections provide live updates:

```javascript
const ws = new WebSocket('ws://localhost:8000/ws/execution/exec_1')
ws.onmessage = (event) => {
  const data = JSON.parse(event.data)
  console.log('Execution update:', data.status)
}
```

## 🧪 Testing

Test the backend with curl:

```bash
# Health check
curl http://localhost:8000/

# List frameworks
curl http://localhost:8000/frameworks

# Execute simple workflow
curl -X POST http://localhost:8000/execute \
  -H "Content-Type: application/json" \
  -d '{
    "workflow": {
      "nodes": [{"id": "1", "type": "agent", "data": {"label": "Test"}, "position": {"x": 0, "y": 0}}],
      "edges": []
    },
    "input_data": "Hello world",
    "framework": "openai"
  }'
```

## 🔗 Integration

The backend integrates seamlessly with:

- **Next.js Frontend**: CORS-enabled for localhost:3000/3001
- **any-agent Framework**: Direct Python integration
- **ReactFlow**: Visual workflow definitions
- **Real-time UI**: WebSocket status updates

## 📝 Development

For development and debugging:

```bash
# Run with auto-reload
python main.py

# Check logs
tail -f uvicorn.log

# Interactive API testing
open http://localhost:8000/docs
``` 