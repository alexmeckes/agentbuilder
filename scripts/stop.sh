#!/bin/bash

# Any-Agent Workflow Composer - Stop Script
# Gracefully stops all running servers

echo "🛑 Stopping Any-Agent Workflow Composer servers..."

# Function to kill processes on specific ports
kill_port() {
    local port=$1
    local name=$2
    
    if lsof -i :$port >/dev/null 2>&1; then
        echo "Stopping $name on port $port..."
        lsof -ti :$port | xargs kill -TERM 2>/dev/null || true
        sleep 2
        
        # Force kill if still running
        if lsof -i :$port >/dev/null 2>&1; then
            echo "Force stopping $name..."
            lsof -ti :$port | xargs kill -KILL 2>/dev/null || true
        fi
        
        echo "✅ $name stopped"
    else
        echo "ℹ️  $name not running on port $port"
    fi
}

# Stop frontend (port 3000)
kill_port 3000 "Frontend"

# Stop backend (port 8000)
kill_port 8000 "Backend"

# Kill any remaining node or python processes related to the project
pkill -f "next dev" 2>/dev/null || true
pkill -f "main.py" 2>/dev/null || true

echo "✅ All servers stopped" 