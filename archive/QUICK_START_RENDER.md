# Quick Start: Deploy to Render + Vercel

This is a condensed version of the deployment process. For detailed instructions, see `RENDER_DEPLOYMENT.md`.

## 🚨 Critical: Environment Variables Required

**IMPORTANT**: You need **TWO environment variables** for workflows to reach Analytics:
- `BACKEND_URL` (for proxy routes)
- `NEXT_PUBLIC_BACKEND_URL` (for client calls)

**Both must point to your Render backend URL!**

## Prerequisites
- GitHub account with your code pushed
- Render account ([render.com](https://render.com))
- Vercel account ([vercel.com](https://vercel.com))
- OpenAI API key

## 🚀 Step 1: Deploy Backend to Render (5 mins)

1. **Create Web Service on Render:**
   - Go to [Render Dashboard](https://dashboard.render.com)
   - **New +** → **Web Service**
   - Connect your GitHub repo

2. **Configure Service:**
   - **Name**: `any-agent-backend`
   - **Environment**: `Python 3`
   - **Root Directory**: `backend`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `python main.py`

3. **Set Environment Variables:**
   - **OPENAI_API_KEY**: `your_openai_api_key_here`
   - **ENVIRONMENT**: `production`

4. **Deploy & Get URL:**
   - Click "Create Web Service"
   - Wait 3-5 minutes for deployment
   - Copy your URL: `https://your-app-name.onrender.com`

## 🚀 Step 2: Deploy Frontend to Vercel (3 mins)

1. **Quick Deploy with Script:**
   ```bash
   # From project root, run:
   ./scripts/deploy.sh https://your-app-name.onrender.com
   ```

2. **Manual Alternative:**
   ```bash
   cd frontend
   
   # Create environment file with BOTH required variables
   echo "BACKEND_URL=https://your-app-name.onrender.com" > .env.local
   echo "NEXT_PUBLIC_BACKEND_URL=https://your-app-name.onrender.com" >> .env.local
   
   # Install Vercel CLI and deploy
   npm install -g vercel
   vercel --prod
   ```

3. **🚨 CRITICAL: Set BOTH Environment Variables in Vercel:**
   - Go to Vercel Dashboard → Your Project → Settings → Environment Variables
   - Add: `BACKEND_URL` = `https://your-app-name.onrender.com`
   - Add: `NEXT_PUBLIC_BACKEND_URL` = `https://your-app-name.onrender.com`
   - **Redeploy** your frontend

## ✅ Step 3: Test Your Deployment

1. **Test Backend:** Visit `https://your-app-name.onrender.com`
   - Should show: `{"message": "any-agent Workflow Composer Backend", "status": "running"}`

2. **Test Frontend:** Visit your Vercel URL
   - Should load the workflow composer interface
   - Try creating and running a simple workflow

3. **🚨 CRITICAL: Test Analytics Integration:**
   - Create a workflow in Designer and execute it
   - Check Analytics tab - execution should appear there
   - **If Analytics shows 0 workflows**: Environment variables not set correctly

## 🎉 You're Live!

Your Any-Agent Workflow Composer is now deployed and accessible worldwide!

**Frontend**: `https://your-frontend.vercel.app`
**Backend**: `https://your-app-name.onrender.com`

## 🔧 Common Issues & Fixes

**🚨 Workflows execute but don't appear in Analytics:**
- **Cause**: Missing environment variables in Vercel
- **Fix**: Ensure BOTH `BACKEND_URL` and `NEXT_PUBLIC_BACKEND_URL` are set
- **Test**: Check browser network tab for `/api/execute` calls returning 200

**Frontend can't connect to backend:**
- Check environment variables are set in Vercel
- Ensure backend URL is correct (no trailing slash)
- Wait a few minutes for DNS propagation

**Backend deployment fails:**
- Check Render logs for specific errors
- Verify OpenAI API key is set correctly
- Make sure all dependencies are in requirements.txt

## 💰 Cost Expectations

**Render (Backend):**
- Free tier: Good for testing (sleeps after 15 mins inactive)
- Starter ($7/month): No sleep, better for production

**Vercel (Frontend):**
- Hobby plan: Free (perfect for personal use)
- Pro ($20/month): For commercial projects

Total minimum cost: **$0/month** (free tiers) to **$27/month** (paid plans) 