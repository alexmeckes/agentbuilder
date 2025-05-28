#!/bin/bash

# Any-Agent Workflow Composer - Development Script
# Starts both frontend and backend in development mode

set -e

echo "🚀 Starting Any-Agent Workflow Composer in development mode..."

# Function to cleanup background processes
cleanup() {
    echo "🛑 Shutting down servers..."
    jobs -p | xargs -r kill
    exit 0
}

# Trap cleanup function on script exit
trap cleanup EXIT INT TERM

# Check if setup has been run
if [ ! -d "frontend/node_modules" ]; then
    echo "❌ Frontend dependencies not found. Please run './scripts/setup.sh' first."
    exit 1
fi

if [ ! -d "backend/venv" ]; then
    echo "❌ Backend virtual environment not found. Please run './scripts/setup.sh' first."
    exit 1
fi

# Check for port conflicts
if lsof -i :3000 >/dev/null 2>&1; then
    echo "⚠️  Port 3000 is already in use. Please stop the process using port 3000."
    exit 1
fi

if lsof -i :8000 >/dev/null 2>&1; then
    echo "⚠️  Port 8000 is already in use. Please stop the process using port 8000."
    exit 1
fi

# Start backend
echo "🐍 Starting backend server on http://localhost:8000..."
cd backend
source venv/bin/activate
python main.py > ../backend.log 2>&1 &
BACKEND_PID=$!
cd ..

# Wait a moment for backend to start
sleep 3

# Check if backend started successfully
if ! curl -s http://localhost:8000/ >/dev/null; then
    echo "❌ Backend failed to start. Check backend.log for details."
    exit 1
fi

echo "✅ Backend started successfully"

# Start frontend
echo "🌐 Starting frontend server on http://localhost:3000..."
cd frontend
npm run dev > ../frontend.log 2>&1 &
FRONTEND_PID=$!
cd ..

# Wait a moment for frontend to start
sleep 5

# Check if frontend started successfully
if ! curl -s -I http://localhost:3000/ >/dev/null; then
    echo "❌ Frontend failed to start. Check frontend.log for details."
    exit 1
fi

echo "✅ Frontend started successfully"
echo ""
echo "🎉 Development servers are running!"
echo "   Frontend: http://localhost:3000"
echo "   Backend API: http://localhost:8000"
echo "   API Docs: http://localhost:8000/docs"
echo ""
echo "📝 Logs:"
echo "   Frontend: tail -f ../frontend.log"
echo "   Backend: tail -f ../backend.log"
echo ""
echo "Press Ctrl+C to stop all servers"

# Keep script running and show logs
tail -f ../frontend.log ../backend.log 