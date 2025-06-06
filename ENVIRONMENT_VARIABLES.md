# Environment Variables Guide

## 🚨 Critical: Two Environment Variables Required

The Any-Agent Workflow Composer requires **TWO environment variables** to function properly. Without both, workflows will execute but won't appear in Analytics.

## Required Variables

### 1. `BACKEND_URL`
- **Purpose**: Used by server-side API routes (like `/api/execute`)
- **Usage**: Proxies Designer workflow executions to the backend
- **Required for**: Workflow executions to reach Analytics

### 2. `NEXT_PUBLIC_BACKEND_URL`
- **Purpose**: Used by client-side code for direct API calls
- **Usage**: Direct frontend-to-backend communication
- **Required for**: General API communication

## Setup Instructions

### Development (Local)

**Quick Setup:**
```bash
./scripts/setup-env.sh
```

**Manual Setup:**
```bash
cd frontend
echo "BACKEND_URL=http://localhost:8000" > .env.local
echo "NEXT_PUBLIC_BACKEND_URL=http://localhost:8000" >> .env.local
```

### Production (Vercel + Render)

**In Vercel Dashboard:**
1. Go to Project Settings → Environment Variables
2. Add both variables:
   - `BACKEND_URL` = `https://your-backend.onrender.com`
   - `NEXT_PUBLIC_BACKEND_URL` = `https://your-backend.onrender.com`
3. Redeploy your frontend

## How It Works

### The Proxy Architecture

```mermaid
graph LR
    A[Designer Execute Button] --> B[/api/execute]
    B --> C[BACKEND_URL]
    C --> D[Backend Analytics]
    
    E[Other Frontend Components] --> F[NEXT_PUBLIC_BACKEND_URL]
    F --> D
```

1. **Designer Execution Flow**:
   - User clicks "Execute" in Visual Designer
   - Request goes to frontend `/api/execute` route
   - Route uses `BACKEND_URL` to proxy to backend
   - Backend processes workflow and records in Analytics

2. **Direct API Flow**:
   - Frontend components make direct API calls
   - Uses `NEXT_PUBLIC_BACKEND_URL` for backend communication
   - Used for fetching frameworks, evaluations, etc.

## Common Issues

### ❌ Workflows Execute But Don't Appear in Analytics

**Symptom:**
- Designer shows execution IDs like `exec_123`
- Analytics tab shows `0 total workflows`
- Backend logs show only 3 executions vs Designer showing 128+

**Cause:**
- Missing `BACKEND_URL` environment variable
- Frontend `/api/execute` route can't reach backend

**Fix:**
1. Check `frontend/.env.local` contains both variables
2. For production: Check Vercel environment variables
3. Restart development server or redeploy

**Verify Fix:**
- Open browser dev tools → Network tab
- Execute a workflow in Designer
- Look for `/api/execute` request returning 200 status
- Check Analytics tab for new execution

### ❌ Environment Variables Not Working

**Common Mistakes:**
- Adding trailing slash: `http://localhost:8000/` ❌
- Only setting one variable ❌
- Forgetting to restart dev server ❌
- Not redeploying Vercel after setting variables ❌

**Correct Format:**
- Development: `http://localhost:8000` ✅
- Production: `https://your-backend.onrender.com` ✅

## Testing Your Setup

### 1. Check Environment File
```bash
cat frontend/.env.local
```
Should show both variables.

### 2. Test Backend Connection
```bash
curl http://localhost:8000/
# Should return: {"status": "Any-Agent Workflow Composer Backend is running!"}
```

### 3. Test Proxy Route
```bash
curl -X POST http://localhost:3000/api/execute \
  -H "Content-Type: application/json" \
  -d '{"workflow_name": "test", "nodes": [], "edges": []}'
```

### 4. Test Full Workflow
1. Create a workflow in Designer
2. Execute it (note the execution ID)
3. Check Analytics tab
4. Execution should appear with correct name

## Why Both Variables Are Needed

**Historical Context:**
- Originally only used `NEXT_PUBLIC_BACKEND_URL`
- Added proxy architecture for better production deployment
- Proxy routes need `BACKEND_URL` (server-side)
- Client code still needs `NEXT_PUBLIC_BACKEND_URL`

**Benefits of Proxy Architecture:**
- Consistent behavior across environments
- Better CORS handling
- Easier deployment configuration
- No code changes needed for different environments

## Deployment Recommendations

**✅ Recommended: Always Use Proxy**
- Use environment variables for backend URL
- No code changes needed for deployment
- Works consistently across environments

**❌ Not Recommended: Direct Client Calls Only**
- Requires code changes for different environments
- CORS configuration complexity
- Environment-specific builds

---

**Remember**: Both `BACKEND_URL` and `NEXT_PUBLIC_BACKEND_URL` must be set for proper operation! 

## Optional Variables

### `BASIC_AUTH_USERNAME` & `BASIC_AUTH_PASSWORD`
- **Purpose**: Secures the frontend application with a simple username and password.
- **Usage**: When set in a production environment (e.g., Vercel), the site will prompt for a username and password before allowing access.
- **Required for**: Restricting access to the deployed frontend. 