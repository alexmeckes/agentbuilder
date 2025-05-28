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
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

# Load environment variables from .env file
from setup_env import setup_environment

# Setup environment and get configuration
config = setup_environment()

# Import the REAL any-agent framework
from any_agent import AgentConfig, AgentFramework, AnyAgent

# Mock search_web function
def search_web(query: str):
    return f"Mock search results for: {query}"

# Import our NEW visual-to-anyagent translator (replacing custom workflow engine)
from visual_to_anyagent_translator import execute_visual_workflow_with_anyagent


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
    """Execute workflows using any-agent's native multi-agent orchestration"""
    
    def __init__(self):
        self.executions: Dict[str, Dict[str, Any]] = {}

    async def execute_workflow(self, request: ExecutionRequest) -> ExecutionResponse:
        """Execute a workflow definition using any-agent's native multi-agent capabilities"""
        execution_id = f"exec_{len(self.executions) + 1}"
        start_time = time.time()
        
        try:
            # Convert workflow to format expected by translator
            nodes = [
                {
                    "id": node.id,
                    "type": node.type,
                    "data": node.data,
                    "position": node.position
                }
                for node in request.workflow.nodes
            ]
            
            edges = [
                {
                    "id": edge.id,
                    "source": edge.source,
                    "target": edge.target
                }
                for edge in request.workflow.edges
            ]

            # Generate intelligent workflow identity
            print(f"🏷️  Generating intelligent workflow name for {execution_id}...")
            workflow_identity = await self._generate_workflow_identity(nodes, edges, request.input_data)
            print(f"✨ Generated workflow: {workflow_identity['name']} ({workflow_identity['category']})")
            
            # Initialize execution record with timestamp and workflow identity
            self.executions[execution_id] = {
                "status": "running",
                "input": request.input_data,
                "created_at": start_time,
                "workflow": request.workflow,
                "framework": request.framework,
                "workflow_identity": workflow_identity,
                "workflow_name": workflow_identity["name"],
                "workflow_category": workflow_identity["category"],
                "workflow_description": workflow_identity["description"]
            }
            
            # Execute using any-agent's native multi-agent orchestration
            workflow_result = await execute_visual_workflow_with_anyagent(
                nodes=nodes,
                edges=edges,
                input_data=request.input_data,
                framework=request.framework
            )
            
            # Store execution details with completion timestamp
            completion_time = time.time()
            
            # Check if there was an error
            if "error" in workflow_result:
                self.executions[execution_id].update({
                    "status": "failed",
                    "result": workflow_result["final_output"],
                    "error": workflow_result["error"],
                    "completed_at": completion_time,
                    "execution_time": completion_time - start_time,
                    "trace": {
                        "error": workflow_result["error"],
                        "framework_used": request.framework,
                        "workflow_identity": workflow_identity
                    }
                })
                
                return ExecutionResponse(
                    execution_id=execution_id,
                    status="failed",
                    error=workflow_result["error"],
                    trace=self.executions[execution_id]["trace"]
                )
            
            # Success case
            self.executions[execution_id].update({
                "status": "completed",
                "result": workflow_result["final_output"],
                "completed_at": completion_time,
                "execution_time": completion_time - start_time,
                "trace": {
                    "final_output": workflow_result["final_output"],
                    "execution_pattern": workflow_result["execution_pattern"],
                    "main_agent": workflow_result["main_agent"],
                    "managed_agents": workflow_result["managed_agents"],
                    "framework_used": workflow_result["framework_used"],
                    "agent_trace": self._serialize_agent_trace(workflow_result.get("agent_trace")),
                    "execution_time": completion_time - start_time,
                    "cost_info": self._extract_cost_info_from_trace(workflow_result.get("agent_trace")),
                    "performance": self._extract_performance_metrics(workflow_result.get("agent_trace"), completion_time - start_time),
                    "spans": self._extract_spans_from_trace(workflow_result.get("agent_trace")),
                    "workflow_identity": workflow_identity
                }
            })
            
            return ExecutionResponse(
                execution_id=execution_id,
                status="completed",
                result=workflow_result["final_output"],
                trace=self.executions[execution_id]["trace"]
            )
            
        except Exception as e:
            completion_time = time.time()
            self.executions[execution_id].update({
                "status": "failed",
                "error": str(e),
                "completed_at": completion_time,
                "execution_time": completion_time - start_time
            })
            
            return ExecutionResponse(
                execution_id=execution_id,
                status="failed",
                error=str(e)
            )
    
    def _serialize_agent_trace(self, agent_trace) -> Dict[str, Any]:
        """Serialize any-agent's AgentTrace object for storage/transmission"""
        if not agent_trace:
            return {}
        
        try:
            # If agent_trace is already a dictionary (from our new extraction), use it directly
            if isinstance(agent_trace, dict):
                return agent_trace
            
            # Legacy handling for raw agent trace objects
            return {
                "final_output": getattr(agent_trace, 'final_output', ''),
                "spans": [self._serialize_span(span) for span in getattr(agent_trace, 'spans', [])],
                "cost_info": self._extract_cost_info(agent_trace),
                "metadata": {
                    "total_spans": len(getattr(agent_trace, 'spans', [])),
                    "has_cost_info": hasattr(agent_trace, 'get_total_cost')
                }
            }
        except Exception as e:
            return {"serialization_error": str(e)}
    
    def _serialize_span(self, span) -> Dict[str, Any]:
        """Serialize individual span from any-agent trace"""
        try:
            return {
                "name": getattr(span, 'name', ''),
                "kind": str(getattr(span, 'kind', '')),
                "start_time": getattr(span, 'start_time', 0),
                "end_time": getattr(span, 'end_time', 0),
                "attributes": dict(getattr(span, 'attributes', {})),
                "status": str(getattr(span, 'status', '')),
                "events": [str(event) for event in getattr(span, 'events', [])]
            }
        except Exception as e:
            return {"span_error": str(e)}
    
    def _extract_cost_info(self, agent_trace) -> Dict[str, Any]:
        """Extract cost information from any-agent trace"""
        if not agent_trace or not hasattr(agent_trace, 'get_total_cost'):
            return {}
        
        try:
            cost_info = agent_trace.get_total_cost()
            return {
                "total_cost": getattr(cost_info, 'total_cost', 0),
                "total_tokens": getattr(cost_info, 'total_tokens', 0),
                "input_tokens": getattr(cost_info, 'input_tokens', 0),
                "output_tokens": getattr(cost_info, 'output_tokens', 0)
            }
        except Exception as e:
            return {"cost_extraction_error": str(e)}
    
    def _extract_cost_info_from_trace(self, agent_trace) -> Dict[str, Any]:
        """Extract cost information from the new trace data structure"""
        if not agent_trace:
            return {}
        
        try:
            # If it's our new dictionary structure
            if isinstance(agent_trace, dict):
                return agent_trace.get("cost_info", {})
            
            # Fallback to legacy method
            return self._extract_cost_info(agent_trace)
        except Exception as e:
            return {"cost_extraction_error": str(e)}
    
    def _extract_performance_metrics(self, agent_trace, execution_time: float) -> Dict[str, Any]:
        """Extract performance metrics from trace data"""
        if not agent_trace:
            return {"total_duration_ms": execution_time * 1000}
        
        try:
            # If it's our new dictionary structure
            if isinstance(agent_trace, dict):
                performance = agent_trace.get("performance", {})
                # Ensure we have execution time
                performance["total_duration_ms"] = performance.get("total_duration_ms", execution_time * 1000)
                return performance
            
            # Legacy fallback
            return {"total_duration_ms": execution_time * 1000}
        except Exception as e:
            return {"performance_extraction_error": str(e), "total_duration_ms": execution_time * 1000}
    
    def _extract_spans_from_trace(self, agent_trace) -> List[Dict[str, Any]]:
        """Extract spans from trace data"""
        if not agent_trace:
            return []
        
        try:
            # If it's our new dictionary structure
            if isinstance(agent_trace, dict):
                return agent_trace.get("spans", [])
            
            # Legacy fallback
            if hasattr(agent_trace, 'spans'):
                return [self._serialize_span(span) for span in getattr(agent_trace, 'spans', [])]
            
            return []
        except Exception as e:
            return []

    async def _generate_workflow_identity(self, nodes: List[Dict], edges: List[Dict], input_data: str) -> Dict[str, Any]:
        """Generate intelligent workflow name and identity using the workflow naming service"""
        try:
            # Build a descriptive prompt for the workflow naming service
            node_descriptions = []
            for node in nodes:
                node_type = node.get("type", "unknown")
                node_data = node.get("data", {})
                node_label = node_data.get("label", node_data.get("name", f"{node_type} node"))
                
                if node_type == "agent":
                    instructions = node_data.get("instructions", "")
                    if instructions:
                        node_descriptions.append(f"- {node_label}: {instructions[:100]}...")
                    else:
                        node_descriptions.append(f"- {node_label} (AI agent)")
                elif node_type == "tool":
                    tool_type = node_data.get("tool_type", "unknown tool")
                    node_descriptions.append(f"- {node_label} ({tool_type})")
                else:
                    node_descriptions.append(f"- {node_label} ({node_type})")
            
            # Create a comprehensive prompt for workflow analysis
            prompt = f"""Analyze this AI workflow and generate a smart name, description, and category.

WORKFLOW STRUCTURE:
- Total nodes: {len(nodes)}
- Total connections: {len(edges)}
- Input: "{input_data[:200]}..."

NODES:
{chr(10).join(node_descriptions)}

Generate a response in this exact JSON format:
{{
  "name": "Concise, descriptive workflow name (2-6 words)",
  "description": "Clear description of what this workflow does (1-2 sentences)",
  "category": "One of: research, analysis, content, automation, support, data-processing, general",
  "confidence": 0.85,
  "alternatives": ["Alternative name 1", "Alternative name 2", "Alternative name 3"]
}}

Guidelines:
- Name should be professional and descriptive
- Avoid generic terms like "Workflow" or "Process" 
- Focus on the main business value or outcome
- Category should reflect the primary use case
- Confidence should be 0.6-0.95 based on how clear the purpose is"""

            # Create a specialized workflow naming agent
            naming_workflow = {
                "nodes": [
                    {
                        "id": "workflow-namer",
                        "type": "agent",
                        "data": {
                            "name": "WorkflowNamer",
                            "instructions": "You are an expert at analyzing AI workflows and generating concise, descriptive names. You must respond ONLY with valid JSON in the exact format requested. Do not include any explanatory text, markdown formatting, or additional content - just the raw JSON object.",
                            "model_id": "gpt-4o-mini"
                        },
                        "position": {"x": 0, "y": 0}
                    }
                ],
                "edges": []
            }

            # Execute the naming workflow
            from visual_to_anyagent_translator import execute_visual_workflow_with_anyagent
            
            naming_result = await execute_visual_workflow_with_anyagent(
                nodes=naming_workflow["nodes"],
                edges=naming_workflow["edges"],
                input_data=prompt,
                framework="openai"
            )

            if "error" not in naming_result and naming_result.get("final_output"):
                try:
                    # Parse the AI response
                    import json
                    ai_response = naming_result["final_output"].strip()
                    
                    # Try to extract JSON from the response
                    if ai_response.startswith("```json"):
                        ai_response = ai_response.split("```json")[1].split("```")[0].strip()
                    elif ai_response.startswith("```"):
                        ai_response = ai_response.split("```")[1].split("```")[0].strip()
                    
                    parsed_response = json.loads(ai_response)
                    
                    return {
                        "name": parsed_response.get("name", self._generate_fallback_name(nodes, edges)),
                        "description": parsed_response.get("description", f"A workflow with {len(nodes)} nodes"),
                        "category": parsed_response.get("category", self._infer_category_from_nodes(nodes)),
                        "confidence": parsed_response.get("confidence", 0.7),
                        "alternatives": parsed_response.get("alternatives", []),
                        "auto_generated": True,
                        "structure_hash": self._generate_structure_hash(nodes, edges)
                    }
                except (json.JSONDecodeError, KeyError) as e:
                    print(f"Failed to parse AI naming response: {e}")
                    # Fall back to intelligent naming
                    return self._generate_intelligent_fallback(nodes, edges, input_data)
            else:
                print(f"Workflow naming service failed: {naming_result.get('error', 'Unknown error')}")
                return self._generate_intelligent_fallback(nodes, edges, input_data)
                
        except Exception as e:
            print(f"Error in workflow naming: {e}")
            return self._generate_intelligent_fallback(nodes, edges, input_data)

    def _generate_intelligent_fallback(self, nodes: List[Dict], edges: List[Dict], input_data: str) -> Dict[str, Any]:
        """Generate intelligent fallback names based on workflow structure"""
        agent_nodes = [n for n in nodes if n.get("type") == "agent"]
        tool_nodes = [n for n in nodes if n.get("type") == "tool"]
        
        # Analyze the workflow purpose from input and nodes
        input_lower = input_data.lower()
        
        if len(agent_nodes) == 1 and len(tool_nodes) == 0:
            # Single agent workflow
            agent_data = agent_nodes[0].get("data", {})
            agent_name = agent_data.get("name", agent_data.get("label", "Agent"))
            instructions = agent_data.get("instructions", "").lower()
            
            # Infer purpose from instructions and input
            if any(word in instructions or word in input_lower for word in ["research", "search", "find", "investigate"]):
                name = f"{agent_name} Research Assistant"
                category = "research"
            elif any(word in instructions or word in input_lower for word in ["analy", "data", "examine", "evaluate"]):
                name = f"{agent_name} Data Analyzer"
                category = "analysis"
            elif any(word in instructions or word in input_lower for word in ["content", "writ", "generat", "creat"]):
                name = f"{agent_name} Content Generator"
                category = "content"
            elif any(word in instructions or word in input_lower for word in ["support", "help", "assist", "customer"]):
                name = f"{agent_name} Support Assistant"
                category = "support"
            else:
                name = f"{agent_name} Workflow"
                category = "general"
                
            description = f"Single-agent workflow using {agent_name} for specialized tasks"
        else:
            # Multi-node workflow
            if len(tool_nodes) > 0:
                name = f"Multi-Agent Automation ({len(nodes)} nodes)"
                category = "automation"
                description = f"Complex workflow with {len(agent_nodes)} agents and {len(tool_nodes)} tools"
            else:
                name = f"Multi-Agent Pipeline ({len(agent_nodes)} agents)"
                category = "automation"
                description = f"Multi-agent workflow with {len(agent_nodes)} specialized agents"
        
        return {
            "name": name,
            "description": description,
            "category": category,
            "confidence": 0.6,
            "alternatives": [self._generate_fallback_name(nodes, edges)],
            "auto_generated": True,
            "structure_hash": self._generate_structure_hash(nodes, edges)
        }

    def _generate_fallback_name(self, nodes: List[Dict], edges: List[Dict]) -> str:
        """Generate a simple fallback name"""
        agent_count = len([n for n in nodes if n.get("type") == "agent"])
        tool_count = len([n for n in nodes if n.get("type") == "tool"])
        
        if agent_count == 1 and tool_count == 0:
            return "Single Agent Workflow"
        elif agent_count > 1:
            return f"Multi-Agent Workflow ({agent_count} agents)"
        else:
            return f"Custom Workflow ({len(nodes)} nodes)"

    def _infer_category_from_nodes(self, nodes: List[Dict]) -> str:
        """Infer workflow category from node types and data"""
        agent_nodes = [n for n in nodes if n.get("type") == "agent"]
        tool_nodes = [n for n in nodes if n.get("type") == "tool"]
        
        # Look for patterns in instructions
        all_instructions = " ".join([
            node.get("data", {}).get("instructions", "").lower()
            for node in agent_nodes
        ])
        
        if "research" in all_instructions or "search" in all_instructions:
            return "research"
        elif "analy" in all_instructions or "data" in all_instructions:
            return "analysis"
        elif "content" in all_instructions or "writ" in all_instructions:
            return "content"
        elif "support" in all_instructions or "customer" in all_instructions:
            return "support"
        elif len(tool_nodes) > 0:
            return "automation"
        else:
            return "general"

    def _generate_structure_hash(self, nodes: List[Dict], edges: List[Dict]) -> str:
        """Generate a hash representing the workflow structure for grouping"""
        import hashlib
        import json
        
        # Create a simplified representation for hashing
        structure = {
            "nodes": [{"type": node.get("type"), "data_keys": list(node.get("data", {}).keys())} for node in nodes],
            "edges": [{"source": edge.get("source"), "target": edge.get("target")} for edge in edges]
        }
        
        structure_str = json.dumps(structure, sort_keys=True)
        return hashlib.md5(structure_str.encode()).hexdigest()[:16]


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


@app.get("/evaluations/cases")
async def get_evaluation_cases():
    """Get all evaluation cases"""
    return {
        "cases": [
            {
                "id": "case-1",
                "name": "Research Workflow Evaluation",
                "llm_judge": "openai/gpt-4o",
                "checkpoints": [
                    {"points": 2, "criteria": "Agent used web search to find information"},
                    {"points": 1, "criteria": "Agent provided accurate information"}
                ],
                "ground_truth": [
                    {"name": "accuracy", "value": "high", "points": 3}
                ],
                "final_output_criteria": [],
                "created_at": "2024-01-15T10:00:00Z"
            }
        ]
    }

@app.get("/evaluations/runs")
async def get_evaluation_runs():
    """Get all evaluation runs"""
    return {
        "runs": [
            {
                "id": "run-1",
                "name": "Research Workflow Test",
                "trace_id": "trace-123",
                "status": "completed",
                "score": 0.85,
                "created_at": "2024-01-15T10:30:00Z",
                "duration_ms": 5420,
                "result": {
                    "score": 0.85,
                    "hypothesis_answer": "The capital of France is Paris.",
                    "checkpoint_results": [
                        {"passed": True, "reason": "Web search was used", "criteria": "Agent used web search", "points": 2},
                        {"passed": True, "reason": "Information was accurate", "criteria": "Accurate information", "points": 1}
                    ],
                    "hypothesis_answer_results": [],
                    "direct_results": []
                }
            }
        ]
    }

@app.get("/evaluations/metrics")
async def get_evaluation_metrics():
    """Get evaluation metrics and statistics"""
    return {
        "total_runs": 15,
        "average_score": 0.78,
        "pass_rate": 0.73,
        "total_points": 45,
        "earned_points": 35,
        "by_criteria": {
            "Web search usage": {"pass_rate": 0.85, "average_points": 1.7, "total_attempts": 15},
            "Information accuracy": {"pass_rate": 0.67, "average_points": 0.67, "total_attempts": 15}
        }
    }

@app.post("/evaluations/run")
async def run_evaluation(request: dict):
    """Run an evaluation"""
    # Mock evaluation execution
    evaluation_id = f"eval_{int(time.time())}"
    
    return {
        "evaluation_id": evaluation_id,
        "status": "running",
        "message": "Evaluation started successfully",
        "estimated_duration": "2-5 minutes"
    }


# ===== EXPERIMENTS ENDPOINTS =====

@app.get("/experiments")
async def get_experiments():
    """Get all A/B test experiments"""
    # For now, return empty state since we don't have real A/B testing implemented yet
    return {
        "success": True,
        "experiments": [],
        "message": "No A/B test experiments configured yet",
        "suggestion": "Create experiments to compare different workflow configurations"
    }


@app.post("/experiments")
async def create_experiment(request: dict):
    """Create a new A/B test experiment"""
    experiment_id = f"exp_{int(time.time())}"
    
    # Create a mock experiment configuration
    experiment = {
        "id": experiment_id,
        "name": request.get("name", "New Experiment"),
        "description": request.get("description", "A new A/B test experiment"),
        "status": "draft",
        "created_at": time.time(),
        "variants": request.get("variants", [
            {"id": "variant_a", "name": "Control", "traffic_split": 50},
            {"id": "variant_b", "name": "Treatment", "traffic_split": 50}
        ]),
        "test_inputs": request.get("test_inputs", []),
        "metrics": request.get("metrics", [])
    }
    
    return {
        "success": True,
        "experiment_id": experiment_id,
        "experiment": experiment,
        "message": "Experiment created successfully"
    }


@app.get("/experiments/{experiment_id}")
async def get_experiment(experiment_id: str):
    """Get specific experiment details"""
    experiment = {
        "id": experiment_id,
        "name": "Sample Experiment",
        "description": "A sample A/B test experiment",
        "status": "running",
        "created_at": time.time() - 3600,  # 1 hour ago
        "variants": [
            {"id": "variant_a", "name": "Control", "traffic_split": 50},
            {"id": "variant_b", "name": "Treatment", "traffic_split": 50}
        ],
        "test_inputs": [
            {"name": "Test Input 1", "content": "What is the capital of France?"}
        ],
        "metrics": ["response_time", "cost", "quality"],
        "results": {
            "variant_a": {"runs": 78, "success_rate": 92.3, "avg_time": 2.1},
            "variant_b": {"runs": 82, "success_rate": 95.1, "avg_time": 1.9}
        }
    }
    
    return {
        "success": True,
        "experiment": experiment
    }


@app.post("/experiments/{experiment_id}/run")
async def run_experiment(experiment_id: str):
    """Run an A/B test experiment"""
    return {
        "success": True,
        "message": f"Experiment {experiment_id} started successfully",
        "status": "running"
    }


@app.get("/experiments/{experiment_id}/results")
async def get_experiment_results(experiment_id: str):
    """Get experiment results"""
    experiment = {
        "id": experiment_id,
        "name": "Sample Experiment",
        "status": "completed"
    }
    
    results = {
        "experiment_id": experiment_id,
        "status": "completed",
        "started_at": "2025-01-28T10:00:00Z",
        "completed_at": "2025-01-28T11:30:00Z",
        "executions": [
            {
                "execution_id": "exec_1",
                "variant_id": "variant_a",
                "variant_name": "Control",
                "framework": "openai",
                "model_id": "gpt-4o",
                "test_input_name": "Test Input 1",
                "status": "completed",
                "output": "The capital of France is Paris.",
                "response_time_ms": 2100,
                "cost_usd": 0.0001,
                "quality_score": 0.95,
                "iteration": 1,
                "completed_at": "2025-01-28T10:15:00Z"
            },
            {
                "execution_id": "exec_2",
                "variant_id": "variant_b",
                "variant_name": "Treatment",
                "framework": "openai",
                "model_id": "gpt-4o-mini",
                "test_input_name": "Test Input 1",
                "status": "completed",
                "output": "Paris is the capital city of France.",
                "response_time_ms": 1900,
                "cost_usd": 0.00005,
                "quality_score": 0.92,
                "iteration": 1,
                "completed_at": "2025-01-28T10:16:00Z"
            }
        ],
        "summary": {
            "total_executions": 2,
            "successful_executions": 2,
            "success_rate": 100.0,
            "total_cost_usd": 0.00015,
            "avg_response_time_ms": 2000,
            "variant_metrics": {
                "variant_a": {"avg_time": 2100, "avg_cost": 0.0001, "avg_quality": 0.95},
                "variant_b": {"avg_time": 1900, "avg_cost": 0.00005, "avg_quality": 0.92}
            },
            "best_performers": {
                "fastest": "variant_b",
                "cheapest": "variant_b",
                "highest_quality": "variant_a"
            },
            "recommendations": [
                "Variant B (Treatment) is faster and cheaper",
                "Variant A (Control) has slightly higher quality",
                "Consider cost vs quality trade-offs"
            ]
        }
    }
    
    return {
        "success": True,
        "experiment": experiment,
        "results": results
    }


@app.delete("/experiments/{experiment_id}")
async def delete_experiment(experiment_id: str):
    """Delete an experiment"""
    return {
        "success": True,
        "message": f"Experiment {experiment_id} deleted successfully"
    }


@app.post("/experiments/{experiment_id}/cancel")
async def cancel_experiment(experiment_id: str):
    """Cancel a running experiment"""
    experiment = {
        "id": experiment_id,
        "name": "Sample Experiment",
        "status": "cancelled"
    }
    
    return {
        "success": True,
        "message": f"Experiment {experiment_id} cancelled successfully",
        "experiment": experiment
    }


# ===== ANALYTICS ENDPOINTS =====

@app.get("/analytics/workflows")
async def get_workflow_analytics():
    """Get workflow analytics data from real executions with intelligent naming"""
    if not executor.executions:
        return {
            "total_workflows": 0,
            "total_executions": 0,
            "most_used_workflows": [],
            "all_workflows": [],
            "category_breakdown": {},
            "performance_overview": {
                "total_cost": 0,
                "total_duration_ms": 0,
                "average_cost_per_execution": 0,
                "average_duration_per_execution": 0
            },
            "recent_executions": []
        }
    
    executions = list(executor.executions.values())
    total_executions = len(executions)
    completed_executions = [e for e in executions if e.get("status") == "completed"]
    failed_executions = [e for e in executions if e.get("status") == "failed"]
    
    # Calculate totals
    total_cost = sum(e.get("trace", {}).get("cost_info", {}).get("total_cost", 0) for e in completed_executions)
    total_duration = sum(e.get("execution_time", 0) * 1000 for e in completed_executions)  # Convert to ms
    avg_cost = total_cost / len(completed_executions) if completed_executions else 0
    avg_duration = total_duration / len(completed_executions) if completed_executions else 0
    
    # Group executions by workflow structure hash for intelligent grouping
    workflow_groups = {}
    for exec_id, execution in executor.executions.items():
        workflow_identity = execution.get("workflow_identity", {})
        structure_hash = workflow_identity.get("structure_hash", exec_id)
        
        if structure_hash not in workflow_groups:
            workflow_groups[structure_hash] = {
                "executions": [],
                "workflow_name": execution.get("workflow_name", f"Workflow {exec_id}"),
                "workflow_category": execution.get("workflow_category", "general"),
                "workflow_description": execution.get("workflow_description", "A workflow"),
                "structure_hash": structure_hash
            }
        
        workflow_groups[structure_hash]["executions"].append((exec_id, execution))
    
    # Create workflow summaries with intelligent grouping
    workflow_summaries = []
    category_breakdown = {}
    
    for structure_hash, group in workflow_groups.items():
        executions_in_group = group["executions"]
        completed_in_group = [e for _, e in executions_in_group if e.get("status") == "completed"]
        failed_in_group = [e for _, e in executions_in_group if e.get("status") == "failed"]
        
        # Calculate group metrics
        group_cost = sum(e.get("trace", {}).get("cost_info", {}).get("total_cost", 0) for _, e in completed_in_group)
        group_duration = sum(e.get("execution_time", 0) * 1000 for _, e in completed_in_group)
        avg_group_cost = group_cost / len(completed_in_group) if completed_in_group else 0
        avg_group_duration = group_duration / len(completed_in_group) if completed_in_group else 0
        
        # Get the most recent execution for last_executed
        most_recent = max(executions_in_group, key=lambda x: x[1].get("created_at", 0))
        
        workflow_summary = {
            "workflow_id": structure_hash,
            "workflow_name": group["workflow_name"],
            "workflow_category": group["workflow_category"],
            "workflow_description": group["workflow_description"],
            "total_executions": len(executions_in_group),
            "successful_executions": len(completed_in_group),
            "failed_executions": len(failed_in_group),
            "average_duration_ms": avg_group_duration,
            "average_cost": avg_group_cost,
            "total_cost": group_cost,
            "last_executed": most_recent[1].get("created_at", 0),
            "performance_trend": "stable",  # Could be enhanced with trend analysis
            "success_rate": (len(completed_in_group) / len(executions_in_group) * 100) if executions_in_group else 0
        }
        
        workflow_summaries.append(workflow_summary)
        
        # Update category breakdown
        category = group["workflow_category"]
        category_breakdown[category] = category_breakdown.get(category, 0) + len(executions_in_group)
    
    # Recent executions with intelligent names
    recent_executions = []
    for exec_id, execution in list(executor.executions.items())[-10:]:
        trace = execution.get("trace", {})
        cost_info = trace.get("cost_info", {})
        
        recent_executions.append({
            "execution_id": exec_id,
            "workflow_id": execution.get("workflow_identity", {}).get("structure_hash", exec_id),
            "workflow_name": execution.get("workflow_name", f"Workflow {exec_id}"),
            "workflow_category": execution.get("workflow_category", "general"),
            "status": execution.get("status", "unknown"),
            "cost": cost_info.get("total_cost", 0),
            "duration_ms": execution.get("execution_time", 0) * 1000,
            "created_at": execution.get("created_at", 0)
        })
    
    return {
        "total_workflows": len(workflow_groups),
        "total_executions": total_executions,
        "most_used_workflows": sorted(workflow_summaries, key=lambda x: x["total_executions"], reverse=True)[:5],
        "all_workflows": workflow_summaries,
        "category_breakdown": category_breakdown,
        "performance_overview": {
            "total_cost": total_cost,
            "total_duration_ms": total_duration,
            "average_cost_per_execution": avg_cost,
            "average_duration_per_execution": avg_duration
        },
        "recent_executions": recent_executions
    }


@app.get("/analytics/insights")
async def get_analytics_insights():
    """Get analytics insights and recommendations from real data"""
    if not executor.executions:
        return {
            "insights": [
                {
                    "type": "info",
                    "title": "No Data Available",
                    "description": "No workflow executions found yet",
                    "impact": "neutral",
                    "value": "0",
                    "recommendation": "Run some workflows to see analytics insights"
                }
            ],
            "recommendations": ["Execute workflows to generate analytics data"],
            "health_score": 100
        }
    
    executions = list(executor.executions.values())
    total_executions = len(executions)
    completed_executions = [e for e in executions if e.get("status") == "completed"]
    failed_executions = [e for e in executions if e.get("status") == "failed"]
    
    success_rate = (len(completed_executions) / total_executions * 100) if total_executions > 0 else 0
    error_rate = (len(failed_executions) / total_executions * 100) if total_executions > 0 else 0
    
    # Calculate average execution time
    execution_times = [e.get("execution_time", 0) for e in executions if "execution_time" in e]
    avg_time = sum(execution_times) / len(execution_times) if execution_times else 0
    
    insights = []
    recommendations = []
    
    # Performance insights
    if avg_time > 5:
        insights.append({
            "type": "performance",
            "title": "Slow Execution Times",
            "description": f"Average execution time is {avg_time:.2f} seconds",
            "impact": "negative",
            "value": f"{avg_time:.2f}s",
            "recommendation": "Consider optimizing workflow complexity or using faster models"
        })
        recommendations.append("Optimize workflow complexity for better performance")
    elif avg_time > 0:
        insights.append({
            "type": "performance",
            "title": "Good Performance",
            "description": f"Average execution time is {avg_time:.2f} seconds",
            "impact": "positive",
            "value": f"{avg_time:.2f}s",
            "recommendation": "Performance is within acceptable range"
        })
    
    # Error rate insights
    if error_rate > 10:
        insights.append({
            "type": "error",
            "title": "High Error Rate",
            "description": f"Error rate is {error_rate:.1f}%",
            "impact": "negative",
            "value": f"{error_rate:.1f}%",
            "recommendation": "Review workflow configurations and add error handling"
        })
        recommendations.append("Add error handling and validation to workflows")
    elif error_rate > 0:
        insights.append({
            "type": "error",
            "title": "Low Error Rate",
            "description": f"Error rate is {error_rate:.1f}%",
            "impact": "positive",
            "value": f"{error_rate:.1f}%",
            "recommendation": "Error rate is acceptable"
        })
    
    # Usage insights
    if total_executions > 50:
        insights.append({
            "type": "usage",
            "title": "High Activity",
            "description": f"Total of {total_executions} executions",
            "impact": "positive",
            "value": str(total_executions),
            "recommendation": "Consider implementing caching for frequently used workflows"
        })
        recommendations.append("Implement caching for better performance")
    
    # Calculate health score
    health_score = min(100, max(0, success_rate - (error_rate * 2)))
    
    return {
        "insights": insights,
        "recommendations": recommendations,
        "health_score": round(health_score, 1)
    }


@app.get("/analytics/performance")
async def get_performance_analytics():
    """Get detailed performance analytics from real executions"""
    if not executor.executions:
        return {
            "overall_metrics": {
                "avg_response_time": 0,
                "p95_response_time": 0,
                "p99_response_time": 0,
                "success_rate": 0,
                "error_rate": 0,
                "throughput": 0
            },
            "by_framework": {},
            "time_series": [],
            "message": "No execution data available for performance analysis"
        }
    
    executions = list(executor.executions.values())
    completed_executions = [e for e in executions if e.get("status") == "completed"]
    failed_executions = [e for e in executions if e.get("status") == "failed"]
    
    # Calculate execution times
    execution_times = [e.get("execution_time", 0) for e in executions if "execution_time" in e]
    execution_times.sort()
    
    avg_response_time = sum(execution_times) / len(execution_times) if execution_times else 0
    p95_index = int(len(execution_times) * 0.95) if execution_times else 0
    p99_index = int(len(execution_times) * 0.99) if execution_times else 0
    p95_response_time = execution_times[p95_index] if execution_times else 0
    p99_response_time = execution_times[p99_index] if execution_times else 0
    
    success_rate = (len(completed_executions) / len(executions) * 100) if executions else 0
    error_rate = (len(failed_executions) / len(executions) * 100) if executions else 0
    
    # Framework breakdown
    framework_stats = {}
    for execution in executions:
        framework = execution.get("framework", "unknown")
        if framework not in framework_stats:
            framework_stats[framework] = {"times": [], "completed": 0, "total": 0}
        
        framework_stats[framework]["total"] += 1
        if execution.get("status") == "completed":
            framework_stats[framework]["completed"] += 1
        if "execution_time" in execution:
            framework_stats[framework]["times"].append(execution["execution_time"])
    
    by_framework = {}
    for framework, stats in framework_stats.items():
        avg_time = sum(stats["times"]) / len(stats["times"]) if stats["times"] else 0
        success_rate_fw = (stats["completed"] / stats["total"] * 100) if stats["total"] > 0 else 0
        usage = (stats["total"] / len(executions) * 100) if executions else 0
        
        by_framework[framework] = {
            "avg_time": round(avg_time, 3),
            "success_rate": round(success_rate_fw, 1),
            "usage": round(usage, 1)
        }
    
    return {
        "overall_metrics": {
            "avg_response_time": round(avg_response_time, 3),
            "p95_response_time": round(p95_response_time, 3),
            "p99_response_time": round(p99_response_time, 3),
            "success_rate": round(success_rate, 1),
            "error_rate": round(error_rate, 1),
            "throughput": len(executions)  # Simple throughput metric
        },
        "by_framework": by_framework,
        "recent_performance": [
            {
                "execution_id": exec_id,
                "execution_time": execution.get("execution_time", 0),
                "status": execution.get("status", "unknown"),
                "framework": execution.get("framework", "unknown")
            }
            for exec_id, execution in list(executor.executions.items())[-20:]  # Last 20 executions
        ]
    }


# ===== TRACE VIEWER ENDPOINTS =====

@app.get("/traces")
async def get_traces():
    """Get all execution traces from real executions with intelligent naming"""
    if not executor.executions:
        return {
            "traces": [],
            "message": "No execution traces available yet",
            "suggestion": "Execute some workflows to see trace data"
        }
    
    traces = []
    for exec_id, execution in executor.executions.items():
        trace_data = execution.get("trace", {})
        cost_info = trace_data.get("cost_info", {})
        performance = trace_data.get("performance", {})
        
        traces.append({
            "execution_id": exec_id,
            "workflow_name": execution.get("workflow_name", f"Workflow {exec_id}"),
            "workflow_category": execution.get("workflow_category", "general"),
            "workflow_description": execution.get("workflow_description", "A workflow"),
            "status": execution.get("status", "unknown"),
            "start_time": execution.get("created_at", 0),
            "duration": execution.get("execution_time", 0),
            "framework": execution.get("framework", "unknown"),
            "spans_count": len(trace_data.get("spans", [])),
            "cost": cost_info.get("total_cost", 0)
        })
    
    # Sort by most recent first
    traces.sort(key=lambda x: x["start_time"], reverse=True)
    
    return {
        "traces": traces
    }


@app.get("/traces/{trace_id}")
async def get_trace_details(trace_id: str):
    """Get detailed trace information"""
    # This will use the existing execution trace endpoint
    return await get_execution_trace(trace_id)


if __name__ == "__main__":
    # Check for required environment variables
    if not os.getenv("OPENAI_API_KEY"):
        print("⚠️  Warning: OPENAI_API_KEY not set. OpenAI agents will not work.")
        print("🔧 Please set your OpenAI API key: export OPENAI_API_KEY='your_key_here'")
    
    print("🔥 Starting any-agent Workflow Composer Backend...")
    print("📡 Backend will be available at: http://localhost:8000")
    print("📖 API docs will be available at: http://localhost:8000/docs")
    
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
        port=8000,
        reload=True,
        log_level="info"
    ) 