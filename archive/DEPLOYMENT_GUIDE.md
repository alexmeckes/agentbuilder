# 🚀 Deployment Guide: Vercel + Render

This guide covers deploying the **any-agent Workflow Composer** with **MCP integration** to production.

## ✅ **Production Ready Features**

The system has been thoroughly tested and optimized for production deployment:

- ✅ **Zero breaking changes** to existing functionality
- ✅ **Cost calculation system** with GenAI semantic convention support
- ✅ **Graceful fallbacks** when MCP is disabled  
- ✅ **Environment-based configuration**
- ✅ **CORS already configured** for production
- ✅ **Analytics cache-busting** for real-time data

## 🎯 **Architecture Overview**

```
User Browser
     ↓
Vercel Frontend (Next.js)
     ↓ (API calls via Next.js API routes)
Render Backend (FastAPI)
     ↓ (Optional: MCP servers)
External Services (when Phase 2 enabled)
```

---

# 🌐 **Frontend Deployment (Vercel)**

## **1. Prerequisites**
- GitHub repository with the frontend code
- Vercel account connected to GitHub

## **2. Vercel Configuration**

### **Environment Variables** (Set in Vercel Dashboard)
```bash
# Required: Backend URL
BACKEND_URL=https://your-backend-name.onrender.com

# Optional: For custom domains
NEXT_PUBLIC_SITE_URL=https://your-custom-domain.com
```

### **Build Settings** (Usually auto-detected)
- **Framework Preset**: Next.js
- **Build Command**: `npm run build`
- **Output Directory**: Leave empty (Next.js default)
- **Install Command**: `npm install`

### **Root Directory**
Set to `frontend` if deploying from a monorepo.

## **3. Deploy Steps**

1. **Connect Repository**:
   - Go to Vercel Dashboard → "New Project"
   - Import your GitHub repository
   - Select the `frontend` folder as root directory

2. **Configure Environment**:
   - Set `BACKEND_URL` to your Render backend URL
   - Add any other required environment variables

3. **Deploy**:
   - Click "Deploy"
   - Vercel will automatically build and deploy

4. **Custom Domain** (Optional):
   - Go to Project Settings → Domains
   - Add your custom domain

## **4. MCP Integration Compatibility**

✅ **Already Compatible**: The frontend API routes automatically proxy to the backend, so no additional configuration is needed for MCP features.

---

# 🚀 **Backend Deployment (Render)**

## **1. Prerequisites**
- GitHub repository with the backend code
- Render account

## **2. Render Configuration**

### **Service Settings**
- **Environment**: Python 3
- **Build Command**: `pip install -r requirements.txt`
- **Start Command**: `python main.py`
- **Root Directory**: `backend` (if monorepo)

### **Environment Variables** (Set in Render Dashboard)

#### **Required Variables**
```bash
# AI Provider API Keys
OPENAI_API_KEY=your_openai_api_key_here
ANTHROPIC_API_KEY=your_anthropic_api_key_here  # Optional

# Environment Detection
ENVIRONMENT=production
RENDER=true

# Python Path (if needed)
PYTHONPATH=/opt/render/project/src
```

#### **MCP Configuration** (Phase 1 - Optional)
```bash
# Phase 1: Keep disabled for safety
ENABLE_MCP_SERVERS=false

# Phase 2: Enable when ready for live MCP servers
# ENABLE_MCP_SERVERS=true
```

### **Health Check**
- **Health Check Path**: `/`
- **Expected Response**: `200 OK`

## **3. Deploy Steps**

1. **Create Web Service**:
   - Go to Render Dashboard → "New +"
   - Select "Web Service"
   - Connect your GitHub repository

2. **Configure Service**:
   - **Name**: `your-project-backend`
   - **Environment**: Python 3
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `python main.py`
   - **Instance Type**: Starter (can upgrade later)

3. **Set Environment Variables**:
   - Add all required environment variables listed above
   - **Important**: Set `ENVIRONMENT=production` and `RENDER=true`

4. **Deploy**:
   - Click "Create Web Service"
   - Render will build and deploy automatically

## **4. MCP Integration Compatibility**

✅ **Already Compatible**: The backend includes:
- MCP dependencies in `requirements.txt`
- Graceful fallbacks when MCP is disabled
- Environment-based configuration
- Production-ready CORS settings

---

# 🔧 **Post-Deployment Configuration**

## **1. Update Frontend Backend URL**

After the backend is deployed, update the frontend's environment variable:

```bash
# In Vercel Dashboard → Project → Settings → Environment Variables
BACKEND_URL=https://your-backend-name.onrender.com
```

Then redeploy the frontend.

## **2. Test the Deployment**

### **Health Checks**
```bash
# Backend health check
curl https://your-backend-name.onrender.com/

# Frontend health check
curl https://your-frontend.vercel.app/

# Analytics data check (verify cost calculation)
curl https://your-backend-name.onrender.com/analytics/workflows

# MCP integration check
curl https://your-backend-name.onrender.com/mcp/enabled
```

### **Expected Responses**
```json
// Backend root
{"message": "any-agent Workflow Composer Backend", "status": "running"}

// Analytics data (after executions)
{
  "total_workflows": 3,
  "performance_overview": {
    "total_cost": 0.002844,
    "average_cost_per_execution": 0.000948
  }
}

// MCP status (Phase 1)
{"enabled": false, "available": true}
```

## **3. Verify MCP Features**

1. **Access Settings**: Frontend → Settings → MCP Servers tab
2. **Check Status**: Should show "Available but not enabled" 
3. **Browse Servers**: Should display available MCP servers
4. **Tool Selection**: Enhanced tool selector should work in workflow designer

---

# 🚨 **Troubleshooting**

## **Common Issues**

### **CORS Errors**
✅ **Already Fixed**: CORS is pre-configured for Vercel domains in the backend.

### **Environment Variables Not Set**
- **Render**: Check Dashboard → Service → Environment
- **Vercel**: Check Dashboard → Project → Settings → Environment Variables

### **MCP Import Errors**
✅ **Already Fixed**: Backend has try/catch blocks and graceful fallbacks.

### **API Connection Issues**
- Verify `BACKEND_URL` in Vercel matches your Render URL
- Check Render service is running (not sleeping)

## **Health Check Commands**

```bash
# Test backend directly
curl https://your-backend.onrender.com/mcp/enabled

# Test frontend API proxy
curl https://your-frontend.vercel.app/api/mcp/enabled

# Test full tool chain
curl https://your-frontend.vercel.app/api/mcp/tools
```

---

# 🎉 **Success! What You Get**

After successful deployment:

✅ **Production-ready any-agent workflow composer**  
✅ **Enhanced tool selection interface**  
✅ **MCP server browsing and management**  
✅ **All existing functionality preserved**  
✅ **Foundation ready for Phase 2 MCP features**  

## **Phase 1 Features Working in Production**
- Enhanced tool selector with search and filtering
- MCP settings panel with server browsing
- Real-time status indicators  
- Backwards compatibility with existing workflows
- Production-ready infrastructure for future MCP integration

## **Phase 2 Activation** (Future)
When you're ready to enable live MCP servers:
1. Set `ENABLE_MCP_SERVERS=true` in Render
2. Redeploy the backend  
3. Configure your first MCP server via the settings panel

---

**🎯 You now have a production deployment with the complete MCP foundation ready to scale!** 