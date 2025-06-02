# 🚀 Render Production Deployment with MCP Integration

## Overview

This guide covers deploying the any-agent Workflow Composer with full MCP integration to Render production environment.

## 📋 **Required Environment Variables in Render**

Set these in your Render service's **Environment** tab:

### **Core Backend Variables**
```bash
# Core API functionality
OPENAI_API_KEY=your_openai_api_key_here

# MCP Integration
ENABLE_MCP_SERVERS=true

# Production Detection (automatically set by Render)
RENDER=true
PORT=8000
```

### **Frontend Variables (in Vercel)**
```bash
# Replace with your actual Render backend URL
BACKEND_URL=https://your-backend-service.onrender.com
NEXT_PUBLIC_BACKEND_URL=https://your-backend-service.onrender.com
```

### **Optional: GitHub MCP Integration**
```bash
# For GitHub MCP server (optional but recommended)
GITHUB_PERSONAL_ACCESS_TOKEN=ghp_your_github_token_here
```

## 🎯 **What Gets Deployed Automatically**

### **✅ MCP Components Included**
- ✅ **MCP Manager**: Core server management (`backend/mcp_manager.py`)
- ✅ **Web Search Server**: DuckDuckGo integration (`backend/simple_mcp_server.py`)
- ✅ **GitHub MCP Server**: Official binary (`backend/github-mcp-server`)
- ✅ **Production Setup**: Auto-configuration script (`backend/setup_production_mcp.py`)
- ✅ **API Endpoints**: Full REST API for MCP management

### **🔧 Production Features**
- **Environment Detection**: Automatically detects Render environment
- **Path Resolution**: Uses production-appropriate file paths
- **Token Management**: Pulls GitHub token from environment variables
- **Auto-Configuration**: Generates proper MCP config on startup
- **Error Handling**: Graceful fallback if MCP setup fails

## 🚀 **Deployment Steps**

### **Step 1: Deploy Backend to Render**

1. **Connect Repository**: Link your GitHub repo to Render
2. **Service Settings**:
   - **Environment**: Python 3
   - **Build Command**: `pip install -r backend/requirements.txt`
   - **Start Command**: `cd backend && python main.py`
   - **Root Directory**: Leave empty (uses repo root)

3. **Environment Variables**: Add the variables listed above

### **Step 2: Deploy Frontend to Vercel**

1. **Vercel Configuration**:
   - **Framework**: Next.js
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `.next`

2. **Environment Variables**: Set `BACKEND_URL` and `NEXT_PUBLIC_BACKEND_URL` to your Render backend URL

### **Step 3: Test MCP Integration**

After deployment, verify MCP is working:

```bash
# Test MCP status
curl https://your-backend.onrender.com/mcp/enabled

# Expected response:
{
  "enabled": true,
  "available": true
}

# Test available servers
curl https://your-backend.onrender.com/mcp/servers

# Expected response: List of configured MCP servers
```

## 🎮 **Using MCP in Production**

### **In the Frontend UI**

1. **Access Settings**: Go to your deployed frontend → Settings → MCP Servers
2. **View Servers**: See configured MCP servers (Web Search, GitHub if token provided)
3. **Test Connections**: Click "Test Connection" for each server
4. **Add More Servers**: Use "Browse Available" to add additional servers

### **Available Tools in Production**

- **🔍 Web Search**: Real-time web search using DuckDuckGo
- **🐙 GitHub Integration**: 35+ GitHub tools (if token configured)
- **🔧 Server Management**: Add/remove servers via UI

## 🔐 **Security Considerations**

### **Environment Variables**
- ✅ **Never commit tokens** to your repository
- ✅ **Use Render's secure environment variables**
- ✅ **Rotate tokens regularly**
- ✅ **Use minimal required scopes** for GitHub tokens

### **GitHub Token Scopes**
For production GitHub integration, use these scopes:
```
✅ repo (if you need private repo access)
✅ public_repo (for public repos only)
✅ read:user
✅ user:email
✅ read:org (if you need organization access)
```

## 🧪 **Testing Production Deployment**

### **1. Basic Backend Health**
```bash
curl https://your-backend.onrender.com/
# Should return: {"message": "any-agent Workflow Composer Backend", "status": "running"}
```

### **2. MCP Integration Test**
```bash
curl https://your-backend.onrender.com/mcp/enabled
# Should return: {"enabled": true, "available": true}
```

### **3. Available Tools Test**
```bash
curl https://your-backend.onrender.com/mcp/tools
# Should return: List of available tools including MCP tools
```

### **4. Frontend Integration Test**
1. Open your deployed frontend
2. Go to Settings → MCP Servers
3. Should show enabled MCP integration
4. Should list configured servers with connection status

## 🐛 **Troubleshooting Production Issues**

### **"MCP not enabled" in Frontend**

**Possible Causes:**
- `ENABLE_MCP_SERVERS=true` not set in Render
- Backend not fully started
- Frontend pointing to wrong backend URL

**Fix:**
1. Check Render environment variables
2. Verify `BACKEND_URL` in Vercel matches your Render URL
3. Check Render logs for startup errors

### **GitHub Server Connection Failed**

**Possible Causes:**
- Invalid GitHub token
- Token missing required scopes
- Token expired

**Fix:**
1. Verify token in Render environment variables
2. Test token manually: `curl -H "Authorization: token YOUR_TOKEN" https://api.github.com/user`
3. Regenerate token with proper scopes

### **Web Search Not Working**

**Possible Causes:**
- `duckduckgo_search` dependency missing
- Network restrictions

**Fix:**
1. Check if `duckduckgo_search` is in `requirements.txt` ✅ (it is)
2. Check Render logs for import errors
3. Test manually in Render console

## 📊 **Production Performance**

### **Expected Startup Time**
- **Backend**: 30-60 seconds (includes MCP setup)
- **Frontend**: 20-30 seconds
- **MCP Server Connections**: 5-10 seconds per server

### **Resource Usage**
- **Memory**: ~512MB for backend with MCP
- **CPU**: Low usage, spikes during LLM calls
- **Network**: Outbound calls to OpenAI, GitHub, DuckDuckGo

## 🎉 **Production Success Indicators**

When properly deployed, you should see:

1. **✅ Backend Logs**: 
   ```
   ✅ Production MCP setup completed
   🔌 MCP Integration: Enabled
      - 2 MCP servers configured
   📡 Production backend starting on port 8000
   ```

2. **✅ Frontend UI**: MCP Servers tab shows active servers

3. **✅ API Responses**: All MCP endpoints return valid data

4. **✅ Workflow Execution**: Can create workflows using MCP tools

---

**🎯 Result**: Full-featured any-agent Workflow Composer with live MCP integration running in production!

**🔗 Related Docs**:
- [GitHub MCP Setup Guide](./GITHUB_MCP_SETUP.md)
- [MCP Quick Start](./MCP_QUICK_START.md)
- [Environment Variables Guide](./ENVIRONMENT_VARIABLES.md) 