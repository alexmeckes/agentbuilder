# 🤖 AI Agent Onboarding Guide

**Welcome, AI Agent!** This guide will help you quickly understand and work with the Any-Agent Workflow Composer repository.

---

## 🎯 **CRITICAL CONTEXT: This is a WORKING, PRODUCTION-READY Application**

**NOT a prototype, NOT a mockup, NOT a demo** - This is a fully functional AI workflow composer with:
- ✅ Real OpenAI API integration
- ✅ Complete frontend with 6 functional tabs
- ✅ Comprehensive backend with all APIs working
- ✅ Real execution data and analytics
- ✅ Clean, maintainable architecture

---

## 🚀 **Quick Start (30 seconds)**

```bash
# 1. Start development (if not already running)
./scripts/dev.sh

# 2. Access the application
# Frontend: http://localhost:3000
# Backend: http://localhost:8000
# API Docs: http://localhost:8000/docs
```

**That's it!** The application is fully functional and ready to use.

---

## 📁 **Repository Structure (Essential Files)**

### **Active Directories (WORK HERE)**
```
frontend/               # Next.js React frontend
├── app/
│   ├── page.tsx       # Main UI (353 lines) - START HERE
│   ├── components/    # All UI components
│   ├── types/         # TypeScript definitions
│   └── api/           # Next.js API routes

backend/                # FastAPI Python backend  
├── main.py            # Main server (1367 lines) - START HERE
├── visual_to_anyagent_translator.py  # Workflow execution
├── setup_env.py       # Environment setup
└── requirements.txt   # Dependencies

scripts/                # Development automation
├── setup.sh           # One-time setup
├── dev.sh             # Start development
└── stop.sh            # Stop services
```

### **Archive Directory (DON'T MODIFY)**
```
archive/                # Old implementations (REFERENCE ONLY)
├── workflow-composer/  # Original complex version
├── app/               # Old app directory
└── src/               # Alternative structure
```

---

## 🎨 **Frontend Architecture**

### **Main UI Component** (`frontend/app/page.tsx`)
```typescript
// 6 main tabs, all functional:
const tabs = [
  'assistant',     // AI chat interface
  'designer',      // Visual workflow builder  
  'experiments',   // A/B testing
  'evaluations',   // LLM evaluation system
  'traces',        // Execution traces
  'analytics'      // Real-time analytics
]
```

### **Key Components**
- **`WorkflowEditor.tsx`** - ReactFlow visual designer
- **`ChatInterface.tsx`** - AI assistant chat
- **`EvaluationsPage.tsx`** - Comprehensive evaluation system
- **`AnalyticsDashboard.tsx`** - Real-time analytics
- **`ExperimentsPage.tsx`** - A/B testing interface
- **`TraceViewer.tsx`** - Execution trace analysis

### **API Integration**
- All components connect to backend via `/api/` routes
- Real-time updates via polling
- Error handling with user feedback

---

## 🔧 **Backend Architecture**

### **Main Server** (`backend/main.py`)
```python
# Key classes:
class WorkflowExecutor:
    # Executes workflows using any-agent
    # Generates intelligent workflow names
    # Tracks real execution data

# Key endpoints:
@app.post("/execute")              # Execute workflows
@app.get("/analytics/workflows")   # Real analytics data
@app.get("/traces")               # Execution traces
@app.get("/evaluations/cases")    # Evaluation system
```

### **Real Integration**
- **any-agent framework** - Multi-agent orchestration
- **OpenAI API** - Real API calls (not mock)
- **Process isolation** - Resolves asyncio conflicts
- **Intelligent naming** - AI-powered workflow categorization

---

## 🎯 **Key Features Implemented**

### **1. Visual Workflow Builder**
- Drag-and-drop interface using ReactFlow
- Agent, Tool, Input, Output nodes
- Real-time execution with live updates
- Model selection (GPT-4, Claude, etc.)

### **2. AI Assistant**
- Natural language workflow creation
- Chat interface with real AI responses
- Workflow extraction from conversations

### **3. Evaluation System** (COMPREHENSIVE)
- LLM-as-a-Judge evaluation
- Custom criteria configuration
- Test case management
- Detailed results analysis

### **4. Analytics Dashboard**
- Real execution data (not mock)
- Performance metrics and trends
- Cost analysis and optimization
- Framework usage statistics

### **5. A/B Testing**
- Experiment configuration
- Variant comparison
- Statistical analysis
- Performance optimization

### **6. Intelligent Systems**
- AI-powered workflow naming
- Automatic categorization
- Performance insights
- Cost optimization

---

## 🛠️ **Common Development Tasks**

### **Adding New Features**
```bash
# Frontend changes
cd frontend/app/components/
# Edit relevant component files

# Backend changes  
cd backend/
# Edit main.py or related files

# Test changes
./scripts/dev.sh  # Restart if needed
```

### **Debugging**
```bash
# View logs
tail -f backend.log frontend.log

# Check API endpoints
curl http://localhost:8000/
curl http://localhost:8000/analytics/workflows

# Frontend debugging
# Open browser dev tools at http://localhost:3000
```

### **Understanding Data Flow**
1. **Frontend** sends requests to `/api/` routes
2. **Next.js API routes** forward to backend
3. **Backend** processes via any-agent framework
4. **Real OpenAI API** calls executed
5. **Results** returned with intelligent naming
6. **Analytics** updated with real execution data

---

## 📊 **Data & State Management**

### **Real Data Sources**
- **Execution data** - Stored in `WorkflowExecutor.executions`
- **Analytics** - Generated from real execution history
- **Traces** - Actual any-agent execution traces
- **Costs** - Real OpenAI API usage tracking

### **No Mock Data**
- All analytics show real execution data
- Traces contain actual performance metrics
- Costs reflect real API usage
- Names generated by AI, not hardcoded

---

## 🔍 **Troubleshooting Guide**

### **Common Issues**
```bash
# Port conflicts
./scripts/stop.sh && ./scripts/dev.sh

# Dependencies missing
./scripts/setup.sh

# Backend not starting
cd backend && source venv/bin/activate
python main.py  # Check error messages

# Frontend build errors
cd frontend && npm install
```

### **Environment Issues**
- **OpenAI API Key** - Must be set in `backend/.env`
- **Python version** - Requires 3.11+
- **Node.js version** - Requires 18+

---

## 🎯 **Architecture Decisions Made**

### **Why This Structure?**
1. **Clean separation** - Frontend/backend clearly divided
2. **Archive approach** - Old implementations preserved but separated
3. **Real integration** - No mock data, actual API calls
4. **Intelligent systems** - AI-powered naming and categorization
5. **Comprehensive features** - Full evaluation and analytics systems

### **Key Implementation Choices**
- **Next.js 14** for modern React development
- **FastAPI** for high-performance Python backend
- **any-agent** for multi-agent orchestration
- **ReactFlow** for visual workflow building
- **Real-time polling** instead of WebSockets (simpler)

---

## 🚀 **Success Indicators**

### **How to Know It's Working**
1. **Frontend loads** at http://localhost:3000
2. **All 6 tabs functional** - No empty states
3. **Backend responds** at http://localhost:8000
4. **Real API calls** - Check backend logs for OpenAI requests
5. **Intelligent naming** - Workflows get AI-generated names
6. **Real analytics** - Data changes based on actual usage

### **Example Working Workflow**
1. Go to "AI Assistant" tab
2. Ask: "Create a workflow to research grizzly bears in Yellowstone"
3. See real AI response with workflow suggestions
4. Switch to "Visual Designer" to see/edit workflow
5. Execute workflow - see real OpenAI API calls in logs
6. Check "Analytics" tab - see real execution data
7. Workflow gets intelligent name like "Grizzly Bear Spotting Guide"

---

## 📚 **Essential Reading Order**

1. **This file** - Overall understanding
2. **`README.md`** - Project overview and setup
3. **`DIRECTORY_STRUCTURE.md`** - Architecture details
4. **`prd-doc.md`** - Complete feature documentation
5. **`frontend/app/page.tsx`** - Main UI implementation
6. **`backend/main.py`** - Backend API implementation

---

## 🎉 **Final Notes for AI Agents**

### **What Makes This Special**
- **Actually works** - Not a demo or prototype
- **Real AI integration** - Uses actual OpenAI API
- **Comprehensive features** - Evaluation, analytics, A/B testing
- **Clean architecture** - Easy to understand and modify
- **Production ready** - Can be deployed and used

### **Your Role as AI Agent**
- **Understand** the existing working system
- **Enhance** features based on user requests
- **Maintain** the clean architecture
- **Preserve** the real data integration
- **Build upon** the solid foundation

**Welcome to a fully functional AI workflow composer! 🚀** 