# 🎨 Any-Agent Workflow Composer

A visual workflow composer for the [any-agent](https://github.com/mozilla-ai/any-agent) framework. Create, edit, and execute AI agent workflows through an intuitive drag-and-drop interface.

## 🚀 Quick Start

```bash
# Clone and setup
git clone <repository-url>
cd any-agent-main

# Setup environment variables (new!)
./scripts/setup-env.sh

# Setup dependencies
./scripts/setup.sh

# Start development servers
./scripts/dev.sh
```

**That's it!** Open http://localhost:3000 to start building workflows.

## 🎯 Main Features

### 🤖 AI Assistant Tab
- Chat interface for creating workflows through natural language
- Automatically generates nodes and connections based on your descriptions
- Smart suggestions for workflow improvements

### 🎨 Visual Designer Tab  
- **Manual Design Mode**: Direct drag-and-drop workflow building with node palette
- **AI Assistant Mode**: Natural language workflow generation and modification
- **Pre-configured templates**: Ready-to-use agent and tool nodes
- **Smart node positioning**: Collision detection and automatic layout
- **Real-time execution**: Live workflow testing and monitoring
- **Multiple frameworks**: Support for all major AI agent frameworks

### 🧪 A/B Testing Tab
- **Experiment Configuration**: Set up A/B tests for different models and parameters
- **Variant Comparison**: Compare performance across different AI models
- **Statistical Analysis**: Get detailed metrics on cost, speed, and quality
- **Templates**: Pre-built experiment templates for common use cases
- **Results Dashboard**: Visual analytics and recommendations

### 📊 Trace Viewer Tab
- Detailed execution logs and traces
- Step-by-step workflow debugging
- Performance monitoring

### 📈 Analytics Tab
- **Real-time Cost Tracking**: GenAI semantic convention support
- **Workflow performance metrics**: Success rates, execution times, token usage
- **Cost analysis and optimization**: Detailed cost breakdowns per execution
- **Usage statistics and insights**: Intelligent workflow categorization

### ⚙️ Settings
- Model preferences and API key configuration
- Framework selection and parameters
- User preferences and customization

## 📁 Project Structure

```
any-agent-main/
├── frontend/           # Next.js frontend application
│   ├── app/           # Next.js app directory
│   ├── components/    # React components
│   ├── lib/          # Utility libraries
│   └── package.json  # Frontend dependencies
├── backend/           # Python FastAPI backend
│   ├── main.py       # FastAPI server entry point
│   ├── venv/         # Python virtual environment
│   └── requirements.txt
├── scripts/           # Automation scripts
│   ├── setup.sh      # One-time environment setup
│   ├── dev.sh        # Start development servers
│   └── stop.sh       # Stop all servers
└── docs/             # Documentation
```

## 🛠️ Features

### Frontend (Next.js + React)
- **Visual Workflow Builder**: Drag-and-drop interface for creating agent workflows
- **Real-time Execution**: Live updates during workflow execution
- **Multi-Agent Support**: Chain multiple AI agents together
- **Model Selection**: Choose from various AI models (GPT-4, Claude, etc.)
- **Tool Integration**: Built-in tools like web search, file operations

### Backend (FastAPI + Python)
- **Any-Agent Integration**: Full support for all any-agent frameworks
- **WebSocket Support**: Real-time execution updates
- **Multiple Frameworks**: OpenAI, LangChain, LlamaIndex, Google ADK, and more
- **RESTful API**: Complete API for workflow management
- **Execution Tracing**: Detailed execution logs and analytics

## 🔧 Development

### Prerequisites
- **Node.js** 18+ and npm
- **Python** 3.11+
- **API Keys** for your chosen AI providers (OpenAI, Anthropic, etc.)

### Recent Updates (January 2025)
- ✅ **Cost Calculation Fix**: Implemented GenAI semantic convention support
- ✅ **Production Analytics**: Fixed cost tracking in Vercel/Render deployment
- ✅ **Dual Convention Support**: Compatible with both GenAI and OpenInference formats
- ✅ **Real-time Cost Aggregation**: Accurate span-level cost extraction

### Environment Setup

1. **Set API Keys**:
   ```bash
   export OPENAI_API_KEY="your-openai-key"
   export ANTHROPIC_API_KEY="your-anthropic-key"
   # Add other provider keys as needed
   ```

2. **🚨 CRITICAL: Frontend Environment Variables**:
   ```bash
   # Create frontend/.env.local with BOTH variables
   cd frontend
   echo "BACKEND_URL=http://localhost:8000" > .env.local
   echo "NEXT_PUBLIC_BACKEND_URL=http://localhost:8000" >> .env.local
   ```
   
   **Why both variables?**
   - `BACKEND_URL`: Used by `/api/execute` to proxy Designer workflows to backend
   - `NEXT_PUBLIC_BACKEND_URL`: Used by client-side code for direct API calls
   
   **⚠️ Without both**: Workflows execute but don't appear in Analytics!

3. **Install Any-Agent** (if not already installed):
   ```bash
   pip install 'any-agent[all]'  # All frameworks
   # or
   pip install 'any-agent[openai]'  # OpenAI only
   ```

### Available Scripts

```bash
# Setup everything (run once)
./scripts/setup.sh

# Start development servers
./scripts/dev.sh

# Stop all servers
./scripts/stop.sh
```

### Manual Development

If you prefer to run servers manually:

```bash
# Backend
cd backend
source venv/bin/activate
python main.py

# Frontend (in another terminal)
cd frontend
npm run dev
```

## 🌐 API Endpoints

### Backend API (http://localhost:8000)

- **GET** `/` - Health check
- **GET** `/frameworks` - List available agent frameworks
- **POST** `/execute` - Execute a workflow
- **GET** `/executions/{id}` - Get execution details
- **WebSocket** `/ws/execution/{id}` - Real-time execution updates

### Interactive API Documentation
Visit http://localhost:8000/docs for the full API documentation.

## 🎯 Usage

### Creating Workflows

1. **Open the Frontend**: http://localhost:3000
2. **Drag Components**: Add agent nodes, tool nodes, and connections
3. **Configure Agents**: Set models, instructions, and tools
4. **Execute**: Run your workflow and see real-time results

### Supported Agent Frameworks

- **OpenAI Agents** - GPT-4, GPT-3.5-turbo
- **LangChain** - Various LLM providers
- **LlamaIndex** - Document-based agents
- **Google ADK** - Google AI models
- **Smolagents** - Hugging Face agents
- **Agno AI** - Agno platform
- **TinyAgent** - Lightweight agents

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
        "instructions": "Research the given topic thoroughly"
      }
    },
    {
      "id": "tool-1",
      "type": "tool",
      "data": {
        "label": "Web Search",
        "type": "search_web"
      }
    }
  ],
  "edges": [
    {
      "source": "agent-1",
      "target": "tool-1"
    }
  ]
}
```

## 🐛 Troubleshooting

### Common Issues

**🚨 Workflows Execute But Don't Appear in Analytics**:
- **Symptom**: Designer shows exec_123 but Analytics shows 0 workflows
- **Cause**: Missing environment variables in `frontend/.env.local`
- **Fix**: Ensure both `BACKEND_URL` and `NEXT_PUBLIC_BACKEND_URL` are set
- **Verify**: Check browser network tab for `/api/execute` calls returning 200

**Port Already in Use**:
```bash
./scripts/stop.sh  # Stop all servers
./scripts/dev.sh   # Restart
```

**Dependencies Missing**:
```bash
./scripts/setup.sh  # Reinstall dependencies
```

**Backend Not Starting**:
```bash
# Check backend logs
tail -f backend.log

# Ensure any-agent is installed
cd backend && source venv/bin/activate
pip install 'any-agent[openai]'
```

**Frontend Build Errors**:
```bash
# Clean and reinstall
cd frontend
rm -rf node_modules package-lock.json
npm install
```

### Log Files

- **Frontend logs**: `frontend.log`
- **Backend logs**: `backend.log`

## 🤝 Contributing

This project is designed to be AI-friendly and easily modifiable:

1. **Clear Structure**: Organized directories and consistent patterns
2. **Comprehensive Documentation**: Context for AI assistants
3. **Modular Architecture**: Easy to modify individual components
4. **Error Handling**: Clear error messages and solutions

## 📚 Documentation

### For AI Agents & New Contributors
- **[🤖 AI Agent Onboarding Guide](./AI_AGENT_ONBOARDING.md)** - **START HERE** for AI agents
- **[📋 Product Requirements Document](./prd-doc.md)** - Complete feature documentation
- **[🏗️ Directory Structure Guide](./DIRECTORY_STRUCTURE.md)** - Architecture overview
- **[🎨 Manual Node Creation Guide](./MANUAL_NODE_CREATION_GUIDE.md)** - **NEW** Dual-mode interface system
- **[💰 Cost Calculation Guide](./COST_CALCULATION_GUIDE.md)** - **NEW** Cost tracking system

### For Developers
- **[🚀 Development Scripts](./scripts/README.md)** - Setup and development workflow
- **[🏗️ Implementation Summary](./IMPLEMENTATION_SUMMARY.md)** - **UPDATED** Complete system overview
- **[Any-Agent Framework](https://mozilla-ai.github.io/any-agent/)** - Core framework docs
- **[API Documentation](http://localhost:8000/docs)** - Interactive API docs (when running)

### Code Documentation
- **[Frontend Components](./frontend/app/components/)** - React component library
- **[Backend API](./backend/)** - FastAPI server implementation
- **[Type Definitions](./frontend/app/types/)** - TypeScript interfaces

### Key Implementation Files
- **`frontend/app/page.tsx`** - Main UI component (353 lines)
- **`backend/main.py`** - Backend server (1367 lines)
- **`backend/visual_to_anyagent_translator.py`** - Workflow execution engine

## 📄 License

This project maintains the same license as the original any-agent framework.

---

**Built with ❤️ for the AI community**
