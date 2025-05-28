#!/bin/bash

# any-agent Workflow Composer Stop Script
# This script stops both the backend and frontend services

echo "🛑 Stopping any-agent Workflow Composer..."
echo "============================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to kill processes on a port
kill_port() {
    local port=$1
    local service_name=$2
    echo -e "${YELLOW}🔄 Stopping $service_name (port $port)...${NC}"
    
    # Get PIDs using the port
    PIDS=$(lsof -ti:$port 2>/dev/null || true)
    
    if [ -n "$PIDS" ]; then
        echo -e "${BLUE}   Found processes: $PIDS${NC}"
        # Try graceful shutdown first
        echo "$PIDS" | xargs kill -TERM 2>/dev/null || true
        sleep 3
        
        # Check if processes are still running
        REMAINING_PIDS=$(lsof -ti:$port 2>/dev/null || true)
        if [ -n "$REMAINING_PIDS" ]; then
            echo -e "${YELLOW}   Force killing remaining processes...${NC}"
            echo "$REMAINING_PIDS" | xargs kill -9 2>/dev/null || true
        fi
        echo -e "${GREEN}   ✅ $service_name stopped${NC}"
    else
        echo -e "${BLUE}   ℹ️  No $service_name processes found on port $port${NC}"
    fi
}

# Stop backend (port 8000)
kill_port 8000 "Backend"

# Stop frontend (ports 3000 and 3001)
kill_port 3000 "Frontend"
kill_port 3001 "Frontend (fallback)"

# Kill any remaining Python processes running main.py
echo -e "${YELLOW}🔄 Stopping any remaining backend processes...${NC}"
pkill -f "python main.py" 2>/dev/null || true

# Kill any remaining npm dev processes
echo -e "${YELLOW}🔄 Stopping any remaining frontend processes...${NC}"
pkill -f "npm run dev" 2>/dev/null || true

# Clean up log files (optional)
echo -e "${BLUE}🧹 Cleaning up log files...${NC}"
rm -f backend.log frontend.log

echo ""
echo -e "${GREEN}✅ any-agent Workflow Composer stopped successfully!${NC}"
echo -e "${BLUE}💡 To start again, run: ./start.sh${NC}" 