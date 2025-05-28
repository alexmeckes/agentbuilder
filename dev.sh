#!/bin/bash

# any-agent Workflow Composer Development Script
# This script starts both services in development mode with live logs

echo "🔧 Starting any-agent Workflow Composer in Development Mode..."
echo "=============================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to cleanup on exit
cleanup() {
    echo -e "\n${YELLOW}🛑 Shutting down services...${NC}"
    kill $BACKEND_PID $FRONTEND_PID 2>/dev/null || true
    exit 0
}

# Set trap to cleanup on script exit
trap cleanup SIGINT SIGTERM

# Stop any existing services
./stop.sh

echo -e "${BLUE}🔧 Setting up backend...${NC}"
cd backend

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo -e "${YELLOW}📦 Creating Python virtual environment...${NC}"
    python -m venv venv
fi

# Activate virtual environment and install dependencies
source venv/bin/activate
pip install -q -r requirements.txt
pip install -q -e ..
pip install -q 'any-agent[openai]'

# Ensure .env file exists
if [ ! -f ".env" ]; then
    if [ -f "../workflow-composer/backend/.env" ]; then
        cp ../workflow-composer/backend/.env .env
    else
        echo -e "${RED}❌ No .env file found! Please create backend/.env with your OPENAI_API_KEY${NC}"
        exit 1
    fi
fi

# Start backend in background
echo -e "${GREEN}🚀 Starting backend in development mode...${NC}"
export USE_MOCK_EXECUTION=false
python main.py &
BACKEND_PID=$!

# Wait for backend to start
echo -e "${YELLOW}⏳ Waiting for backend to start...${NC}"
for i in {1..30}; do
    if curl -s http://localhost:8000/ >/dev/null 2>&1; then
        echo -e "${GREEN}✅ Backend started successfully!${NC}"
        break
    fi
    if [ $i -eq 30 ]; then
        echo -e "${RED}❌ Backend failed to start${NC}"
        exit 1
    fi
    sleep 1
done

# Start frontend
cd ../workflow-composer
echo -e "${BLUE}🔧 Setting up frontend...${NC}"

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}📦 Installing frontend dependencies...${NC}"
    npm install
fi

echo -e "${GREEN}🚀 Starting frontend in development mode...${NC}"
npm run dev &
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
        echo -e "${RED}❌ Frontend failed to start${NC}"
        exit 1
    fi
    sleep 1
done

cd ..

echo ""
echo -e "${GREEN}🎉 Development environment is ready!${NC}"
echo "================================================"
echo -e "${BLUE}📡 Backend:${NC}  http://localhost:8000"
echo -e "${BLUE}📖 API Docs:${NC} http://localhost:8000/docs"
echo -e "${BLUE}🌐 Frontend:${NC} $FRONTEND_URL"
echo ""
echo -e "${YELLOW}💡 Development Tips:${NC}"
echo -e "   • Both services are running in foreground"
echo -e "   • Press Ctrl+C to stop both services"
echo -e "   • Backend auto-reloads on file changes"
echo -e "   • Frontend auto-reloads on file changes"
echo ""
echo -e "${GREEN}✨ Happy developing!${NC}"
echo ""

# Wait for both processes
wait $BACKEND_PID $FRONTEND_PID 