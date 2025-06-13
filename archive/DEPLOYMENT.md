# Deployment Guide

This document outlines how to deploy the Any-Agent Workflow Composer to various platforms.

## 🚨 Critical: Proxy Architecture & Environment Variables

**IMPORTANT**: The frontend uses a proxy architecture where workflow executions from the Designer are routed through frontend API routes to the backend. This requires specific environment variable configuration.

### Required Environment Variables

The application requires **TWO different environment variables** for proper operation:

1. **`BACKEND_URL`** - Used by server-side API routes (like `/api/execute`) to proxy requests to the backend
2. **`NEXT_PUBLIC_BACKEND_URL`** - Used by client-side code for direct API calls

**Development Example:**
```bash
# In frontend/.env.local
BACKEND_URL=http://localhost:8000
NEXT_PUBLIC_BACKEND_URL=http://localhost:8000
```

**Production Example:**
```bash
# In Vercel environment variables
BACKEND_URL=https://your-backend.onrender.com
NEXT_PUBLIC_BACKEND_URL=https://your-backend.onrender.com
```

### How It Works

1. **Designer Executions**: When you click "Execute" in the Visual Designer, the request goes to `/api/execute`
2. **Frontend Proxy**: The `/api/execute` route uses `BACKEND_URL` to forward the request to your backend
3. **Analytics Integration**: Backend processes the workflow and records it in analytics
4. **Direct API Calls**: Some frontend components use `NEXT_PUBLIC_BACKEND_URL` for direct backend communication

**⚠️ Without proper environment variables**: Workflows will appear to execute but won't show up in Analytics, causing discrepancies between Designer execution counts and backend records.

## Architecture Overview

- **Frontend**: Next.js 14 app (Vercel-compatible)
- **Backend**: Python FastAPI server (requires separate hosting)

## Option A: Hybrid Deployment (Recommended)

### Frontend: Vercel
### Backend: Railway/Render/DigitalOcean

#### 1. Deploy Backend

**Option 1: Railway**
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login and deploy
railway login
cd backend
railway init
railway deploy
```

**Option 2: Render**
1. Connect your GitHub repo to Render
2. Create a new Web Service
3. Set build command: `cd backend && pip install -r requirements.txt`
4. Set start command: `cd backend && python main.py`
5. Set environment variables (OpenAI API key, etc.)

**Option 3: DigitalOcean App Platform**
1. Connect your GitHub repo
2. Configure build settings for the backend directory
3. Set environment variables

#### 2. Deploy Frontend to Vercel

**Prerequisites:**
```bash
# Create environment variables file
cp frontend/.env.example frontend/.env.local
# Edit .env.local with your deployed backend URL
```

**Steps:**
1. **Install Vercel CLI:**
   ```bash
   npm install -g vercel
   ```

2. **Deploy:**
   ```bash
   cd frontend
   vercel --prod
   ```

3. **Set Environment Variables in Vercel Dashboard:**
   - `BACKEND_URL`: Your deployed backend URL
   - `NEXT_PUBLIC_BACKEND_URL`: Your deployed backend URL

4. **Configure Custom Domain (Optional):**
   - Add your domain in Vercel dashboard
   - Update DNS settings

## Option B: Full Serverless (Advanced)

Convert the FastAPI backend to Vercel serverless functions:

### 1. Create API Routes Structure
```
frontend/
  app/
    api/
      execute/
        route.ts      # Main workflow execution
      frameworks/
        route.ts      # Framework info
      evaluations/
        route.ts      # Evaluation endpoints
```

### 2. Install Python Dependencies
```bash
cd frontend
npm install
# Vercel will handle Python dependencies via requirements.txt
```

### 3. Convert FastAPI Endpoints

Each FastAPI endpoint needs to be converted to a Next.js API route:

```typescript
// frontend/app/api/execute/route.ts
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  // Convert FastAPI logic to serverless function
  // Handle any-agent execution logic
}
```

## Configuration Files

### vercel.json
```json
{
  "version": 2,
  "builds": [
    {
      "src": "frontend/package.json",
      "use": "@vercel/next"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "frontend/$1"
    }
  ],
  "env": {
    "BACKEND_URL": "@backend-url"
  }
}
```

### Environment Variables

**⚠️ CRITICAL: Both environment variables are required for proper workflow execution!**

**Development (.env.local):**
```bash
# Required for proxy routes (server-side)
BACKEND_URL=http://localhost:8000

# Required for client-side API calls
NEXT_PUBLIC_BACKEND_URL=http://localhost:8000
```

**Production (Vercel Dashboard):**
```bash
# Required for proxy routes (server-side)
BACKEND_URL=https://your-backend.onrender.com

# Required for client-side API calls  
NEXT_PUBLIC_BACKEND_URL=https://your-backend.onrender.com

# Your AI provider API keys
OPENAI_API_KEY=your-openai-key
ANTHROPIC_API_KEY=your-anthropic-key
```

**Important Notes:**
- **DO NOT** use a trailing slash in URLs
- **Both variables** must point to the same backend URL
- **Restart** your development server after changing `.env.local`
- **Redeploy** your Vercel frontend after updating environment variables

## Database Requirements

If your backend uses persistent storage:

1. **PostgreSQL**: Use Railway, Supabase, or Neon
2. **Redis**: Use Railway Redis or Upstash
3. **File Storage**: Use Vercel Blob or AWS S3

## Monitoring & Logging

1. **Frontend**: Vercel Analytics
2. **Backend**: Your hosting platform's monitoring
3. **Errors**: Sentry integration
4. **Logs**: Centralized logging with LogTail or DataDog

## Deployment Checklist

### Pre-deployment
- [ ] Environment variables configured
- [ ] Backend deployed and accessible
- [ ] Frontend builds without errors
- [ ] API routes updated to use environment URLs
- [ ] Database migrations run (if applicable)

### Post-deployment
- [ ] Frontend loads correctly
- [ ] API calls reach backend successfully
- [ ] Workflow execution works
- [ ] Evaluation features functional
- [ ] WebSocket connections working
- [ ] Error handling and fallbacks tested

## Troubleshooting

### Common Issues

**1. Workflows Execute But Don't Appear in Analytics**
- **Symptom**: Designer shows exec_123 but Analytics shows 0 total workflows
- **Cause**: Missing or incorrect `BACKEND_URL` environment variable
- **Fix**: Ensure both `BACKEND_URL` and `NEXT_PUBLIC_BACKEND_URL` are set correctly
- **Verify**: Check browser network tab for `/api/execute` calls returning 200 status

**2. CORS Errors**
- **Cause**: Backend CORS settings not configured properly
- **Fix**: Configure backend CORS settings to allow your frontend domain

**3. Environment Variables Not Working**
- **Symptom**: Still connecting to localhost in production
- **Cause**: Environment variables not set in Vercel or missing `NEXT_PUBLIC_` prefix
- **Fix**: Set both variables in Vercel dashboard and redeploy

**4. WebSocket Issues**
- **Cause**: May need separate WebSocket server configuration
- **Fix**: Consider serverless optimization or dedicated WebSocket handling

**5. Cold Starts**
- **Cause**: Backend takes time to wake up on free hosting tiers
- **Fix**: Consider upgrading to paid hosting or implementing keep-alive pings

### Debug Steps

**1. Check Environment Variables**
```bash
# In your frontend directory
cat .env.local

# Should show both BACKEND_URL and NEXT_PUBLIC_BACKEND_URL
```

**2. Test Backend Connection**
```bash
# Test your backend directly
curl https://your-backend.onrender.com/

# Should return: {"status": "Any-Agent Workflow Composer Backend is running!"}
```

**3. Check Frontend API Route**
```bash
# Test the proxy route (replace with your frontend URL)
curl -X POST https://your-frontend.vercel.app/api/execute \
  -H "Content-Type: application/json" \
  -d '{"workflow_name": "test", "nodes": [], "edges": []}'
```

**4. Check Vercel Deployment Logs**
- Go to Vercel Dashboard → Your Project → Functions
- Check for any errors in the `/api/execute` function logs

**5. Check Network Requests**
- Open browser dev tools → Network tab
- Execute a workflow and look for `/api/execute` requests
- Verify the request reaches your backend successfully

## Cost Optimization

1. **Vercel**: Pro plan for production apps
2. **Backend Hosting**: Choose based on usage patterns
3. **Database**: Start with free tiers, scale as needed
4. **AI API Costs**: Monitor OpenAI usage

## Security Considerations

1. **Environment Variables**: Never commit secrets
2. **API Keys**: Rotate regularly
3. **CORS**: Configure restrictive origins
4. **Rate Limiting**: Implement on backend
5. **Authentication**: Add user auth if needed

---

For more specific help, check the hosting platform's documentation or contact support. 