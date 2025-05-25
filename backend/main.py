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
import time
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
        start_time = time.time()
        
        try:
            # Initialize execution record with timestamp
            self.executions[execution_id] = {
                "status": "running",
                "input": request.input_data,
                "created_at": start_time,
                "workflow": request.workflow,
                "framework": request.framework
            }
            
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
            
            # Store execution details with completion timestamp
            completion_time = time.time()
            trace_dict = self._trace_to_dict(agent_trace)
            
            self.executions[execution_id].update({
                "status": "completed",
                "result": str(agent_trace.final_output) if hasattr(agent_trace, 'final_output') else str(agent_trace),
                "trace": trace_dict,
                "completed_at": completion_time,
                "execution_duration_ms": (completion_time - start_time) * 1000
            })
            
            return ExecutionResponse(
                execution_id=execution_id,
                status="completed",
                result=str(agent_trace.final_output) if hasattr(agent_trace, 'final_output') else str(agent_trace),
                trace=trace_dict
            )
            
        except Exception as e:
            completion_time = time.time()
            self.executions[execution_id].update({
                "status": "failed",
                "error": str(e),
                "completed_at": completion_time,
                "execution_duration_ms": (completion_time - start_time) * 1000
            })
            
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
            # Enhanced trace serialization with detailed span information
            trace_dict = {
                "final_output": str(getattr(trace, 'final_output', trace)),
                "spans": [],
                "metadata": getattr(trace, 'metadata', {}),
                "performance": {}
            }
            
            # Process spans if available
            if hasattr(trace, 'spans') and trace.spans:
                for span in trace.spans:
                    span_dict = {
                        "name": span.name,
                        "span_id": span.context.span_id if hasattr(span, 'context') else None,
                        "trace_id": span.context.trace_id if hasattr(span, 'context') else None,
                        "start_time": span.start_time,
                        "end_time": span.end_time,
                        "duration_ms": (span.end_time - span.start_time) / 1_000_000 if (span.start_time and span.end_time) else None,
                        "status": getattr(span, 'status', None),
                        "attributes": dict(span.attributes) if hasattr(span, 'attributes') else {},
                        "events": getattr(span, 'events', []),
                        "kind": str(getattr(span, 'kind', 'unknown'))
                    }
                    trace_dict["spans"].append(span_dict)
                
                # Calculate performance metrics
                if hasattr(trace, 'get_total_cost'):
                    cost_info = trace.get_total_cost()
                    trace_dict["performance"] = {
                        "total_cost": cost_info.total_cost,
                        "total_tokens": cost_info.total_tokens,
                        "total_token_count_prompt": cost_info.total_token_count_prompt,
                        "total_token_count_completion": cost_info.total_token_count_completion,
                        "total_cost_prompt": cost_info.total_cost_prompt,
                        "total_cost_completion": cost_info.total_cost_completion,
                        "total_duration_ms": sum(s["duration_ms"] for s in trace_dict["spans"] if s["duration_ms"]) if trace_dict["spans"] else 0
                    }
            
            return trace_dict
        except Exception as e:
            print(f"Error serializing trace: {e}")
            return {"raw_trace": str(trace), "error": str(e)}


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


@app.get("/executions/{execution_id}/trace")
async def get_execution_trace(execution_id: str):
    """Get detailed trace information for an execution"""
    if execution_id not in executor.executions:
        raise HTTPException(status_code=404, detail="Execution not found")
    
    execution = executor.executions[execution_id]
    if "trace" not in execution:
        raise HTTPException(status_code=404, detail="Trace not found for this execution")
    
    # Return the full trace data with all spans and performance metrics
    return {
        "execution_id": execution_id,
        "status": execution["status"],
        "trace": execution["trace"],
        "created_at": execution.get("created_at", None)
    }


@app.get("/executions/{execution_id}/performance")
async def get_execution_performance(execution_id: str):
    """Get performance metrics for an execution"""
    if execution_id not in executor.executions:
        raise HTTPException(status_code=404, detail="Execution not found")
    
    execution = executor.executions[execution_id]
    if "trace" not in execution:
        raise HTTPException(status_code=404, detail="Performance data not available")
    
    trace_data = execution["trace"]
    performance = trace_data.get("performance", {})
    spans = trace_data.get("spans", [])
    
    # Enhanced performance analysis
    span_analysis = []
    for span in spans:
        span_perf = {
            "name": span.get("name"),
            "duration_ms": span.get("duration_ms"),
            "token_usage": {
                "prompt": span.get("attributes", {}).get("llm.token_count.prompt", 0),
                "completion": span.get("attributes", {}).get("llm.token_count.completion", 0)
            },
            "cost": {
                "prompt": span.get("attributes", {}).get("cost_prompt", 0),
                "completion": span.get("attributes", {}).get("cost_completion", 0)
            },
            "model": span.get("attributes", {}).get("llm.model_name", "unknown")
        }
        span_analysis.append(span_perf)
    
    return {
        "execution_id": execution_id,
        "overall_performance": performance,
        "span_breakdown": span_analysis,
        "bottlenecks": sorted(span_analysis, key=lambda x: x.get("duration_ms", 0), reverse=True)[:3],
        "cost_breakdown": {
            "most_expensive_spans": sorted(span_analysis, 
                key=lambda x: x.get("cost", {}).get("prompt", 0) + x.get("cost", {}).get("completion", 0), 
                reverse=True)[:3]
        }
    }


@app.get("/analytics/executions")
async def get_execution_analytics():
    """Get aggregated analytics across all executions"""
    if not executor.executions:
        return {"message": "No executions found", "analytics": {}}
    
    executions = list(executor.executions.values())
    completed_executions = [e for e in executions if e.get("status") == "completed" and "trace" in e]
    
    if not completed_executions:
        return {"message": "No completed executions with traces found", "analytics": {}}
    
    # Aggregate performance data
    total_cost = 0
    total_tokens = 0
    total_duration = 0
    model_usage = {}
    
    for execution in completed_executions:
        trace = execution.get("trace", {})
        performance = trace.get("performance", {})
        
        total_cost += performance.get("total_cost", 0)
        total_tokens += performance.get("total_tokens", 0)
        total_duration += performance.get("total_duration_ms", 0)
        
        # Track model usage
        for span in trace.get("spans", []):
            model = span.get("attributes", {}).get("llm.model_name", "unknown")
            if model not in model_usage:
                model_usage[model] = {"count": 0, "total_cost": 0, "total_tokens": 0}
            model_usage[model]["count"] += 1
            model_usage[model]["total_cost"] += span.get("attributes", {}).get("cost_prompt", 0) + span.get("attributes", {}).get("cost_completion", 0)
            model_usage[model]["total_tokens"] += span.get("attributes", {}).get("llm.token_count.prompt", 0) + span.get("attributes", {}).get("llm.token_count.completion", 0)
    
    avg_cost = total_cost / len(completed_executions) if completed_executions else 0
    avg_duration = total_duration / len(completed_executions) if completed_executions else 0
    
    return {
        "summary": {
            "total_executions": len(executor.executions),
            "completed_executions": len(completed_executions),
            "total_cost": round(total_cost, 4),
            "total_tokens": total_tokens,
            "total_duration_ms": total_duration,
            "average_cost_per_execution": round(avg_cost, 4),
            "average_duration_per_execution": round(avg_duration, 2)
        },
        "model_breakdown": model_usage,
        "recent_executions": [
            {
                "execution_id": exec_id,
                "status": execution["status"],
                "cost": execution.get("trace", {}).get("performance", {}).get("total_cost", 0),
                "duration_ms": execution.get("trace", {}).get("performance", {}).get("total_duration_ms", 0)
            }
            for exec_id, execution in list(executor.executions.items())[-10:]  # Last 10 executions
        ]
    }


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