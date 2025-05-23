#!/usr/bin/env python3
"""
Simplified any-agent Workflow Composer Backend

FastAPI server that demonstrates the integration concept with mock execution.
This version works without requiring the full any-agent installation.
"""

import asyncio
import os
import time
from contextlib import asynccontextmanager
from typing import Any, Dict, List, Optional

import uvicorn
from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel


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


class MockWorkflowExecutor:
    """Mock workflow executor that simulates any-agent execution"""
    
    def __init__(self):
        self.executions: Dict[str, Dict[str, Any]] = {}
    
    async def execute_workflow(self, request: ExecutionRequest) -> ExecutionResponse:
        """Mock execute a workflow definition"""
        execution_id = f"exec_{len(self.executions) + 1}"
        
        try:
            # Simulate processing time
            await asyncio.sleep(1)
            
            # Parse workflow into mock agent configuration
            agent_summary = self._workflow_to_summary(request.workflow)
            
            # Mock execution result
            mock_result = f"""🤖 Mock Agent Execution Complete!

**Workflow Summary:**
{agent_summary}

**Input Processing:**
"{request.input_data}"

**Agent Response:**
Based on your workflow configuration, I would process this input using {request.framework} framework. The workflow contains {len(request.workflow.nodes)} nodes and {len(request.workflow.edges)} connections.

**Mock Analysis:**
This is a demonstration of the any-agent integration. In a full deployment, this would execute real agents using the any-agent framework with your specified configuration.

**Next Steps:**
1. Install any-agent framework: `pip install any-agent[{request.framework}]`
2. Set API keys (e.g., OPENAI_API_KEY)
3. Replace this mock executor with the real implementation

*Execution completed in mock mode.*"""
            
            # Store execution details
            self.executions[execution_id] = {
                "status": "completed",
                "workflow": request.workflow,
                "result": mock_result,
                "mock_execution": True
            }
            
            return ExecutionResponse(
                execution_id=execution_id,
                status="completed",
                result=mock_result,
                trace={
                    "final_output": mock_result,
                    "steps": ["Workflow parsed", "Mock agent created", "Input processed", "Response generated"],
                    "metadata": {"mock": True, "framework": request.framework}
                }
            )
            
        except Exception as e:
            self.executions[execution_id] = {
                "status": "failed",
                "error": str(e),
                "workflow": request.workflow,
                "mock_execution": True
            }
            
            return ExecutionResponse(
                execution_id=execution_id,
                status="failed",
                error=str(e)
            )
    
    def _workflow_to_summary(self, workflow: WorkflowDefinition) -> str:
        """Convert visual workflow to summary"""
        
        # Find agent nodes
        agent_nodes = [node for node in workflow.nodes if node.type == "agent"]
        tool_nodes = [node for node in workflow.nodes if node.type == "tool"]
        input_nodes = [node for node in workflow.nodes if node.type == "input"]
        output_nodes = [node for node in workflow.nodes if node.type == "output"]
        
        summary = f"""
- **Agents**: {len(agent_nodes)} agent(s)
- **Tools**: {len(tool_nodes)} tool(s)  
- **Inputs**: {len(input_nodes)} input(s)
- **Outputs**: {len(output_nodes)} output(s)
- **Connections**: {len(workflow.edges)} edge(s)
"""
        
        if agent_nodes:
            main_agent = agent_nodes[0]
            summary += f"\n**Primary Agent Config:**\n"
            summary += f"- Model: {main_agent.data.get('model_id', 'gpt-3.5-turbo')}\n"
            summary += f"- Name: {main_agent.data.get('name', 'Agent')}\n"
            summary += f"- Instructions: {main_agent.data.get('instructions', 'Default instructions')[:100]}...\n"
        
        return summary


# Global executor instance
executor = MockWorkflowExecutor()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan management"""
    print("🚀 any-agent Workflow Composer Backend (Mock Mode) starting...")
    yield
    print("🛑 any-agent Workflow Composer Backend shutting down...")


# Create FastAPI app
app = FastAPI(
    title="any-agent Workflow Composer Backend (Mock)",
    description="Mock implementation demonstrating integration with any-agent framework",
    version="1.0.0-mock",
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
    return {
        "message": "any-agent Workflow Composer Backend (Mock Mode)", 
        "status": "running",
        "mode": "mock",
        "note": "This is a demonstration version. Install any-agent for full functionality."
    }


@app.get("/frameworks")
async def list_frameworks():
    """List available agent frameworks (mock)"""
    return {
        "frameworks": ["OPENAI", "LANGCHAIN", "LLAMA_INDEX", "GOOGLE", "SMOLAGENTS", "AGNO"],
        "default": "OPENAI",
        "note": "Mock frameworks list. Install any-agent for actual framework support."
    }


@app.post("/execute", response_model=ExecutionResponse)
async def execute_workflow(request: ExecutionRequest):
    """Execute a workflow using mock any-agent simulation"""
    return await executor.execute_workflow(request)


@app.get("/executions/{execution_id}")
async def get_execution(execution_id: str):
    """Get execution details by ID"""
    if execution_id not in executor.executions:
        raise HTTPException(status_code=404, detail="Execution not found")
    
    return executor.executions[execution_id]


@app.websocket("/ws/execution/{execution_id}")
async def websocket_execution_status(websocket: WebSocket, execution_id: str):
    """WebSocket endpoint for real-time execution updates (mock)"""
    await websocket.accept()
    
    try:
        # Send initial status
        await websocket.send_json({"status": "connecting", "mock": True})
        await asyncio.sleep(1)
        
        # Simulate processing updates
        for i, status in enumerate(["parsing", "initializing", "executing", "completed"]):
            await websocket.send_json({
                "status": status,
                "progress": (i + 1) * 25,
                "mock": True,
                "timestamp": time.time()
            })
            await asyncio.sleep(0.5)
            
        await websocket.close()
            
    except WebSocketDisconnect:
        print(f"WebSocket disconnected for execution {execution_id}")


if __name__ == "__main__":
    # Environment check
    if not os.getenv("OPENAI_API_KEY"):
        print("⚠️  Note: OPENAI_API_KEY not set. This mock version doesn't require it.")
    
    print("🔥 Starting any-agent Workflow Composer Backend (Mock Mode)...")
    print("📡 Backend will be available at: http://localhost:8000")
    print("📖 API docs will be available at: http://localhost:8000/docs")
    print("🎭 Running in MOCK MODE - install any-agent for full functionality")
    
    uvicorn.run(
        "main_simple:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    ) 