# Render + Vercel Deployment Guide

This guide will walk you through deploying your Any-Agent Workflow Composer using Render for the backend and Vercel for the frontend.

## 🚨 Critical: Environment Variables Required

**IMPORTANT**: The frontend uses a proxy architecture that requires **TWO environment variables** to work properly. Without these, workflow executions from the Designer won't reach your backend Analytics.

### Required Variables:
- **`BACKEND_URL`** - For server-side API routes (proxying)
- **`NEXT_PUBLIC_BACKEND_URL`** - For client-side API calls

**Both must point to your Render backend URL!**

## Prerequisites

1. **GitHub Repository**: Push your code to GitHub
2. **Render Account**: Sign up at [render.com](https://render.com)
3. **Vercel Account**: Sign up at [vercel.com](https://vercel.com)
4. **OpenAI API Key**: Get one from [OpenAI](https://platform.openai.com/api-keys)

## Step 1: Deploy Backend to Render

### 1.1 Create New Web Service

1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click **"New +"** → **"Web Service"**
3. Connect your GitHub repository
4. Select your repository: `any-agent-main-2`

### 1.2 Configure Build Settings

**Basic Settings:**
- **Name**: `any-agent-backend` (or your preferred name)
- **Environment**: `Python 3`
- **Region**: Choose closest to your users
- **Branch**: `main` (or your default branch)
- **Root Directory**: `backend`

**Build & Deploy Settings:**
- **Build Command**: `pip install -r requirements.txt`
- **Start Command**: `python main.py`

### 1.3 Set Environment Variables

In the **Environment** section, add:
- **Key**: `OPENAI_API_KEY`
- **Value**: Your OpenAI API key (keep this secret!)

### 1.4 Deploy

1. Click **"Create Web Service"**
2. Render will start building and deploying your backend
3. Wait for deployment to complete (usually 3-5 minutes)
4. Note your deployed URL: `https://your-app-name.onrender.com`

## Step 2: Deploy Frontend to Vercel

### 2.1 Install Vercel CLI

```bash
npm install -g vercel
```

### 2.2 Prepare Frontend

1. Navigate to your frontend directory:
```bash
cd frontend
```

2. **🚨 CRITICAL: Create environment file with BOTH variables:**
```bash
# Create .env.local file with BOTH required environment variables
echo "BACKEND_URL=https://your-app-name.onrender.com" > .env.local
echo "NEXT_PUBLIC_BACKEND_URL=https://your-app-name.onrender.com" >> .env.local
```

**⚠️ Replace `your-app-name.onrender.com` with your actual Render URL!**

**Why both variables?**
- `BACKEND_URL`: Used by `/api/execute` route to proxy Designer requests to backend
- `NEXT_PUBLIC_BACKEND_URL`: Used by client-side code for direct API calls

**Without both variables**: Workflows will execute but won't appear in Analytics!

### 2.3 Deploy to Vercel

```bash
# Login to Vercel
vercel login

# Deploy from frontend directory
vercel --prod
```

Follow the prompts:
- **Set up and deploy?** → Yes
- **Which scope?** → Your personal account
- **Link to existing project?** → No
- **Project name?** → any-agent-frontend (or preferred name)
- **Directory?** → `./` (current directory)

### 2.4 Set Environment Variables in Vercel

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Find your project → **Settings** → **Environment Variables**
3. **🚨 CRITICAL: Add BOTH variables:**
   - **Name**: `BACKEND_URL`, **Value**: `https://your-app-name.onrender.com`
   - **Name**: `NEXT_PUBLIC_BACKEND_URL`, **Value**: `https://your-app-name.onrender.com`

4. **Redeploy** your frontend after adding environment variables

## Step 3: Verify Deployment

### 3.1 Test Backend

Visit your Render URL: `https://your-app-name.onrender.com`
You should see: `{"status": "Any-Agent Workflow Composer Backend is running!"}`

### 3.2 Test Frontend

Visit your Vercel URL: `https://your-frontend.vercel.app`
Your workflow composer should load and be able to communicate with the backend.

### 3.3 Test Full Workflow & Analytics Integration

1. Create a simple workflow in the Designer
2. Execute it and note the execution ID (e.g., exec_5)
3. **Check Analytics tab** - the execution should appear there
4. **If Analytics shows 0 workflows**: Environment variables are not set correctly

## Step 4: Custom Domain (Optional)

### For Frontend (Vercel):
1. Go to Project Settings → Domains
2. Add your custom domain
3. Configure DNS records as instructed

### For Backend (Render):
1. Go to Service Settings → Custom Domains
2. Add your custom domain
3. Configure DNS records as instructed

## Troubleshooting

### Common Issues

**🚨 Workflows Execute But Don't Appear in Analytics:**
- **Symptom**: Designer shows exec_123 but Analytics shows 0 total workflows
- **Cause**: Missing or incorrect environment variables in Vercel
- **Fix**: Ensure BOTH `BACKEND_URL` and `NEXT_PUBLIC_BACKEND_URL` are set
- **Verify**: Check browser network tab for successful `/api/execute` calls

**Backend fails to start:**
- Check Render logs for errors
- Verify all environment variables are set
- Ensure requirements.txt includes all dependencies

**Frontend can't connect to backend:**
- Verify BOTH environment variables in Vercel
- Check that URLs point to your Render service (no trailing slash)
- Ensure CORS is properly configured in backend

**"Module not found" errors:**
- Check that all dependencies are in requirements.txt
- Verify Python version compatibility

### Debug Commands

**Check backend logs:**
```bash
# In Render dashboard, go to your service → Logs
```

**Test backend directly:**
```bash
curl https://your-app-name.onrender.com/
```

**Test frontend proxy route:**
```bash
curl -X POST https://your-frontend.vercel.app/api/execute \
  -H "Content-Type: application/json" \
  -d '{"workflow_name": "test", "nodes": [], "edges": []}'
```

## Cost Estimates

**Render (Backend):**
- Free tier: Good for development/testing
- Starter ($7/month): Better performance, custom domains
- Pro ($25/month): Production workloads

**Vercel (Frontend):**
- Hobby (Free): Perfect for personal projects
- Pro ($20/month): Better for production with custom domains

## Security Considerations

1. **Never commit API keys** to your repository
2. **Use environment variables** for all sensitive data
3. **Enable HTTPS** (both platforms do this automatically)
4. **Consider rate limiting** for production use
5. **Monitor usage** to avoid unexpected costs

## Next Steps

1. **Set up monitoring**: Both platforms provide built-in monitoring
2. **Configure custom domains**: For professional appearance
3. **Set up CI/CD**: Auto-deploy on git push
4. **Add authentication**: If needed for your use case
5. **Monitor costs**: Keep track of usage on both platforms

---

Your Any-Agent Workflow Composer is now live! 🎉

**Frontend**: https://your-frontend.vercel.app
**Backend**: https://your-app-name.onrender.com