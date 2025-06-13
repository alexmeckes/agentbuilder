# Any-Agent Workflow Composer

A visual, drag-and-drop interface for building AI agent workflows with real-world tool integration.

## Features

- 🎨 **Visual Workflow Builder** - Drag-and-drop interface for creating agent workflows
- 🤖 **Multi-Framework Support** - Works with OpenAI, Anthropic, Google, and more
- 🔧 **100+ Real Tools** - Integration with Google Docs, GitHub, Slack via Composio
- 📊 **Analytics & Monitoring** - Track costs, performance, and execution history
- 🧪 **A/B Testing** - Compare different models and approaches
- 🎯 **LLM Evaluation** - Built-in LLM-as-a-Judge evaluation system
- ⚡ **Real-time Execution** - Live updates as workflows run

## Quick Start

```bash
# Clone and setup
git clone <repository-url>
cd any-agent-main

# Configure and install
./scripts/setup-env.sh
./scripts/setup.sh

# Add API key
export OPENAI_API_KEY="your-key"

# Start servers
./scripts/dev.sh
```

Open http://localhost:3000 to start building workflows.

## Documentation

- **[Getting Started](docs/getting-started.md)** - First steps and tutorials
- **[Deployment Guide](docs/deployment.md)** - Deploy to production
- **[Feature Guides](docs/features/)** - Deep dives into each feature
- **[Development](docs/development/)** - Architecture and API reference

## Project Structure

```
any-agent-main/
├── frontend/           # Next.js UI application
├── backend/            # FastAPI server
├── scripts/            # Automation scripts
└── docs/               # Documentation
```

## Key Features

### Visual Designer
Build workflows by dragging and connecting nodes. Support for agents, tools, and data flow.

### Composio Integration
Connect to 100+ real-world tools including Google Workspace, GitHub, Slack, CRM systems, and more. Transform AI workflows into actual business automation.

### Analytics Dashboard
Monitor workflow performance with real-time metrics, cost tracking, and execution history.

### Workflow Evaluation
Comprehensive evaluation system with LLM-as-a-Judge capabilities, custom criteria, test case management, and detailed performance analysis.

## Requirements

- Node.js 18+
- Python 3.11+
- API keys for AI providers (OpenAI, Anthropic, etc.)

## Contributing

This project is designed to be AI-friendly and easily modifiable. See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

Same license as the original any-agent framework.

---

Built with ❤️ for the AI community