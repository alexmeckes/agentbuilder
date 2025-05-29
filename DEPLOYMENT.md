# Deployment Guide

This document outlines how to deploy the Any-Agent Workflow Composer to various platforms.

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

**Development (.env.local):**
```
BACKEND_URL=http://localhost:8000
NEXT_PUBLIC_BACKEND_URL=http://localhost:8000
```

**Production (Vercel Dashboard):**
```
BACKEND_URL=https://your-backend.railway.app
NEXT_PUBLIC_BACKEND_URL=https://your-backend.railway.app
OPENAI_API_KEY=your-openai-key
```

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

1. **CORS Errors**: Configure backend CORS settings
2. **Environment Variables**: Ensure all required vars are set
3. **WebSocket Issues**: May need separate WebSocket server
4. **Cold Starts**: Consider serverless optimization

### Debug Steps

1. Check Vercel deployment logs
2. Verify environment variables
3. Test API endpoints directly
4. Check network requests in browser dev tools

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