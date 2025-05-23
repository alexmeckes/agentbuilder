#!/usr/bin/env python3
"""
any-agent Workflow Composer Backend

FastAPI server that bridges the Next.js frontend with the any-agent Python framework.
Provides endpoints for:
- Creating and managing agents
- Executing workflows
- Real-time execution status
- Agent trace retrieval
"""

import asyncio
import concurrent.futures
import os
import sys
from contextlib import asynccontextmanager
from typing import Any, Dict, List, Optional

import uvicorn
from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# Load environment variables from .env file
try:
    from dotenv import load_dotenv
    load_dotenv()
    print("📄 Loaded environment variables from .env file")
except ImportError:
    print("💡 Install python-dotenv to load .env files: pip install python-dotenv")

# Import any-agent framework
from any_agent import AgentConfig, AgentFramework, AnyAgent
from any_agent.tools import search_web


class WorkflowNode(BaseModel):
    """Represents a node in the visual workflow"""
    id: str
    type: str  # 'agent', 'tool', 'input', 'output'
    data: Dict[str, Any]
    position: Dict[str, float]


class WorkflowEdge(BaseModel):
    """Represents an edge (connection) between nodes"""
    id: str
    source: str
    target: str


class WorkflowDefinition(BaseModel):
    """Complete workflow definition from the frontend"""
    nodes: List[WorkflowNode]
    edges: List[WorkflowEdge]


class ExecutionRequest(BaseModel):
    """Request to execute a workflow"""
    workflow: WorkflowDefinition
    input_data: str
    framework: str = "openai"  # Default to OpenAI


class ExecutionResponse(BaseModel):
    """Response from workflow execution"""
    execution_id: str
    status: str
    result: Optional[str] = None
    trace: Optional[Dict[str, Any]] = None
    error: Optional[str] = None


class WorkflowExecutor:
    """Handles workflow execution using any-agent"""
    
    def __init__(self):
        self.executions: Dict[str, Dict[str, Any]] = {}
    
    async def execute_workflow(self, request: ExecutionRequest) -> ExecutionResponse:
        """Execute a workflow definition using any-agent"""
        execution_id = f"exec_{len(self.executions) + 1}"
        
        try:
            # Parse workflow into any-agent configuration
            agent_config = self._workflow_to_agent_config(request.workflow)
            
            # Run agent execution in thread pool to avoid event loop conflict
            def run_agent():
                # Create new event loop for this thread
                loop = asyncio.new_event_loop()
                asyncio.set_event_loop(loop)
                
                try:
                    # Create agent using any-agent
                    framework = AgentFramework.from_string(request.framework.upper())
                    agent = AnyAgent.create(
                        agent_framework=framework,
                        agent_config=agent_config
                    )
                    
                    # Execute the agent
                    agent_trace = agent.run(prompt=request.input_data)
                    
                    # Clean up agent resources
                    agent.exit()
                    
                    return agent_trace
                finally:
                    loop.close()
            
            # Execute in thread pool
            with concurrent.futures.ThreadPoolExecutor() as executor:
                future = executor.submit(run_agent)
                agent_trace = future.result(timeout=30)  # 30 second timeout
            
            # Store execution details
            self.executions[execution_id] = {
                "status": "completed",
                "trace": agent_trace,
                "workflow": request.workflow
            }
            
            return ExecutionResponse(
                execution_id=execution_id,
                status="completed",
                result=str(agent_trace.final_output) if hasattr(agent_trace, 'final_output') else str(agent_trace),
                trace=self._trace_to_dict(agent_trace)
            )
            
        except Exception as e:
            self.executions[execution_id] = {
                "status": "failed",
                "error": str(e),
                "workflow": request.workflow
            }
            
            return ExecutionResponse(
                execution_id=execution_id,
                status="failed",
                error=str(e)
            )
    
    def _workflow_to_agent_config(self, workflow: WorkflowDefinition) -> AgentConfig:
        """Convert visual workflow to any-agent AgentConfig"""
        
        # Find the main agent node
        agent_nodes = [node for node in workflow.nodes if node.type == "agent"]
        if not agent_nodes:
            raise ValueError("Workflow must contain at least one agent node")
        
        main_agent = agent_nodes[0]  # Use first agent as main
        
        # Collect tools from tool nodes
        tools = []
        tool_nodes = [node for node in workflow.nodes if node.type == "tool"]
        for tool_node in tool_nodes:
            tool_name = tool_node.data.get("label", "").lower()
            if "search" in tool_name or "web" in tool_name:
                tools.append(search_web)
        
        # Create agent configuration
        return AgentConfig(
            model_id=main_agent.data.get("model_id", "gpt-3.5-turbo"),
            instructions=main_agent.data.get("instructions", "You are a helpful assistant."),
            name=main_agent.data.get("name", "WorkflowAgent"),
            tools=tools
        )
    
    def _trace_to_dict(self, trace) -> Dict[str, Any]:
        """Convert agent trace to dictionary for JSON serialization"""
        try:
            return {
                "final_output": str(getattr(trace, 'final_output', trace)),
                "steps": getattr(trace, 'steps', []),
                "metadata": getattr(trace, 'metadata', {})
            }
        except:
            return {"raw_trace": str(trace)}


# Global executor instance
executor = WorkflowExecutor()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan management"""
    print("🚀 any-agent Workflow Composer Backend starting...")
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
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"],  # Next.js dev servers
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
async def root():
    """Health check endpoint"""
    return {"message": "any-agent Workflow Composer Backend", "status": "running"}


@app.get("/frameworks")
async def list_frameworks():
    """List available agent frameworks"""
    return {
        "frameworks": [framework.name for framework in AgentFramework],
        "default": AgentFramework.OPENAI.name
    }


@app.post("/execute", response_model=ExecutionResponse)
async def execute_workflow(request: ExecutionRequest):
    """Execute a workflow using any-agent"""
    return await executor.execute_workflow(request)


@app.get("/executions/{execution_id}")
async def get_execution(execution_id: str):
    """Get execution details by ID"""
    if execution_id not in executor.executions:
        raise HTTPException(status_code=404, detail="Execution not found")
    
    return executor.executions[execution_id]


@app.websocket("/ws/execution/{execution_id}")
async def websocket_execution_status(websocket: WebSocket, execution_id: str):
    """WebSocket endpoint for real-time execution updates"""
    await websocket.accept()
    
    try:
        while True:
            if execution_id in executor.executions:
                execution = executor.executions[execution_id]
                await websocket.send_json(execution)
                
                if execution.get("status") in ["completed", "failed"]:
                    break
            
            await asyncio.sleep(1)  # Poll every second
            
    except WebSocketDisconnect:
        print(f"WebSocket disconnected for execution {execution_id}")


if __name__ == "__main__":
    # Check for required environment variables
    if not os.getenv("OPENAI_API_KEY"):
        print("⚠️  Warning: OPENAI_API_KEY not set. OpenAI agents will not work.")
        print("🔧 Please set your OpenAI API key: export OPENAI_API_KEY='your_key_here'")
    
    print("🔥 Starting any-agent Workflow Composer Backend...")
    print("📡 Backend will be available at: http://localhost:8000")
    print("📖 API docs will be available at: http://localhost:8000/docs")
    print("🤖 Using REAL any-agent framework integration!")
    
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    ) 