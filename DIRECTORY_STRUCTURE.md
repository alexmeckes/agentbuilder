# Directory Structure

This document explains the clean, organized structure of the any-agent repository.

## Active Directories

### Core Application
- **`frontend/`** - Next.js frontend application (port 3000)
  - Contains the main UI with tabs: AI Assistant, Visual Designer, A/B Testing, Trace Viewer, Analytics
  - All experiments functionality is integrated in the main navigation
- **`backend/`** - Python FastAPI backend (port 8000)
  - Handles workflow execution, AI orchestration, and API endpoints

### Development & Deployment
- **`scripts/`** - Development and deployment scripts
  - `setup.sh` - Install all dependencies
  - `dev.sh` - Start both frontend and backend in development mode
- **`docs/`** - Documentation and guides
- **`tests/`** - Test suites for both frontend and backend

### Configuration
- **`examples/`** - Example workflows and configurations
- **`public/`** - Static assets for the frontend

## Archived Directories

The following directories have been moved to `archive/` to reduce confusion:
- **`archive/workflow-composer/`** - Old Next.js implementation
- **`archive/workflow-composer-ui/`** - Vite/React implementation  
- **`archive/app/`** - Original Next.js app directory
- **`archive/src/`** - Additional source directory

## Quick Start

1. **Setup**: `./scripts/setup.sh`
2. **Development**: `./scripts/dev.sh`
3. **Frontend only**: `cd frontend && npm run dev`
4. **Backend only**: `cd backend && python main.py`

## Experiments/A/B Testing Location

**The experiments functionality is NOT hidden away!** It's prominently featured as the "A/B Testing" tab in the main navigation of the frontend application. You can access it by:

1. Opening http://localhost:3000
2. Clicking the "A/B Testing" tab in the header navigation
3. The tab includes a beaker icon and is located between "Visual Designer" and "Trace Viewer"

The experiments functionality includes:
- Experiment configuration and setup
- Variant comparison testing
- Statistical analysis and results
- Cost and performance optimization
- A/B testing workflows

## Legacy Note

Previous versions had multiple frontend implementations scattered across different directories, which created confusion. The current structure consolidates everything into clear, purpose-driven directories. 