# Directory Structure

This document describes the clean, organized directory structure after Phase 1 cleanup.

## Root Directory Structure

```
any-agent-main/
├── frontend/          # Next.js React frontend
├── backend/           # FastAPI Python backend  
├── scripts/           # Development automation scripts
├── archive/           # Archived duplicate implementations
├── docs/              # Documentation
├── tests/             # Test suites
├── examples/          # Example implementations
├── src/               # any-agent source code
├── .github/           # GitHub workflows and templates
├── README.md          # Main project documentation
├── DIRECTORY_STRUCTURE.md  # This file
├── pyproject.toml     # Python package configuration
├── mkdocs.yml         # Documentation site configuration
└── package.json       # Root package.json for any-agent

## Key Directories

### `/frontend/` - Next.js Frontend
- Complete workflow composer UI
- All 6 main tabs: AI Assistant, Visual Designer, A/B Testing, Evaluations, Trace Viewer, Analytics
- Real-time execution interface
- Comprehensive evaluation system UI

### `/backend/` - FastAPI Backend  
- Real any-agent integration
- All API endpoints for workflow execution
- Intelligent workflow naming system
- Analytics and evaluation engines

### `/scripts/` - Development Scripts
- `setup.sh` - One-time environment setup
- `dev.sh` - Start development servers with live logs
- `stop.sh` - Gracefully stop all servers
- `README.md` - Script documentation

### `/archive/` - Archived Implementations
- `workflow-composer/` - Original complex implementation
- `workflow-composer-ui/` - Alternative UI implementation  
- `app/` - Root-level app directory
- `src/` - Alternative source structure

**Note**: Archive contains working but over-engineered implementations. Current structure is cleaner and more maintainable.

## Removed Items

The following outdated files were removed during cleanup:
- Root `dev.sh` - Had wrong paths to archived directories
- Root `start.sh` - Referenced archived workflow-composer directory
- Root `stop.sh` - Duplicate of scripts/stop.sh

## Usage

```bash
# Setup (run once)
./scripts/setup.sh

# Development
./scripts/dev.sh

# Stop servers  
./scripts/stop.sh
```

## Quick Start

1. **Setup**: `./scripts/setup.sh`
2. **Development**: `./scripts/dev.sh`
3. **Open**: http://localhost:3000 (frontend) and http://localhost:8000 (backend)

## Features Available

- **Visual Workflow Builder**: Drag-and-drop interface
- **A/B Testing**: Experiment configuration and analysis (main navigation tab)
- **Evaluations**: Comprehensive evaluation system with LLM-as-a-judge
- **Analytics**: Real-time execution analytics and insights
- **Trace Viewer**: Detailed execution traces and performance metrics
- **Intelligent Naming**: AI-powered workflow naming and categorization

This structure provides a clean, maintainable codebase with all functionality working and properly organized. 