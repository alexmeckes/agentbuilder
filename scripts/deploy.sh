#!/bin/bash

echo "🚀 Any-Agent Workflow Composer Deployment Script"
echo "================================================"

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Please run this script from the project root directory"
    exit 1
fi

# Check if render URL is provided
if [ -z "$1" ]; then
    echo "❌ Please provide your Render backend URL"
    echo "Usage: ./scripts/deploy.sh https://your-app-name.onrender.com"
    exit 1
fi

BACKEND_URL="$1"

echo "🔧 Setting up environment variables..."

# Create frontend environment file
cd frontend
echo "BACKEND_URL=$BACKEND_URL" > .env.local
echo "NEXT_PUBLIC_BACKEND_URL=$BACKEND_URL" >> .env.local

echo "✅ Created frontend/.env.local with backend URL: $BACKEND_URL"

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "📦 Installing Vercel CLI..."
    npm install -g vercel
fi

echo "🚀 Deploying to Vercel..."
echo "Please follow the prompts to configure your deployment"

# Deploy to Vercel
vercel --prod

echo ""
echo "🎉 Deployment complete!"
echo ""
echo "📋 Next steps:"
echo "1. Go to your Vercel dashboard"
echo "2. Set environment variables:"
echo "   - BACKEND_URL=$BACKEND_URL"
echo "   - NEXT_PUBLIC_BACKEND_URL=$BACKEND_URL"
echo "3. Redeploy your frontend"
echo "4. Test your deployed application"
echo ""
echo "📖 For detailed instructions, see RENDER_DEPLOYMENT.md" 