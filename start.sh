#!/bin/bash

# any-agent Workflow Composer Startup Script
# This script starts both the backend and frontend services

set -e  # Exit on any error

echo "🚀 Starting any-agent Workflow Composer..."
echo "================================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to check if a port is in use
check_port() {
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        return 0  # Port is in use
    else
        return 1  # Port is free
    fi
}

# Function to kill processes on a port
kill_port() {
    local port=$1
    echo -e "${YELLOW}🔄 Killing existing processes on port $port...${NC}"
    lsof -ti:$port | xargs kill -9 2>/dev/null || true
    sleep 2
}

# Check and kill existing processes
echo -e "${BLUE}🔍 Checking for existing processes...${NC}"

if check_port 8000; then
    echo -e "${YELLOW}⚠️  Port 8000 (backend) is in use${NC}"
    kill_port 8000
fi

if check_port 3000; then
    echo -e "${YELLOW}⚠️  Port 3000 (frontend) is in use${NC}"
    kill_port 3000
fi

if check_port 3001; then
    echo -e "${YELLOW}⚠️  Port 3001 (frontend fallback) is in use${NC}"
    kill_port 3001
fi

# Start Backend
echo -e "${BLUE}🔧 Starting Backend...${NC}"
cd backend

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo -e "${YELLOW}📦 Creating Python virtual environment...${NC}"
    python -m venv venv
fi

# Activate virtual environment and install dependencies
echo -e "${YELLOW}📦 Installing/updating backend dependencies...${NC}"
source venv/bin/activate
pip install -q -r requirements.txt
pip install -q -e ..  # Install any-agent package
pip install -q 'any-agent[openai]'  # Install OpenAI support

# Ensure .env file exists
if [ ! -f ".env" ]; then
    if [ -f "../workflow-composer/backend/.env" ]; then
        echo -e "${YELLOW}📄 Copying .env file...${NC}"
        cp ../workflow-composer/backend/.env .env
    else
        echo -e "${RED}❌ No .env file found! Please create backend/.env with your OPENAI_API_KEY${NC}"
        exit 1
    fi
fi

# Start backend in background
echo -e "${GREEN}🚀 Starting backend on http://localhost:8000${NC}"
export USE_MOCK_EXECUTION=false
nohup python main.py > ../backend.log 2>&1 &
BACKEND_PID=$!

# Wait for backend to start
echo -e "${YELLOW}⏳ Waiting for backend to start...${NC}"
for i in {1..30}; do
    if curl -s http://localhost:8000/ >/dev/null 2>&1; then
        echo -e "${GREEN}✅ Backend started successfully!${NC}"
        break
    fi
    if [ $i -eq 30 ]; then
        echo -e "${RED}❌ Backend failed to start. Check backend.log for details.${NC}"
        exit 1
    fi
    sleep 1
done

# Start Frontend
cd ../workflow-composer
echo -e "${BLUE}🔧 Starting Frontend...${NC}"

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}📦 Installing frontend dependencies...${NC}"
    npm install
fi

# Start frontend in background
echo -e "${GREEN}🚀 Starting frontend...${NC}"
nohup npm run dev > ../frontend.log 2>&1 &
FRONTEND_PID=$!

# Wait for frontend to start
echo -e "${YELLOW}⏳ Waiting for frontend to start...${NC}"
for i in {1..30}; do
    if curl -s http://localhost:3000/ >/dev/null 2>&1 || curl -s http://localhost:3001/ >/dev/null 2>&1; then
        if curl -s http://localhost:3000/ >/dev/null 2>&1; then
            FRONTEND_URL="http://localhost:3000"
        else
            FRONTEND_URL="http://localhost:3001"
        fi
        echo -e "${GREEN}✅ Frontend started successfully!${NC}"
        break
    fi
    if [ $i -eq 30 ]; then
        echo -e "${RED}❌ Frontend failed to start. Check frontend.log for details.${NC}"
        exit 1
    fi
    sleep 1
done

# Success message
cd ..
echo ""
echo -e "${GREEN}🎉 any-agent Workflow Composer is now running!${NC}"
echo "================================================"
echo -e "${BLUE}📡 Backend:${NC}  http://localhost:8000"
echo -e "${BLUE}📖 API Docs:${NC} http://localhost:8000/docs"
echo -e "${BLUE}🌐 Frontend:${NC} $FRONTEND_URL"
echo ""
echo -e "${YELLOW}📋 Process IDs:${NC}"
echo -e "   Backend PID: $BACKEND_PID"
echo -e "   Frontend PID: $FRONTEND_PID"
echo ""
echo -e "${YELLOW}📄 Logs:${NC}"
echo -e "   Backend: tail -f backend.log"
echo -e "   Frontend: tail -f frontend.log"
echo ""
echo -e "${YELLOW}🛑 To stop services:${NC}"
echo -e "   ./stop.sh"
echo -e "   OR: kill $BACKEND_PID $FRONTEND_PID"
echo ""
echo -e "${GREEN}✨ Happy workflow building!${NC}" 