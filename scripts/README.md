# Startup Scripts

This directory contains the official startup scripts for the any-agent Workflow Composer.

## Scripts

### `setup.sh`
**Initial setup script** - Run this first to set up the development environment.

```bash
./scripts/setup.sh
```

**What it does:**
- Installs frontend dependencies (`npm install` in `frontend/`)
- Creates Python virtual environment in `backend/venv/`
- Installs backend dependencies
- Checks for any-agent installation

### `dev.sh`
**Development mode** - Starts both frontend and backend with live logs.

```bash
./scripts/dev.sh
```

**What it does:**
- Checks that setup has been completed
- Checks for port conflicts (3000, 8000)
- Starts backend on http://localhost:8000
- Starts frontend on http://localhost:3000
- Shows live logs from both services
- Press Ctrl+C to stop both services

**Logs are written to:**
- `backend.log` (in project root)
- `frontend.log` (in project root)

### `stop.sh`
**Stop all services** - Gracefully stops frontend and backend.

```bash
./scripts/stop.sh
```

**What it does:**
- Kills processes on ports 3000 and 8000
- Force kills if graceful shutdown fails
- Cleans up any remaining processes

## Quick Start

```bash
# 1. Initial setup (run once)
./scripts/setup.sh

# 2. Set your API key
export OPENAI_API_KEY="your-key-here"

# 3. Start development servers
./scripts/dev.sh

# 4. Open http://localhost:3000 in your browser

# 5. Stop servers when done
# Press Ctrl+C in the dev.sh terminal, or run:
./scripts/stop.sh
```

## Manual Start (Alternative)

If you prefer to start services manually:

```bash
# Terminal 1 - Backend
cd backend
source venv/bin/activate
python main.py

# Terminal 2 - Frontend  
cd frontend
npm run dev
```

## Troubleshooting

- **Port conflicts**: Use `./scripts/stop.sh` to clean up existing processes
- **Dependencies missing**: Run `./scripts/setup.sh` again
- **Backend fails**: Check that `OPENAI_API_KEY` is set
- **Frontend fails**: Try `cd frontend && npm install` 