# Development Setup

Complete guide for setting up the Any-Agent Workflow Composer development environment.

## Prerequisites

### Required Software
- **Node.js** 18.0.0 or higher
- **Python** 3.11 or higher
- **Git** for version control
- **npm** (comes with Node.js)

### Recommended Tools
- **VS Code** with Python and TypeScript extensions
- **Docker** for containerized development
- **Postman** for API testing

## Environment Setup

### 1. Clone Repository

```bash
git clone <repository-url>
cd any-agent-main
```

### 2. Environment Variables

Run the automated setup:
```bash
./scripts/setup-env.sh
```

Or manually create environment files:

**Backend (.env)**
```bash
# AI Provider Keys
OPENAI_API_KEY=your-openai-key
ANTHROPIC_API_KEY=your-anthropic-key  # Optional
GOOGLE_API_KEY=your-google-key        # Optional

# Server Configuration
PORT=8000
HOST=0.0.0.0
ENV=development
```

**Frontend (.env.local)**
```bash
# Backend Connection
BACKEND_URL=http://localhost:8000
NEXT_PUBLIC_BACKEND_URL=http://localhost:8000

# Optional Configuration
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

### 3. Install Dependencies

Automated installation:
```bash
./scripts/setup.sh
```

Or manual installation:

**Backend**
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
pip install 'any-agent[all]'  # Install all frameworks
```

**Frontend**
```bash
cd frontend
npm install
```

## Running Development Servers

### Automated Start
```bash
./scripts/dev.sh
```

This starts both frontend and backend with hot reloading.

### Manual Start

**Backend**
```bash
cd backend
source venv/bin/activate
python main.py
```

**Frontend**
```bash
cd frontend
npm run dev
```

### Accessing the Application
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API Documentation: http://localhost:8000/docs

## Development Workflow

### Code Structure

```
any-agent-main/
├── frontend/
│   ├── app/              # Next.js app directory
│   │   ├── components/   # React components
│   │   ├── lib/         # Utilities
│   │   └── types/       # TypeScript types
│   └── public/          # Static assets
├── backend/
│   ├── main.py          # FastAPI application
│   ├── routers/         # API endpoints
│   ├── services/        # Business logic
│   └── models/          # Data models
└── scripts/             # Development scripts
```

### Making Changes

1. **Frontend Changes**
   - Edit files in `frontend/app/`
   - Changes hot-reload automatically
   - TypeScript compilation errors show in browser

2. **Backend Changes**
   - Edit Python files in `backend/`
   - Server restarts automatically with watchdog
   - Check terminal for errors

### Code Style

**Frontend (TypeScript/React)**
- Use TypeScript for all new code
- Follow React hooks best practices
- Component files use PascalCase
- Utilities use camelCase

**Backend (Python)**
- Follow PEP 8 style guide
- Use type hints for all functions
- Document with docstrings
- Async/await for I/O operations

## Testing

### Frontend Testing
```bash
cd frontend
npm run test        # Run tests
npm run test:watch  # Watch mode
npm run lint        # Lint check
```

### Backend Testing
```bash
cd backend
pytest              # Run all tests
pytest -v          # Verbose output
pytest --cov       # Coverage report
```

### E2E Testing
```bash
npm run test:e2e   # Playwright tests
```

## Debugging

### Frontend Debugging

**Browser DevTools**
- React Developer Tools extension
- Network tab for API calls
- Console for errors

**VS Code**
- Install "Debugger for Chrome"
- Use provided launch.json
- Set breakpoints in code

### Backend Debugging

**VS Code**
```json
{
  "name": "Python: FastAPI",
  "type": "python",
  "request": "launch",
  "module": "uvicorn",
  "args": ["main:app", "--reload"],
  "cwd": "${workspaceFolder}/backend"
}
```

**Command Line**
```bash
# Enable debug logging
export LOG_LEVEL=DEBUG
python main.py
```

## Common Tasks

### Adding a New Feature

1. **Plan the feature**
   - Update types in `frontend/app/types/`
   - Design API endpoints

2. **Implement backend**
   - Add router in `backend/routers/`
   - Implement service logic
   - Add tests

3. **Implement frontend**
   - Create React components
   - Connect to API
   - Add to UI

### Adding a New AI Framework

1. Update `backend/requirements.txt`
2. Add framework handler
3. Register in framework list
4. Test with sample workflow

### Updating Dependencies

**Frontend**
```bash
cd frontend
npm update          # Update all
npm update package  # Update specific
```

**Backend**
```bash
cd backend
pip install --upgrade package
pip freeze > requirements.txt
```

## Performance Optimization

### Frontend
- Use React.memo for expensive components
- Implement virtual scrolling for lists
- Optimize bundle size with dynamic imports
- Enable production builds for testing

### Backend
- Use connection pooling
- Implement caching where appropriate
- Profile with cProfile
- Monitor with asyncio debug mode

## Troubleshooting Development

### Port Already in Use
```bash
# Find process using port
lsof -i :3000  # or :8000

# Kill process
kill -9 <PID>

# Or use cleanup script
./scripts/stop.sh
```

### Module Import Errors
```bash
# Reinstall dependencies
cd backend
rm -rf venv
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### Frontend Build Errors
```bash
# Clear cache and reinstall
cd frontend
rm -rf node_modules .next
npm install
npm run dev
```

For deployment instructions, see [Deployment Guide](../deployment.md).