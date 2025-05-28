# 🎨 Any-Agent Workflow Composer

A visual workflow composer for the [any-agent](https://github.com/mozilla-ai/any-agent) framework. Create, edit, and execute AI agent workflows through an intuitive drag-and-drop interface.

## 🚀 Quick Start

```bash
# Clone and setup
git clone <repository-url>
cd any-agent-main
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
- Drag-and-drop workflow builder
- Real-time execution and testing
- Multiple agent frameworks and models

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
- Workflow performance metrics
- Cost analysis and optimization
- Usage statistics and insights

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

### Environment Setup

1. **Set API Keys**:
   ```bash
   export OPENAI_API_KEY="your-openai-key"
   export ANTHROPIC_API_KEY="your-anthropic-key"
   # Add other provider keys as needed
   ```

2. **Install Any-Agent** (if not already installed):
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

### For Developers
- **[🚀 Development Scripts](./scripts/README.md)** - Setup and development workflow
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
