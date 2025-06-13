#!/usr/bin/env python3
"""
any-agent Workflow Composer Backend

FastAPI server that bridges the Next.js frontend with the any-agent Python framework.
Provides endpoints for:
- Creating and managing agents
- Executing workflows
- Real-time execution status
- Agent trace retrieval
- User input handling for interactive workflows
"""

import asyncio
import concurrent.futures
import logging
import os
import sys
import time
from contextlib import asynccontextmanager
from typing import Any, Dict, List, Optional

import uvicorn
from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

# Import model definitions
from models import (
    WorkflowNode, WorkflowEdge, WorkflowDefinition,
    ExecutionRequest, ExecutionResponse, UserInputRequest,
    CheckpointCriteria, GroundTruthAnswer, NodeCriteria, EvaluationCaseRequest
)

# Load environment variables from .env file
from setup_env import setup_environment

# Setup environment and get configuration
config = setup_environment()

# Import lightweight evaluation instead of heavy any-agent evaluation
from lightweight_evaluation import evaluate_workflow_output
from enhanced_workflow_evaluation import evaluate_end_to_end_workflow, WorkflowEvaluationResult

# Import the REAL any-agent framework (but not evaluation components)
from any_agent import AgentFramework

# Import our NEW visual-to-anyagent translator (replacing custom workflow engine)
from visual_to_anyagent_translator import execute_visual_workflow_with_anyagent, MCP_INTEGRATION_AVAILABLE

# Import Composio availability flag
try:
    from composio_http_manager import COMPOSIO_AVAILABLE
except ImportError:
    COMPOSIO_AVAILABLE = False

# Import MCP manager (with fallback for backwards compatibility)
try:
    from mcp_manager import get_mcp_manager, is_mcp_enabled, MCPServerConfig
    MCP_AVAILABLE = True
except ImportError:
    logging.warning("MCP integration not available")
    MCP_AVAILABLE = False

# Import AI workflow refiner
from ai_workflow_refiner import generate_workflow_actions, apply_actions
import ai_workflow_refiner

# Import services
from services import WorkflowExecutor, WorkflowStore


# Initialize services
workflow_store = WorkflowStore()
executor = WorkflowExecutor(workflow_store)

# Global dictionaries to store state
stored_experiments = {}
running_experiments = {}
experiment_results = {}
stored_evaluation_cases = {}  # Add storage for evaluation cases
stored_evaluation_runs = {}  # Add storage for evaluation runs


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan management"""
    print("🚀 any-agent Workflow Composer Backend starting...")
    
    # Setup MCP servers for production if enabled
    if os.getenv('ENABLE_MCP_SERVERS', '').lower() == 'true':
        try:
            from setup_production_mcp import setup_production_mcp
            print("🔧 Setting up MCP servers...")
            setup_success = setup_production_mcp()
            if setup_success:
                print("✅ MCP setup completed successfully")
            else:
                print("⚠️  MCP setup completed with warnings")
        except Exception as e:
            print(f"❌ MCP setup failed: {e}")
    
    yield
    print("🛑 any-agent Workflow Composer Backend shutting down...")


# Create FastAPI app
app = FastAPI(
    title="any-agent Workflow Composer Backend",
    description="Bridge between Next.js frontend and any-agent framework",
    version="1.0.0",
    lifespan=lifespan
)

# Add CORS middleware
import os

# Configure CORS origins based on environment
vercel_frontend_url_1 = "https://agentfactory-frontend-ntg6woqjj-alexmeckes-gmailcoms-projects.vercel.app"
vercel_frontend_url_2 = "https://agentfactory-frontend.vercel.app"

if os.getenv("ENVIRONMENT") == "production" or os.getenv("RENDER"):
    # In production (Render), allow both Vercel frontend URLs and all origins
    cors_origins = [vercel_frontend_url_1, vercel_frontend_url_2, "*"]
else:
    # In development, allow only local development servers and both Vercel URLs
    cors_origins = [
        "http://localhost:3000", 
        "http://localhost:3001",  # Next.js dev servers
        vercel_frontend_url_1,  # Always allow the first Vercel frontend
        vercel_frontend_url_2   # Always allow the second Vercel frontend
    ]

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Import and configure route modules
from api.routes import general, workflow, evaluation, analytics, experiment, mcp, webhook, debug, composio, ai

# Configure route dependencies
workflow.set_executor(executor)
workflow.set_workflow_store(workflow_store)

evaluation.set_executor(executor)

analytics.set_dependencies(executor, workflow_store)

experiment.set_executor(executor)

mcp.set_mcp_dependencies(
    MCP_AVAILABLE,
    get_mcp_manager if 'get_mcp_manager' in globals() else None,
    is_mcp_enabled if 'is_mcp_enabled' in globals() else None,
    MCPServerConfig if 'MCPServerConfig' in globals() else None
)

webhook.set_executor(executor)

debug.set_executor(executor)
debug.set_workflow_store(workflow_store)

composio.set_composio_dependencies(
    COMPOSIO_AVAILABLE,
    composio_http_manager if 'composio_http_manager' in globals() else None
)

ai.set_ai_dependencies(
    ai_workflow_refiner if 'ai_workflow_refiner' in globals() else None,
    MCP_AVAILABLE,
    get_mcp_manager if 'get_mcp_manager' in globals() else None,
    COMPOSIO_AVAILABLE
)

# Include routers
app.include_router(general.router)
app.include_router(workflow.router)
app.include_router(evaluation.router)
app.include_router(analytics.router)
app.include_router(experiment.router)
app.include_router(mcp.router)
app.include_router(webhook.router)
app.include_router(debug.router)
app.include_router(composio.router)
app.include_router(ai.router)


if __name__ == "__main__":
    # Production MCP setup
    try:
        # Run production setup if we have the setup script
        import subprocess
        result = subprocess.run([sys.executable, "setup_production_mcp.py"], 
                              capture_output=True, text=True, cwd=os.getcwd())
        if result.returncode == 0:
            print("✅ Production MCP setup completed")
        else:
            print(f"⚠️  MCP setup warnings: {result.stdout}")
    except Exception as e:
        print(f"ℹ️  MCP setup skipped: {e}")
    
    # Check for required environment variables
    if not os.getenv("OPENAI_API_KEY"):
        print("⚠️  Warning: OPENAI_API_KEY not set. OpenAI agents will not work.")
        print("🔧 Please set your OpenAI API key: export OPENAI_API_KEY='your_key_here'")
    
    # Determine deployment environment
    is_production = os.getenv("RENDER", "").lower() == "true"
    port = int(os.getenv("PORT", "8000"))
    
    print("🔥 Starting any-agent Workflow Composer Backend...")
    if is_production:
        print(f"📡 Production backend starting on port {port}")
        print("🌐 Frontend should set BACKEND_URL to this service URL")
    else:
        print("📡 Backend will be available at: http://localhost:8000")
        print("📖 API docs will be available at: http://localhost:8000/docs")
    
    # Print MCP status
    if MCP_AVAILABLE:
        mcp_enabled = is_mcp_enabled()
        print(f"🔌 MCP Integration: {'Enabled' if mcp_enabled else 'Available (set ENABLE_MCP_SERVERS=true to enable)'}")
        if mcp_enabled:
            try:
                mcp_manager = get_mcp_manager()
                server_count = len(mcp_manager.get_server_status())
                print(f"   - {server_count} MCP servers configured")
            except:
                print("   - MCP manager initialization pending")
    else:
        print(f"🔌 MCP Integration: Not available (install with: pip install mcp)")
    
    execution_mode = os.getenv("USE_MOCK_EXECUTION", "false").lower()
    if execution_mode == "true":
        print("📝 Running in WORKFLOW SUGGESTION MODE")
        print("   - Provides intelligent workflow building guidance") 
        print("   - No asyncio conflicts")
    else:
        print("🤖 Running in REAL EXECUTION MODE with AsyncIO Conflict Resolution")
        print("   - Process isolation: ✅ any-agent runs in separate processes")
        print("   - Thread fallback: ✅ isolated event loops as backup")
        print("   - Suggestion fallback: ✅ graceful degradation if needed")
    
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=port,
        reload=not is_production,  # Disable reload in production
        log_level="info"
    ) 