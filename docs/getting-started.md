# Getting Started

Welcome to Any-Agent Workflow Composer! This guide will help you get up and running quickly.

## What is Any-Agent?

Any-Agent Workflow Composer is a visual interface for building AI agent workflows. It supports multiple AI frameworks and provides real-time execution, analytics, and integration with 100+ external tools.

## Quick Start (5 minutes)

### 1. Clone and Setup

```bash
# Clone repository
git clone <repository-url>
cd any-agent-main

# Run automated setup
./scripts/setup-env.sh  # Configure environment
./scripts/setup.sh      # Install dependencies
```

### 2. Configure API Keys

Set at least one AI provider key:
```bash
export OPENAI_API_KEY="your-key-here"
# Optional: export ANTHROPIC_API_KEY="your-key"
```

### 3. Start Development Servers

```bash
./scripts/dev.sh
```

This starts:
- Backend server at http://localhost:8000
- Frontend at http://localhost:3000

### 4. Create Your First Workflow

1. Open http://localhost:3000
2. Go to **Visual Designer** tab
3. Drag an **Agent Node** from the palette
4. Configure with GPT-4 and add instructions
5. Click **Execute** to run

## Main Features

### Visual Designer
Build workflows with drag-and-drop nodes:
- **Agent Nodes**: AI models (GPT-4, Claude, etc.)
- **Tool Nodes**: Web search, file operations, external APIs
- **Input/Output Nodes**: Data flow control

### AI Assistant
Create workflows using natural language:
- Describe what you want to build
- AI generates the workflow automatically
- Refine with follow-up instructions

### Analytics Dashboard
Monitor your workflows:
- Execution history and costs
- Performance metrics
- Success/failure rates

### A/B Testing
Compare different approaches:
- Test multiple models
- Optimize for cost vs quality
- Statistical analysis

## Next Steps

### Enable Real-World Tools (Optional)

Connect to Google Docs, GitHub, Slack, and more:

1. Get API key from [Composio](https://app.composio.dev)
2. Add in Settings → Composio Integration
3. Connect your apps
4. Use real tools in workflows

### Deploy to Production

Ready to go live? See our [Deployment Guide](./deployment.md) for instructions on deploying to Vercel and Render.

### Learn More

- **[Feature Guides](./features/)**: Deep dives into each feature
- **[Development Setup](./development/setup.md)**: Advanced configuration
- **[API Reference](./development/api-reference.md)**: Backend API documentation

## Common Workflows

### Content Generation
```
Input → GPT-4 (write article) → Output
```

### Research Assistant
```
Input → Agent (analyze topic) → Web Search → Agent (summarize) → Output
```

### Document Automation
```
Input → Agent (generate content) → Google Docs Tool → Output
```

## Tips

- **Start Simple**: Begin with single-agent workflows
- **Use Templates**: Pre-built nodes save time
- **Monitor Costs**: Check Analytics tab regularly
- **Test Locally**: Verify workflows before deployment

## Need Help?

- Check [Troubleshooting Guide](./troubleshooting.md)
- Review error messages in browser console
- Backend logs available at `backend.log`

Happy building! 🚀