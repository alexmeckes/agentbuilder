# Deployment Guide

This guide covers deploying the Any-Agent Workflow Composer to production using Vercel (frontend) and Render (backend).

## Architecture Overview

```
User Browser → Vercel Frontend (Next.js) → Render Backend (FastAPI) → External Services
```

## Prerequisites

- GitHub repository with your code
- Vercel account (for frontend)
- Render account (for backend)
- API keys for AI providers (OpenAI, Anthropic, etc.)

## Backend Deployment (Render)

### 1. Create Web Service

1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click **"New +"** → **"Web Service"**
3. Connect your GitHub repository

### 2. Configure Build Settings

- **Name**: `any-agent-backend`
- **Environment**: `Python 3`
- **Branch**: `main`
- **Root Directory**: `backend`
- **Build Command**: `pip install -r requirements.txt`
- **Start Command**: `python main.py`

### 3. Environment Variables

Add these in the Render dashboard:

```bash
OPENAI_API_KEY=your-openai-key
ANTHROPIC_API_KEY=your-anthropic-key  # Optional
# Add other provider keys as needed
```

### 4. Deploy

Click "Create Web Service" and wait for deployment. Note your backend URL (e.g., `https://any-agent-backend.onrender.com`).

## Frontend Deployment (Vercel)

### 1. Import Project

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click "Add New..." → "Project"
3. Import your GitHub repository

### 2. Configure Build Settings

Vercel usually auto-detects Next.js. Verify:
- **Framework Preset**: Next.js
- **Root Directory**: `frontend`
- **Build Command**: `npm run build`

### 3. Environment Variables

Add these in Vercel dashboard:

```bash
# Required - both variables needed for proper operation
BACKEND_URL=https://your-backend.onrender.com
NEXT_PUBLIC_BACKEND_URL=https://your-backend.onrender.com
```

**Important**: Both variables must be set for the proxy architecture to work correctly.

### 4. Deploy

Click "Deploy" and wait for completion.

## Post-Deployment

### Verify Installation

1. **Backend Health Check**: Visit `https://your-backend.onrender.com/`
2. **Frontend**: Visit your Vercel URL
3. **Test Workflow**: Create and execute a simple workflow

### Composio Integration (Optional)

To enable Composio tools:

1. Get API key from [app.composio.dev](https://app.composio.dev)
2. Add to user settings in the application
3. Connect desired apps (Google Docs, GitHub, Slack, etc.)

## Troubleshooting

### Backend Issues

**Service fails to start:**
- Check logs in Render dashboard
- Verify all required dependencies in `requirements.txt`
- Ensure Python version compatibility

**CORS errors:**
- Backend already configured for production CORS
- Verify frontend URL matches allowed origins

### Frontend Issues

**Workflows execute but don't appear in Analytics:**
- Verify both `BACKEND_URL` and `NEXT_PUBLIC_BACKEND_URL` are set
- Check browser console for API errors
- Ensure backend is accessible from frontend

**Build failures:**
- Check Node.js version compatibility
- Clear build cache in Vercel dashboard
- Verify all dependencies are listed in `package.json`

## Monitoring

- **Backend Logs**: Available in Render dashboard
- **Frontend Logs**: Available in Vercel dashboard
- **Application Analytics**: Built-in analytics tab shows execution metrics

## Scaling

### Backend
- Render automatically handles scaling
- Consider upgrading plan for more resources
- Enable health checks for better reliability

### Frontend
- Vercel provides automatic scaling
- CDN distribution included
- No additional configuration needed

## Security Notes

- Keep API keys secure in environment variables
- Use HTTPS for all connections
- Regularly update dependencies
- Monitor usage to prevent abuse

For local development setup, see [Development Guide](./development/setup.md).