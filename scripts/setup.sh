#!/bin/bash

# Any-Agent Workflow Composer - Setup Script
# This script sets up the development environment

set -e  # Exit on any error

echo "🚀 Setting up Any-Agent Workflow Composer..."

# Check if we're in the right directory
if [ ! -f "package.json" ] && [ ! -f "pyproject.toml" ]; then
    echo "❌ Error: Please run this script from the project root directory"
    exit 1
fi

# Install frontend dependencies
echo "📦 Installing frontend dependencies..."
cd frontend
if [ ! -f "package.json" ]; then
    echo "❌ Error: frontend/package.json not found"
    exit 1
fi

npm install
cd ..

# Setup backend virtual environment and dependencies
echo "🐍 Setting up backend environment..."
cd backend

# Create virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
    echo "Creating Python virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment and install dependencies
echo "Installing Python dependencies..."
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt

# Check if any-agent is installed
if ! python -c "import any_agent" 2>/dev/null; then
    echo "⚠️  Warning: any-agent not found. You may need to install it separately."
    echo "   Run: pip install 'any-agent[openai]' or 'any-agent[all]'"
fi

cd ..

echo "✅ Setup complete!"
echo ""
echo "🎯 Next steps:"
echo "   1. Set your API keys (e.g., export OPENAI_API_KEY='your-key')"
echo "   2. Run './scripts/dev.sh' to start development servers"
echo "   3. Open http://localhost:3000 for frontend"
echo "   4. Open http://localhost:8000/docs for backend API docs" 