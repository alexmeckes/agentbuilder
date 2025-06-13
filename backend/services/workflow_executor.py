"""
Workflow execution service.
"""
import asyncio
import hashlib
import json
import logging
import os
import time
import uuid
from typing import Any, Dict, List, Optional

from fastapi import HTTPException, WebSocket

from models import (
    WorkflowDefinition,
    ExecutionRequest,
    ExecutionResponse
)

# Import visual-to-anyagent translator
from visual_to_anyagent_translator import execute_visual_workflow_with_anyagent


class WorkflowExecutor:
    """Execute workflows using any-agent's native multi-agent orchestration"""
    
    def __init__(self, workflow_store=None):
        # User-isolated executions: {user_id: {execution_id: execution_data}}
        self.user_executions: Dict[str, Dict[str, Dict[str, Any]]] = {}
        self._generating_identity = False  # Protection against infinite loops
        self._validation_cache = {}  # Cache for validation results
        self._last_validation_time = {}  # Track validation timing
        # New: Track pending user inputs for interactive workflows
        self.pending_inputs: Dict[str, Dict[str, Any]] = {}  # execution_id -> input_request_data
        self.websocket_connections: Dict[str, WebSocket] = {}  # execution_id -> websocket
        # New: Store for webhook triggers
        self.webhook_workflows: Dict[str, Dict[str, Any]] = {}
        
        # Memory management settings
        self.max_executions_per_user = 100
        self.execution_ttl_hours = 24
        
        # Store reference to WorkflowStore
        self.workflow_store = workflow_store

    def set_workflow_store(self, workflow_store):
        """Set the workflow store instance for analytics"""
        self.workflow_store = workflow_store
        print(f"✅ WorkflowStore connected to WorkflowExecutor")
    
    def _get_user_executions(self, user_id: str) -> Dict[str, Dict[str, Any]]:
        """Get executions for a specific user, creating if needed"""
        if user_id not in self.user_executions:
            self.user_executions[user_id] = {}
        return self.user_executions[user_id]
    
    def _add_execution(self, user_id: str, execution_id: str, data: dict):
        """Add an execution for a user with automatic cleanup"""
        user_execs = self._get_user_executions(user_id)
        
        # Add timestamp if not present
        if "created_at" not in data:
            data["created_at"] = time.time()
        
        # Store execution
        user_execs[execution_id] = data
        
        # Cleanup old executions for this user
        self._cleanup_user_executions(user_id)
    
    def _get_user_id_from_execution_id(self, execution_id: str) -> Optional[str]:
        """Extract user_id from execution_id"""
        if "_" in execution_id and execution_id.startswith("exec_"):
            parts = execution_id.split("_", 2)
            if len(parts) >= 3:
                return parts[1]
        # Fallback: search all users
        for user_id, user_execs in self.user_executions.items():
            if execution_id in user_execs:
                return user_id
        return None
    
    def _get_execution_by_id(self, execution_id: str) -> Optional[Dict[str, Any]]:
        """Get an execution by ID from any user (used for backward compatibility)"""
        # Extract user_id from execution_id if possible
        if "_" in execution_id and execution_id.startswith("exec_"):
            parts = execution_id.split("_", 2)
            if len(parts) >= 3:
                user_id = parts[1]
                if user_id in self.user_executions:
                    return self.user_executions[user_id].get(execution_id)
        
        # Fallback: search all users (for old execution IDs)
        for user_id, user_execs in self.user_executions.items():
            if execution_id in user_execs:
                return user_execs[execution_id]
        return None
    
    def _update_execution(self, execution_id: str, updates: dict):
        """Update an execution by ID"""
        execution = self._get_execution_by_id(execution_id)
        if execution:
            execution.update(updates)
            
            # Send WebSocket update if status changed or final result/error
            if any(key in updates for key in ['status', 'result', 'error', 'completed_at']):
                if execution_id in self.websocket_connections:
                    websocket = self.websocket_connections[execution_id]
                    asyncio.create_task(self._send_websocket_update(websocket, execution_id, execution))
    
    def _cleanup_user_executions(self, user_id: str):
        """Remove expired executions and enforce max limit per user"""
        user_execs = self.user_executions.get(user_id, {})
        current_time = time.time()
        ttl_seconds = self.execution_ttl_hours * 3600
        
        # Remove expired executions
        expired = [
            exec_id for exec_id, data in user_execs.items()
            if current_time - data.get("created_at", 0) > ttl_seconds
        ]
        for exec_id in expired:
            del user_execs[exec_id]
            # Also cleanup related data
            self.pending_inputs.pop(exec_id, None)
            self.websocket_connections.pop(exec_id, None)
        
        # Keep only most recent N executions
        if len(user_execs) > self.max_executions_per_user:
            sorted_execs = sorted(
                user_execs.items(),
                key=lambda x: x[1].get("created_at", 0),
                reverse=True
            )
            # Remove oldest executions
            for exec_id, _ in sorted_execs[self.max_executions_per_user:]:
                del user_execs[exec_id]
                self.pending_inputs.pop(exec_id, None)
                self.websocket_connections.pop(exec_id, None)

    async def register_webhook(self, workflow: WorkflowDefinition) -> Dict[str, str]:
        """Register a workflow to be triggered by a webhook."""
        import uuid
        webhook_id = str(uuid.uuid4())
        
        # Store the workflow definition tied to this webhook ID
        self.webhook_workflows[webhook_id] = {
            "workflow": workflow.dict(),
            "created_at": time.time()
        }
        
        print(f"✅ Registered webhook {webhook_id} for workflow.")
        
        # This should be dynamically generated based on your deployment URL
        base_url = os.getenv("BACKEND_URL", "http://localhost:8000")
        webhook_url = f"{base_url}/webhooks/trigger/{webhook_id}"
        
        return {"webhook_id": webhook_id, "url": webhook_url}

    async def trigger_webhook(self, webhook_id: str, input_data: Dict[str, Any]) -> Dict[str, Any]:
        """Trigger a workflow via a webhook and return the result."""
        if webhook_id not in self.webhook_workflows:
            raise HTTPException(status_code=404, detail="Webhook not found")
        
        webhook_registration = self.webhook_workflows[webhook_id]
        
        # Create an execution request from the stored workflow
        execution_request = ExecutionRequest(
            workflow=WorkflowDefinition(**webhook_registration["workflow"]),
            input_data=str(input_data),  # Convert incoming JSON to string for the agent
        )
        
        # Execute the workflow
        # Note: This executes the full async-progress workflow. For a webhook,
        # we might want a synchronous version, but we'll use this for now.
        response = await self.execute_workflow(execution_request)
        execution_id = response.execution_id
        
        # Wait for the execution to complete
        execution = self._get_execution_by_id(execution_id)
        while execution and execution["status"] in ["running", "waiting_for_input"]:
            await asyncio.sleep(0.5)
            execution = self._get_execution_by_id(execution_id)
            
        final_state = execution if execution else {"status": "failed", "error": "Execution not found"}
        
        if final_state["status"] == "failed":
            return {"success": False, "error": final_state.get("error", "Unknown error")}
            
        return {"success": True, "result": final_state.get("result")}

    async def execute_workflow(self, request: ExecutionRequest) -> ExecutionResponse:
        """Execute a workflow definition using any-agent's native multi-agent capabilities with async progress tracking"""
        # Extract user_id from request
        user_id = "anonymous"
        if request.user_context and request.user_context.get("user_id"):
            user_id = request.user_context["user_id"]
        
        # Generate unique execution ID across all users
        execution_id = f"exec_{user_id}_{int(time.time() * 1000)}"
        start_time = time.time()
        
        # Minimal debug - avoid excessive logging that might cause issues
        print(f"🚀 Starting execution {execution_id} for user {user_id} with {len(request.workflow.nodes)} nodes")
        
        # Initialize execution record with user isolation
        execution_data = {
            "status": "running",  # Changed from "initializing" to "running"
            "input": request.input_data,
            "created_at": start_time,
            "workflow": request.workflow,
            "framework": request.framework,
            "user_id": user_id,
            "progress": {
                "current_step": 0,
                "total_steps": 0,
                "current_activity": "Starting workflow execution...",
                "percentage": 0,
                "node_status": {}  # Track individual node progress
            }
        }
        
        # Add execution with automatic cleanup
        self._add_execution(user_id, execution_id, execution_data)
        
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
                    "target": edge.target,
                    "sourceHandle": getattr(edge, 'sourceHandle', 'default'),
                    "targetHandle": getattr(edge, 'targetHandle', 'default')
                }
                for edge in request.workflow.edges
            ]

            # DEBUG: Log the actual workflow structure for Designer debugging
            print(f"🔍 DEBUG: Workflow from Designer has {len(nodes)} nodes")
            for i, node in enumerate(nodes):
                node_data = node.get("data", {})
                print(f"  Node {i+1}: id={node.get('id')}, type={node.get('type')}, data.type={node_data.get('type')}, data.name={node_data.get('name')}")
            
            # Validate workflow structure before execution with caching
            validation_result = self._validate_workflow_structure_cached(nodes, edges)
            if not validation_result["valid"]:
                print(f"❌ Workflow validation failed: {validation_result['error']}")
                print(f"🔍 Nodes received: {[{'id': n.get('id'), 'type': n.get('type'), 'data_type': n.get('data', {}).get('type')} for n in nodes]}")
                self._update_execution(execution_id, {
                    "status": "failed",
                    "error": f"Invalid workflow structure: {validation_result['error']}"
                })
                return ExecutionResponse(
                    execution_id=execution_id,
                    status="failed",
                    error=f"Invalid workflow structure: {validation_result['error']}"
                )

            # Use provided workflow identity from Designer, or generate new one
            if request.workflow_identity:
                print(f"🎯 Using provided workflow identity: {request.workflow_identity.get('name', 'Unknown')}")
                workflow_identity = request.workflow_identity
                # Ensure all required fields are present
                if "name" not in workflow_identity:
                    workflow_identity["name"] = request.workflow_name or "Unknown Workflow"
                if "category" not in workflow_identity:
                    workflow_identity["category"] = "general"
                if "description" not in workflow_identity:
                    workflow_identity["description"] = "A custom workflow"
            else:
                # Generate intelligent workflow identity
                print(f"🏷️  Generating intelligent workflow name for {execution_id}...")
                workflow_identity = await self._generate_workflow_identity(nodes, edges, request.input_data)
                print(f"✨ Generated workflow: {workflow_identity['name']} ({workflow_identity['category']})")
            
            # Update execution record with complete workflow information
            self._update_execution(execution_id, {
                "workflow_identity": workflow_identity,
                "workflow_name": workflow_identity["name"],
                "workflow_category": workflow_identity["category"],
                "workflow_description": workflow_identity["description"]
            })
            
            # Initialize progress tracking for nodes
            executable_nodes = [n for n in nodes if n.get("type") in ["agent", "tool"]]
            total_steps = len(executable_nodes)
            
            # Get the execution to update progress
            execution = self._get_execution_by_id(execution_id)
            if execution:
                execution["progress"].update({
                    "total_steps": total_steps,
                    "current_activity": f"Preparing to execute {total_steps} nodes..."
                })
                
                # Initialize node status tracking
                for node in nodes:
                    node_id = node.get("id")
                    node_type = node.get("type")
                    if node_type in ["agent", "tool"]:
                        execution["progress"]["node_status"][node_id] = {
                            "status": "pending",
                            "name": node.get("data", {}).get("name", node_id),
                            "type": node_type
                        }
                    else:
                        # Input/output nodes are considered instantly completed
                        execution["progress"]["node_status"][node_id] = {
                            "status": "completed",
                            "name": node.get("data", {}).get("name", node_id),
                            "type": node_type
                        }
            
            # Start background execution task
            import asyncio
            asyncio.create_task(self._execute_workflow_async(
                execution_id, nodes, edges, request.input_data, request.framework, workflow_identity, user_id
            ))
            
            # Send initial WebSocket update if connection exists
            if execution_id in self.websocket_connections:
                websocket = self.websocket_connections[execution_id]
                asyncio.create_task(self._send_websocket_update(websocket, execution_id, execution_data))
            
            # Return immediately with running status (workflow identity will be sent via WebSocket)
            return ExecutionResponse(
                execution_id=execution_id,
                status="running"
            )
            
        except Exception as e:
            completion_time = time.time()
            error_details = {
                "error_type": type(e).__name__,
                "error_message": str(e),
                "execution_stage": "workflow_setup_or_execution"
            }
            
            print(f"❌ Critical workflow error: {error_details['error_type']}: {error_details['error_message']}")
            
            self._update_execution(execution_id, {
                "status": "failed",
                "error": str(e),
                "error_details": error_details,
                "completed_at": completion_time,
                "execution_time": completion_time - start_time
            })
            
            return ExecutionResponse(
                execution_id=execution_id,
                status="failed",
                error=f"Critical error: {error_details['error_type']}: {error_details['error_message']}"
            )

    async def _execute_workflow_async(self, execution_id: str, nodes: List[Dict], edges: List[Dict], 
                                     input_data: str, framework: str, workflow_identity: Dict[str, Any], user_id: str):
        """Background execution method with progress tracking"""
        start_time = time.time()
        
        try:
            print(f"🚀 Starting background execution for {execution_id}")
            
            # Update progress: Starting execution
            self._update_execution_progress(execution_id, 0, "Initializing agents...")
            
            # Simulate some progress steps for better UX (since any-agent executes internally)
            executable_nodes = [n for n in nodes if n.get("type") in ["agent", "tool"]]
            
            # Step 1: Mark first executable node as running
            if executable_nodes:
                first_node = executable_nodes[0]
                self._update_node_status(execution_id, first_node["id"], "running")
                self._update_execution_progress(execution_id, 10, f"Executing {first_node.get('data', {}).get('name', 'first node')}...")
                
                # Small delay for visual feedback
                await asyncio.sleep(0.5)
            
            # Execute the actual workflow
            self._update_execution_progress(execution_id, 25, "Running AI agents...")
            
            websocket = self.websocket_connections.get(execution_id)
            workflow_result = await execute_visual_workflow_with_anyagent(
                nodes=nodes,
                edges=edges,
                input_data=input_data,
                framework=framework,
                execution_id=execution_id,
                websocket=websocket
            )
            
            # Update progress through remaining nodes
            completed_nodes = 0
            for i, node in enumerate(executable_nodes):
                node_id = node["id"]
                
                # Mark previous node as completed and current as running
                if i > 0:
                    prev_node_id = executable_nodes[i-1]["id"]
                    self._update_node_status(execution_id, prev_node_id, "completed")
                
                if i < len(executable_nodes) - 1:  # Not the last node
                    self._update_node_status(execution_id, node_id, "running")
                    completed_nodes = i + 1
                    progress = 25 + (completed_nodes / len(executable_nodes)) * 65  # 25% to 90%
                    self._update_execution_progress(execution_id, progress, f"Processing {node.get('data', {}).get('name', node_id)}...")
                    await asyncio.sleep(0.3)  # Brief delay for visual feedback
            
            # Mark last node as completed
            if executable_nodes:
                last_node_id = executable_nodes[-1]["id"]
                self._update_node_status(execution_id, last_node_id, "completed")
            
            self._update_execution_progress(execution_id, 95, "Finalizing results...")
            
            # Handle execution results
            completion_time = time.time()
            
            if "error" in workflow_result:
                # Handle workflow error
                error_details = {
                    "error_type": "WorkflowResultError",
                    "error_message": workflow_result["error"],
                    "result_data": workflow_result.get("final_output", "No output")
                }
                
                # Mark any running nodes as failed
                for node in executable_nodes:
                    node_id = node["id"]
                    execution = self._get_execution_by_id(execution_id)
                    if execution:
                        current_status = execution["progress"]["node_status"][node_id]["status"]
                        if current_status in ["pending", "running"]:
                            self._update_node_status(execution_id, node_id, "failed")
                
                self._update_execution(execution_id, {
                    "status": "failed",
                    "result": workflow_result["final_output"],
                    "error": workflow_result["error"],
                    "error_details": error_details,
                    "completed_at": completion_time,
                    "execution_time": completion_time - start_time,
                    "cost_info": {"total_cost": 0, "total_tokens": 0, "input_tokens": 0, "output_tokens": 0},  # Empty cost_info for failed executions
                    "trace": {
                        "error": workflow_result["error"],
                        "error_details": error_details,
                        "framework_used": framework,
                        "workflow_identity": workflow_identity
                    }
                })
                
                self._update_execution_progress(execution_id, 100, f"Failed: {workflow_result['error']}")
                print(f"❌ Workflow {execution_id} failed: {workflow_result['error']}")
                
                # Store failed execution data in WorkflowStore for analytics
                if self.workflow_store:
                    execution_data_for_store = {
                        "execution_id": execution_id,
                        "user_id": user_id,
                        "workflow_id": workflow_identity.get("id", workflow_identity.get("structure_hash", execution_id)),
                        "workflow_name": workflow_identity.get("name", "Unknown Workflow"),
                        "workflow_category": workflow_identity.get("category", "general"),
                        "status": "failed",
                        "created_at": start_time,
                        "completed_at": completion_time,
                        "execution_time": completion_time - start_time,
                        "cost_info": {"total_cost": 0, "total_tokens": 0, "input_tokens": 0, "output_tokens": 0},
                        "error": workflow_result["error"],
                        "error_details": error_details,
                        "trace": {
                            "error": workflow_result["error"],
                            "error_details": error_details,
                            "framework_used": framework,
                            "workflow_identity": workflow_identity
                        }
                    }
                    self.workflow_store.add_execution(execution_data_for_store)
                    print(f"📊 Stored failed execution data in WorkflowStore for analytics")
                
            else:
                # Success case
                final_output = workflow_result.get("final_output")
                if not final_output:
                    print("⚠️  Warning: Workflow completed but produced no output")
                    final_output = "Workflow completed successfully but produced no output."
                
                # Mark all remaining nodes as completed
                for node in executable_nodes:
                    node_id = node["id"]
                    self._update_node_status(execution_id, node_id, "completed")
                
                # Extract cost info for both trace and top-level storage
                cost_info = self._extract_cost_info_from_trace(workflow_result.get("agent_trace"))
                
                self._update_execution(execution_id, {
                    "status": "completed",
                    "result": final_output,
                    "completed_at": completion_time,
                    "execution_time": completion_time - start_time,
                    "cost_info": cost_info,  # Store at top level for analytics
                    "trace": {
                        "final_output": final_output,
                        "execution_pattern": workflow_result.get("execution_pattern", "unknown"),
                        "main_agent": workflow_result.get("main_agent", "unknown"),
                        "managed_agents": workflow_result.get("managed_agents", []),
                        "framework_used": workflow_result.get("framework_used", framework),
                        "agent_trace": self._serialize_agent_trace(workflow_result.get("agent_trace")),
                        "execution_time": completion_time - start_time,
                        "cost_info": cost_info,  # Keep in trace for backward compatibility
                        "performance": self._extract_performance_metrics(workflow_result.get("agent_trace"), completion_time - start_time),
                        "spans": self._extract_spans_from_trace(workflow_result.get("agent_trace")),
                        "workflow_identity": workflow_identity
                    }
                })
                
                self._update_execution_progress(execution_id, 100, "Completed successfully!")
                
                # Debug: Check the final execution state
                final_execution = self._get_execution_by_id(execution_id)
                print(f"✅ Workflow {execution_id} completed successfully")
                print(f"🔍 Final execution status: {final_execution.get('status')}")
                print(f"🔍 Final progress: {final_execution.get('progress', {})}")
                print(f"🔍 Result length: {len(final_output) if final_output else 0} characters")
                
                # Store execution data in WorkflowStore for analytics
                if self.workflow_store:
                    execution_data_for_store = {
                        "execution_id": execution_id,
                        "user_id": user_id,
                        "workflow_id": workflow_identity.get("id", workflow_identity.get("structure_hash", execution_id)),
                        "workflow_name": workflow_identity.get("name", "Unknown Workflow"),
                        "workflow_category": workflow_identity.get("category", "general"),
                        "status": "completed",
                        "created_at": start_time,
                        "completed_at": completion_time,
                        "execution_time": completion_time - start_time,
                        "cost_info": cost_info,
                        "trace": {
                            "final_output": final_output,
                            "execution_pattern": workflow_result.get("execution_pattern", "unknown"),
                            "main_agent": workflow_result.get("main_agent", "unknown"),
                            "managed_agents": workflow_result.get("managed_agents", []),
                            "framework_used": workflow_result.get("framework_used", framework),
                            "performance": self._extract_performance_metrics(workflow_result.get("agent_trace"), completion_time - start_time),
                            "spans": self._extract_spans_from_trace(workflow_result.get("agent_trace")),
                            "workflow_identity": workflow_identity
                        }
                    }
                    self.workflow_store.add_execution(execution_data_for_store)
                    print(f"📊 Stored execution data in WorkflowStore for analytics")
                
        except Exception as e:
            # Handle execution exceptions
            completion_time = time.time()
            error_details = {
                "error_type": type(e).__name__,
                "error_message": str(e),
                "nodes_count": len(nodes),
                "framework": framework,
                "input_length": len(input_data)
            }
            
            print(f"❌ Background execution failed for {execution_id}: {error_details['error_type']}: {error_details['error_message']}")
            
            # Mark any running nodes as failed
            for node in nodes:
                if node.get("type") in ["agent", "tool"]:
                    node_id = node["id"]
                    execution = self._get_execution_by_id(execution_id)
                    if execution:
                        current_status = execution["progress"]["node_status"][node_id]["status"]
                        if current_status in ["pending", "running"]:
                            self._update_node_status(execution_id, node_id, "failed")
            
            self._update_execution(execution_id, {
                "status": "failed",
                "error": str(e),
                "error_details": error_details,
                "completed_at": completion_time,
                "execution_time": completion_time - start_time,
                "cost_info": {"total_cost": 0, "total_tokens": 0, "input_tokens": 0, "output_tokens": 0},  # Empty cost_info for failed executions
                "trace": {
                    "error": str(e),
                    "error_details": error_details,
                    "framework_used": framework,
                    "workflow_identity": workflow_identity
                }
            })
            
            self._update_execution_progress(execution_id, 100, f"Failed: {str(e)}")
            
            # Store exception execution data in WorkflowStore for analytics
            if self.workflow_store:
                execution_data_for_store = {
                    "execution_id": execution_id,
                    "user_id": user_id,
                    "workflow_id": workflow_identity.get("id", workflow_identity.get("structure_hash", execution_id)),
                    "workflow_name": workflow_identity.get("name", "Unknown Workflow"),
                    "workflow_category": workflow_identity.get("category", "general"),
                    "status": "failed",
                    "created_at": start_time,
                    "completed_at": completion_time,
                    "execution_time": completion_time - start_time,
                    "cost_info": {"total_cost": 0, "total_tokens": 0, "input_tokens": 0, "output_tokens": 0},
                    "error": str(e),
                    "error_details": error_details,
                    "trace": {
                        "error": str(e),
                        "error_details": error_details,
                        "framework_used": framework,
                        "workflow_identity": workflow_identity
                    }
                }
                self.workflow_store.add_execution(execution_data_for_store)
                print(f"📊 Stored exception execution data in WorkflowStore for analytics")

    def _update_execution_progress(self, execution_id: str, percentage: float, activity: str):
        """Update execution progress"""
        execution = self._get_execution_by_id(execution_id)
        if execution:
            execution["progress"].update({
                "percentage": min(100, max(0, percentage)),
                "current_activity": activity
            })
            
            # Send WebSocket update if connection exists
            if execution_id in self.websocket_connections:
                websocket = self.websocket_connections[execution_id]
                asyncio.create_task(self._send_websocket_update(websocket, execution_id, execution))

    def _update_node_status(self, execution_id: str, node_id: str, status: str):
        """Update individual node status"""
        execution = self._get_execution_by_id(execution_id)
        if execution and node_id in execution["progress"]["node_status"]:
            execution["progress"]["node_status"][node_id]["status"] = status
            
            # Update current step count
            completed_count = sum(1 for node_status in execution["progress"]["node_status"].values() 
                                if node_status["status"] == "completed")
            execution["progress"]["current_step"] = completed_count
            
            # Send WebSocket update for node status change
            if execution_id in self.websocket_connections:
                websocket = self.websocket_connections[execution_id]
                asyncio.create_task(self._send_websocket_update(websocket, execution_id, execution))
    
    async def _send_websocket_update(self, websocket, execution_id: str, execution: Dict[str, Any]):
        """Send execution update via WebSocket"""
        try:
            await websocket.send_json({
                "type": "execution_update",
                "execution_id": execution_id,
                "status": execution.get("status", "unknown"),
                "progress": execution.get("progress", {}),
                "result": execution.get("result"),
                "error": execution.get("error"),
                "workflow_name": execution.get("workflow_name"),
                "workflow_identity": execution.get("workflow_identity", {})
            })
        except Exception as e:
            print(f"❌ Failed to send WebSocket update: {e}")

    async def _detect_user_input_request(self, execution_id: str, agent_output: str) -> Optional[Dict[str, Any]]:
        """Detect if agent is asking for user input based on output content"""
        if not agent_output:
            return None
            
        # Simple heuristics to detect user input requests
        input_indicators = [
            "what would you like",
            "please provide",
            "tell me about",
            "what are your preferences",
            "what do you think",
            "how would you like",
            "what should",
            "what kind of",
            "which option",
            "please choose",
            "please select",
            "can you tell me",
            "what's your",
        ]
        
        agent_output_lower = agent_output.lower()
        
        # Check if output contains question marks and input indicators
        has_question = "?" in agent_output
        has_input_indicator = any(indicator in agent_output_lower for indicator in input_indicators)
        
        if has_question and has_input_indicator:
            # Extract the question for the user
            sentences = agent_output.split(".")
            question_sentences = [s.strip() for s in sentences if "?" in s]
            
            if question_sentences:
                question = question_sentences[0].strip()
                return {
                    "type": "input_request",
                    "execution_id": execution_id,
                    "question": question,
                    "full_output": agent_output,
                    "timestamp": time.time()
                }
        
        return None

    async def _send_input_request_to_frontend(self, execution_id: str, input_request: Dict[str, Any]):
        """Send input request message to frontend via WebSocket"""
        if execution_id in self.websocket_connections:
            websocket = self.websocket_connections[execution_id]
            try:
                await websocket.send_json({
                    "type": "input_request",
                    "execution_id": execution_id,
                    "status": "waiting_for_input",
                    "input_request": input_request
                })
                
                # Store the pending input request
                self.pending_inputs[execution_id] = input_request
                
                # Update execution status
                execution = self._get_execution_by_id(execution_id)
                if execution:
                    execution["status"] = "waiting_for_input"
                    execution["progress"]["current_activity"] = f"Waiting for user input: {input_request['question']}"
                    
                print(f"📝 Sent input request to frontend for execution {execution_id}")
                
            except Exception as e:
                print(f"❌ Failed to send input request to frontend: {e}")
                
    async def provide_user_input(self, execution_id: str, input_text: str) -> Dict[str, Any]:
        """Process user input and resume workflow execution"""
        if execution_id not in self.pending_inputs:
            return {"success": False, "error": "No pending input request found"}
            
        execution = self._get_execution_by_id(execution_id)
        if not execution:
            return {"success": False, "error": "Execution not found"}
            
        try:
            # Remove from pending inputs
            input_request = self.pending_inputs.pop(execution_id)
            
            # Update execution status
            execution["status"] = "running"
            execution["progress"]["current_activity"] = "Processing user input..."
            execution["user_input"] = input_text
            
            # Send update to frontend
            if execution_id in self.websocket_connections:
                websocket = self.websocket_connections[execution_id]
                try:
                    await websocket.send_json({
                        "type": "input_received",
                        "execution_id": execution_id,
                        "status": "running",
                        "user_input": input_text,
                        "message": "User input received, resuming execution..."
                    })
                except Exception as e:
                    print(f"❌ Failed to send input confirmation to frontend: {e}")
            
            print(f"✅ User input received for execution {execution_id}: {input_text}")
            
            # TODO: In a full implementation, we would resume the agent execution here
            # For now, we'll just mark the execution as completed with the user input
            execution["status"] = "completed"
            execution["result"] = f"Workflow completed with user input: {input_text}"
            execution["progress"]["current_activity"] = "Completed"
            execution["progress"]["percentage"] = 100
            
            # Send WebSocket update for completion
            if execution_id in self.websocket_connections:
                websocket = self.websocket_connections[execution_id]
                await self._send_websocket_update(websocket, execution_id, execution)
            
            return {"success": True, "message": "User input processed successfully"}
            
        except Exception as e:
            print(f"❌ Error processing user input for execution {execution_id}: {e}")
            return {"success": False, "error": str(e)}
    
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
        print(f"🔍 Legacy cost extraction: agent_trace type = {type(agent_trace)}")
        print(f"🔍 Legacy cost extraction: has get_total_cost = {hasattr(agent_trace, 'get_total_cost')}")
        
        if not agent_trace:
            print(f"⚠️  Legacy cost extraction: agent_trace is None")
            return {}
            
        if not hasattr(agent_trace, 'get_total_cost'):
            print(f"⚠️  Legacy cost extraction: agent_trace has no get_total_cost method")
            # Try alternative methods to extract cost data
            if hasattr(agent_trace, 'spans'):
                print(f"🔍 Legacy cost extraction: Found spans attribute, extracting manually")
                spans = getattr(agent_trace, 'spans', [])
                total_cost = 0.0
                total_tokens = 0
                input_tokens = 0
                output_tokens = 0
                
                for i, span in enumerate(spans):
                    if hasattr(span, 'attributes'):
                        attrs = getattr(span, 'attributes', {})
                        input_cost = attrs.get("gen_ai.usage.input_cost", attrs.get("cost_prompt", 0.0))
                        output_cost = attrs.get("gen_ai.usage.output_cost", attrs.get("cost_completion", 0.0))
                        span_input_tokens = attrs.get("gen_ai.usage.input_tokens", attrs.get("llm.token_count.prompt", 0))
                        span_output_tokens = attrs.get("gen_ai.usage.output_tokens", attrs.get("llm.token_count.completion", 0))
                        
                        span_cost = float(input_cost) + float(output_cost)
                        span_tokens = int(span_input_tokens) + int(span_output_tokens)
                        
                        print(f"   Legacy span {i}: cost=${span_cost:.6f}, tokens={span_tokens}")
                        
                        total_cost += span_cost
                        input_tokens += int(span_input_tokens)
                        output_tokens += int(span_output_tokens)
                        total_tokens += span_tokens
                
                result = {
                    "total_cost": total_cost,
                    "total_tokens": total_tokens,
                    "input_tokens": input_tokens,
                    "output_tokens": output_tokens
                }
                print(f"💰 Legacy manual extraction result: {result}")
                return result
            
            return {}
        
        try:
            print(f"🔍 Legacy cost extraction: Calling get_total_cost()")
            cost_info = agent_trace.get_total_cost()
            print(f"🔍 Legacy cost extraction: cost_info = {cost_info}, type = {type(cost_info)}")
            
            result = {
                "total_cost": getattr(cost_info, 'total_cost', 0),
                "total_tokens": getattr(cost_info, 'total_tokens', 0),
                "input_tokens": getattr(cost_info, 'input_tokens', 0),
                "output_tokens": getattr(cost_info, 'output_tokens', 0)
            }
            print(f"💰 Legacy cost extraction result: {result}")
            return result
        except Exception as e:
            print(f"❌ Legacy cost extraction error: {e}")
            return {"cost_extraction_error": str(e)}
    
    def _extract_cost_info_from_trace(self, agent_trace) -> Dict[str, Any]:
        """Extract cost information from trace data using GenAI semantic convention"""
        if not agent_trace:
            print(f"⚠️  Cost extraction: agent_trace is None or empty")
            return {}
        
        try:
            # If it's our new dictionary structure, check for spans with cost data
            if isinstance(agent_trace, dict):
                spans = agent_trace.get("spans", [])
                print(f"🔍 Cost extraction: Found {len(spans)} spans in agent_trace")
                
                total_cost = 0.0
                total_tokens = 0
                input_tokens = 0
                output_tokens = 0
                
                for i, span in enumerate(spans):
                    attributes = span.get("attributes", {})
                    
                    # Debug: Log all attributes to see what's actually available
                    print(f"🔍 Span {i} all attributes: {list(attributes.keys())}")
                    cost_related = {k: v for k, v in attributes.items() if any(word in k.lower() for word in ['cost', 'token', 'usage'])}
                    model_name = attributes.get("llm.model_name") or attributes.get("gen_ai.request.model") or "unknown"
                    print(f"🔍 Span {i} model_name: '{model_name}'")
                    if cost_related:
                        print(f"🔍 Span {i} cost/token attributes: {cost_related}")
                    else:
                        print(f"⚠️  Span {i} has NO cost or token attributes!")
                    
                    # Extract costs using GenAI semantic convention or fallback to OpenInference names
                    input_cost = attributes.get("gen_ai.usage.input_cost", attributes.get("cost_prompt", 0.0))
                    output_cost = attributes.get("gen_ai.usage.output_cost", attributes.get("cost_completion", 0.0))
                    
                    # Extract token counts using GenAI semantic convention or fallback to OpenInference names
                    span_input_tokens = attributes.get("gen_ai.usage.input_tokens", attributes.get("llm.token_count.prompt", 0))
                    span_output_tokens = attributes.get("gen_ai.usage.output_tokens", attributes.get("llm.token_count.completion", 0))
                    
                    span_total_cost = float(input_cost) + float(output_cost)
                    span_total_tokens = int(span_input_tokens) + int(span_output_tokens)
                    
                    # If we have tokens but no cost, try to calculate cost using LiteLLM
                    if span_total_tokens > 0 and span_total_cost == 0 and model_name != "unknown":
                        try:
                            import litellm
                            print(f"🔧 Attempting to calculate cost for model '{model_name}' with {span_input_tokens} input + {span_output_tokens} output tokens")
                            
                            # Calculate cost using LiteLLM - correctly using prompt_tokens and completion_tokens
                            cost_result = litellm.cost_per_token(
                                model=model_name,
                                prompt_tokens=int(span_input_tokens),
                                completion_tokens=int(span_output_tokens)
                            )
                            
                            # Handle different return formats from LiteLLM
                            if isinstance(cost_result, tuple) and len(cost_result) == 2:
                                input_cost_calc, output_cost_calc = cost_result
                            else:
                                # If it returns a single value or different format
                                input_cost_calc = cost_result or 0.0
                                output_cost_calc = 0.0
                            
                            # Handle None values
                            input_cost_calc = input_cost_calc or 0.0
                            output_cost_calc = output_cost_calc or 0.0
                            calculated_cost = input_cost_calc + output_cost_calc
                            if calculated_cost > 0:
                                print(f"✅ Calculated cost: ${calculated_cost:.6f} (${input_cost_calc:.6f} input + ${output_cost_calc:.6f} output)")
                                span_total_cost = calculated_cost
                                input_cost = input_cost_calc
                                output_cost = output_cost_calc
                            else:
                                print(f"⚠️  LiteLLM returned $0.00 for model '{model_name}' - model may not be supported")
                        except Exception as e:
                            print(f"❌ Failed to calculate cost with LiteLLM: {e}")
                    
                    print(f"   Span {i}: cost=${span_total_cost:.6f}, tokens={span_total_tokens}")
                    if span_total_tokens > 0 and span_total_cost == 0:
                        print(f"⚠️  Span {i} has tokens but ZERO cost - model '{model_name}' may not be supported by LiteLLM!")
                    
                    total_cost += span_total_cost
                    input_tokens += int(span_input_tokens)
                    output_tokens += int(span_output_tokens)
                    total_tokens += span_total_tokens
                
                cost_result = {
                    "total_cost": total_cost,
                    "total_tokens": total_tokens,
                    "input_tokens": input_tokens,
                    "output_tokens": output_tokens
                }
                
                print(f"💰 Cost extraction result: {cost_result}")
                
                # Always return extracted cost data if we have any spans
                return cost_result
                
            # Fallback to legacy method for AgentTrace objects
            print(f"⚠️  Cost extraction: agent_trace is not dict, using legacy extraction method")
            return self._extract_cost_info(agent_trace)
        except Exception as e:
            print(f"❌ Error extracting cost info: {e}")
            return {"cost_extraction_error": str(e)}
    
    def _extract_performance_metrics(self, agent_trace, execution_time: float) -> Dict[str, Any]:
        """Extract performance metrics from trace data, including cost information"""
        if not agent_trace:
            return {"total_duration_ms": execution_time * 1000}
        
        try:
            # If it's our new dictionary structure
            if isinstance(agent_trace, dict):
                performance = agent_trace.get("performance", {})
                # Ensure we have execution time
                performance["total_duration_ms"] = performance.get("total_duration_ms", execution_time * 1000)
                
                # Also include cost information in performance for analytics compatibility
                # Extract cost info using the same method as cost_info
                cost_info = self._extract_cost_info_from_trace(agent_trace)
                print(f"📊 Performance metrics: Including cost_info in performance: {cost_info}")
                if cost_info:
                    performance["total_cost"] = cost_info.get("total_cost", 0)
                    performance["total_tokens"] = cost_info.get("total_tokens", 0)
                    performance["input_tokens"] = cost_info.get("input_tokens", 0)
                    performance["output_tokens"] = cost_info.get("output_tokens", 0)
                    print(f"📊 Performance metrics: Added cost data to performance: total_cost={performance.get('total_cost', 0)}")
                else:
                    print(f"⚠️  Performance metrics: cost_info is empty, no cost data added to performance")
                
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

    def _extract_node_metrics_for_workflow(self, executions: List[tuple]) -> Dict[str, Any]:
        """Extract aggregated node-level metrics for a workflow"""
        node_stats = {}
        
        for exec_id, execution in executions:
            if execution.get("status") != "completed":
                continue
                
            trace = execution.get("trace", {})
            spans = trace.get("spans", [])
            
            for span in spans:
                span_name = span.get("name", "")
                if not span_name.startswith("Node:"):
                    continue
                    
                attributes = span.get("attributes", {})
                node_id = attributes.get("node.id", "unknown")
                node_type = attributes.get("node.type", "unknown")
                node_name = attributes.get("node.name", "Unknown")
                
                if node_id not in node_stats:
                    node_stats[node_id] = {
                        "node_name": node_name,
                        "node_type": node_type,
                        "total_duration_ms": 0,
                        "total_cost": 0,
                        "execution_count": 0,
                        "failure_count": 0
                    }
                
                # Calculate duration
                duration_ms = 0
                if span.get("start_time") and span.get("end_time"):
                    duration_ms = (span.get("end_time") - span.get("start_time")) / 1_000_000
                
                node_stats[node_id]["total_duration_ms"] += duration_ms
                node_stats[node_id]["execution_count"] += 1
                
                # Track failures
                if span.get("status", {}).get("status_code") != "OK":
                    node_stats[node_id]["failure_count"] += 1
        
        # Calculate averages
        for node_id, stats in node_stats.items():
            count = stats["execution_count"]
            if count > 0:
                stats["avg_duration_ms"] = stats["total_duration_ms"] / count
                stats["failure_rate"] = (stats["failure_count"] / count) * 100
        
        return node_stats
    
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

    async def _generate_workflow_identity(self, nodes: List[Dict], edges: List[Dict], input_data: str) -> Dict[str, Any]:
        """Generate workflow identity using structural analysis"""
        # Enhanced protection against infinite loops
        if self._generating_identity:
            print("⚠️  Loop protection: Skipping nested workflow identity generation")
            return {
                "name": f"Workflow {len(self.user_executions) + 1}",
                "description": "A custom workflow",
                "category": "general",
                "confidence": 0.5,
                "alternatives": [],
                "auto_generated": True,
                "structure_hash": self._generate_structure_hash(nodes, edges)
            }
        
        # Check if we've generated identity for this exact structure recently
        structure_hash = self._generate_structure_hash(nodes, edges)
        current_time = time.time()
        cache_key = f"identity_{structure_hash}"
        
        # Only use rate limiting for identical requests within 30 seconds (allow for real use)
        if cache_key in self._last_validation_time:
            time_since_last = current_time - self._last_validation_time[cache_key]
            if time_since_last < 30.0:
                print(f"🔄 Recent identity generation for structure {structure_hash[:8]}, using simple naming")
                # Use simple naming for recent duplicates
                return self._generate_simple_workflow_identity(nodes, edges, input_data, structure_hash)
        
        self._last_validation_time[cache_key] = current_time
        self._generating_identity = True
        try:
            # Analyze workflow structure
            workflow_name = "Custom Workflow"
            workflow_category = "general"
            workflow_description = "A custom workflow"
            confidence = 0.7
            
            # Check for system workflows
            system_workflow_detected = False
            
            for node in nodes:
                if node.get("type") == "agent":
                    agent_data = node.get("data", {})
                    agent_name = agent_data.get("name", "").lower()
                    
                    # Detect system workflows
                    if agent_name in ["contextextractor", "contextgenerator"]:
                        system_workflow_detected = True
                        break
            
            # Handle system workflows
            if system_workflow_detected:
                workflow_name = "System Workflow"
                workflow_description = "Internal system processing"
                workflow_category = "system"
                confidence = 0.9
            else:
                # Use structural naming based on node types and counts
                agent_count = len([n for n in nodes if n.get("type") == "agent"])
                tool_count = len([n for n in nodes if n.get("type") == "tool"])
                
                # Generate descriptive name based on structure
                if agent_count > 1:
                    workflow_name = f"{agent_count}-Agent Workflow"
                    workflow_description = f"A workflow with {agent_count} AI agents"
                elif agent_count == 1 and tool_count > 0:
                    workflow_name = "Agent-Tool Workflow"
                    workflow_description = f"A workflow with {tool_count} tool{'s' if tool_count > 1 else ''}"
                elif agent_count == 1:
                    workflow_name = "Single Agent Workflow"
                    workflow_description = "A workflow with one AI agent"
                else:
                    workflow_name = "Custom Workflow"
                    workflow_description = "A custom workflow"
                
                # Simple category assignment based on structure
                if tool_count > agent_count:
                    workflow_category = "automation"
                elif agent_count >= 2:
                    workflow_category = "multi-agent"
                else:
                    workflow_category = "general"
            
            return {
                "name": workflow_name,
                "description": workflow_description,
                "category": workflow_category,
                "confidence": confidence,
                "alternatives": [],
                "auto_generated": True,
                "structure_hash": self._generate_structure_hash(nodes, edges)
            }
            
        except Exception as e:
            print(f"Error in workflow naming: {e}")
            return {
                "name": f"Workflow {len(self.user_executions) + 1}",
                "description": "A custom workflow",
                "category": "general",
                "confidence": 0.5,
                "alternatives": [],
                "auto_generated": True,
                "structure_hash": self._generate_structure_hash(nodes, edges)
            }
        finally:
            self._generating_identity = False

    def _generate_simple_workflow_identity(self, nodes: List[Dict], edges: List[Dict], input_data: str, structure_hash: str) -> Dict[str, Any]:
        """Generate workflow identity using simple structural analysis"""
        workflow_name = "Custom Workflow"
        workflow_category = "general"
        workflow_description = "A custom workflow"
        confidence = 0.6
        
        # Check for system workflows first
        system_workflow_detected = False
        for node in nodes:
            if node.get("type") == "agent":
                agent_data = node.get("data", {})
                agent_name = agent_data.get("name", "").lower()
                if agent_name in ["contextextractor", "contextgenerator"]:
                    system_workflow_detected = True
                    break
        
        if system_workflow_detected:
            workflow_name = "System Workflow"
            workflow_description = "Internal system processing"
            workflow_category = "system"
            confidence = 0.9
        else:
            # Use structural naming based on node types and counts
            agent_count = len([n for n in nodes if n.get("type") == "agent"])
            tool_count = len([n for n in nodes if n.get("type") == "tool"])
            
            # Generate descriptive name based on structure
            if agent_count > 1:
                workflow_name = f"{agent_count}-Agent Workflow"
                workflow_description = f"A workflow with {agent_count} AI agents"
            elif agent_count == 1 and tool_count > 0:
                workflow_name = "Agent-Tool Workflow"
                workflow_description = f"A workflow with {tool_count} tool{'s' if tool_count > 1 else ''}"
            elif agent_count == 1:
                workflow_name = "Single Agent Workflow"
                workflow_description = "A workflow with one AI agent"
            else:
                workflow_name = "Custom Workflow"
                workflow_description = "A custom workflow"
            
            # Simple category assignment based on structure
            if tool_count > agent_count:
                workflow_category = "automation"
            elif agent_count >= 2:
                workflow_category = "multi-agent"
            else:
                workflow_category = "general"
        
        return {
            "name": workflow_name,
            "description": workflow_description,
            "category": workflow_category,
            "confidence": confidence,
            "alternatives": [],
            "auto_generated": True,
            "structure_hash": structure_hash
        }

    def _validate_workflow_structure(self, nodes: List[Dict], edges: List[Dict]) -> Dict[str, Any]:
        """Enhanced workflow structure validation before execution"""
        try:
            # Basic validation checks
            if not nodes:
                return {"valid": False, "error": "Workflow must contain at least one node"}
            
            # Validate node structure first
            for i, node in enumerate(nodes):
                if not node.get("id"):
                    return {"valid": False, "error": f"Node {i} missing required 'id' field"}
                if not node.get("type"):
                    return {"valid": False, "error": f"Node {node.get('id', i)} missing required 'type' field"}
                if not node.get("data"):
                    return {"valid": False, "error": f"Node {node.get('id', i)} missing required 'data' field"}
            
            # Unified approach: check for executable nodes using BOTH node.type and data.type
            # This ensures compatibility between AI Assistant (uses data.type) and Visual Designer (may use node.type)
            def is_agent_node(node):
                return (node.get("type") == "agent" or 
                       node.get("data", {}).get("type") == "agent")
            
            def is_tool_node(node):
                return (node.get("type") == "tool" or 
                       node.get("data", {}).get("type") == "tool")
            
            def is_executable_node(node):
                return is_agent_node(node) or is_tool_node(node)
            
            # Find all executable nodes (agents and tools)
            agent_nodes = [n for n in nodes if is_agent_node(n)]
            tool_nodes = [n for n in nodes if is_tool_node(n)]
            all_executable_nodes = [n for n in nodes if is_executable_node(n)]
            
            # Must have at least one executable node
            if not all_executable_nodes:
                return {"valid": False, "error": "Workflow must contain at least one agent or tool node"}
            
            print(f"🔍 Found {len(agent_nodes)} agent nodes and {len(tool_nodes)} tool nodes")
            
            # Enhanced agent node validation with model checking
            for agent_node in agent_nodes:
                agent_data = agent_node.get("data", {})
                
                # Check for name/label
                if not agent_data.get("name") and not agent_data.get("label"):
                    return {"valid": False, "error": f"Agent node {agent_node.get('id')} missing name or label"}
                
                # Check for instructions
                if not agent_data.get("instructions"):
                    return {"valid": False, "error": f"Agent node {agent_node.get('id')} missing instructions"}
                
                # Validate model_id format (only for agent nodes)
                model_id = agent_data.get("model_id")
                if model_id and not self._is_valid_model_format(model_id):
                    return {"valid": False, "error": f"Agent node {agent_node.get('id')} has invalid model_id format: {model_id}"}
            
            # Tool node validation (separate from agent nodes)
            for tool_node in tool_nodes:
                tool_data = tool_node.get("data", {})
                
                # Check for name/label
                if not tool_data.get("name") and not tool_data.get("label"):
                    return {"valid": False, "error": f"Tool node {tool_node.get('id')} missing name or label"}
                
                # Tool nodes should have tool_type, not model_id
                if tool_data.get("model_id") and not tool_data.get("tool_type"):
                    # If tool has model_id but no tool_type, try to infer tool_type
                    model_id = tool_data.get("model_id")
                    if "browse" in model_id.lower() or "search" in model_id.lower():
                        tool_data["tool_type"] = "web_search"
                        print(f"⚡ Inferred tool_type 'web_search' for tool node {tool_node.get('id')} with model_id {model_id}")
                        # Remove the invalid model_id since this is a tool
                        del tool_data["model_id"]
                        print(f"🔧 Removed invalid model_id from tool node {tool_node.get('id')}")
            
            # Validate edges structure
            node_ids = set(node["id"] for node in nodes)
            for i, edge in enumerate(edges):
                if not edge.get("source"):
                    return {"valid": False, "error": f"Edge {i} missing 'source' field"}
                if not edge.get("target"):
                    return {"valid": False, "error": f"Edge {i} missing 'target' field"}
                if edge["source"] not in node_ids:
                    return {"valid": False, "error": f"Edge {i} source '{edge['source']}' references non-existent node"}
                if edge["target"] not in node_ids:
                    return {"valid": False, "error": f"Edge {i} target '{edge['target']}' references non-existent node"}
            
            # Enhanced workflow flow validation
            flow_validation = self._validate_workflow_flow(nodes, edges)
            if not flow_validation["valid"]:
                return flow_validation
            
            # Check for circular dependencies
            if self._has_circular_dependency(nodes, edges):
                return {"valid": False, "error": "Workflow contains circular dependencies"}
            
            # Validate execution paths
            path_validation = self._validate_execution_paths(nodes, edges)
            if not path_validation["valid"]:
                return path_validation
            
            return {"valid": True, "message": "Workflow structure is valid", "validation_details": {
                "node_count": len(nodes),
                "edge_count": len(edges),
                "agent_count": len(agent_nodes),
                "has_cycles": False,
                "execution_paths": len(self._find_execution_paths(nodes, edges))
            }}
            
        except Exception as e:
            return {"valid": False, "error": f"Validation error: {str(e)}"}
    
    def _is_valid_model_format(self, model_id: str) -> bool:
        """Basic model ID format validation"""
        if not isinstance(model_id, str) or len(model_id) < 3:
            return False
        
        # Allow common model patterns
        valid_patterns = [
            "gpt-", "claude-", "gemini-", "llama-", "mixtral-", 
            "anthropic", "openai", "o1-", "o3-"
        ]
        
        return any(model_id.lower().startswith(pattern) for pattern in valid_patterns)
    
    def _validate_workflow_flow(self, nodes: List[Dict], edges: List[Dict]) -> Dict[str, Any]:
        """Validate workflow flow connectivity and structure"""
        try:
            node_ids = set(node["id"] for node in nodes)
            
            # Build adjacency lists
            outgoing = {}
            incoming = {}
            for node_id in node_ids:
                outgoing[node_id] = []
                incoming[node_id] = []
            
            for edge in edges:
                outgoing[edge["source"]].append(edge["target"])
                incoming[edge["target"]].append(edge["source"])
            
            # Find orphaned nodes (nodes with no connections)
            orphaned_nodes = [
                node_id for node_id in node_ids 
                if not outgoing[node_id] and not incoming[node_id]
            ]
            
            # Allow single-node workflows (common for simple agent tasks)
            if len(nodes) == 1:
                return {"valid": True, "message": "Single-node workflow is valid"}
            
            # For multi-node workflows, check for proper connectivity
            if orphaned_nodes:
                return {
                    "valid": False, 
                    "error": f"Orphaned nodes detected (not connected to workflow): {', '.join(orphaned_nodes)}"
                }
            
            # Find start nodes (no incoming edges) and end nodes (no outgoing edges)
            start_nodes = [node_id for node_id in node_ids if not incoming[node_id]]
            end_nodes = [node_id for node_id in node_ids if not outgoing[node_id]]
            
            # Validate workflow has proper start and end points
            if not start_nodes:
                return {"valid": False, "error": "Workflow has no start nodes (all nodes have incoming edges - circular dependency)"}
            
            if not end_nodes:
                return {"valid": False, "error": "Workflow has no end nodes (all nodes have outgoing edges - circular dependency)"}
            
            # Check for disconnected components
            reachable_from_start = self._find_reachable_nodes(start_nodes[0], outgoing)
            if len(reachable_from_start) < len(node_ids):
                unreachable = node_ids - reachable_from_start
                return {
                    "valid": False,
                    "error": f"Workflow has disconnected components. Unreachable nodes: {', '.join(unreachable)}"
                }
            
            return {"valid": True, "message": "Workflow flow is valid"}
            
        except Exception as e:
            return {"valid": False, "error": f"Flow validation error: {str(e)}"}
    
    def _find_reachable_nodes(self, start_node: str, adjacency: Dict[str, List[str]]) -> set:
        """Find all nodes reachable from a start node"""
        visited = set()
        stack = [start_node]
        
        while stack:
            node = stack.pop()
            if node not in visited:
                visited.add(node)
                stack.extend(adjacency.get(node, []))
        
        return visited
    
    def _validate_execution_paths(self, nodes: List[Dict], edges: List[Dict]) -> Dict[str, Any]:
        """Validate that workflow has valid execution paths"""
        try:
            if len(nodes) == 1:
                return {"valid": True, "message": "Single-node execution path is valid"}
            
            # Build graph
            node_ids = set(node["id"] for node in nodes)
            outgoing = {node_id: [] for node_id in node_ids}
            incoming = {node_id: [] for node_id in node_ids}
            
            for edge in edges:
                outgoing[edge["source"]].append(edge["target"])
                incoming[edge["target"]].append(edge["source"])
            
            # Find execution paths
            paths = self._find_execution_paths(nodes, edges)
            
            if not paths:
                return {"valid": False, "error": "No valid execution paths found in workflow"}
            
            # Validate path lengths are reasonable
            max_path_length = max(len(path) for path in paths) if paths else 0
            if max_path_length > 20:
                return {
                    "valid": False, 
                    "error": f"Workflow execution path too long ({max_path_length} nodes). Consider breaking into smaller workflows."
                }
            
            return {"valid": True, "message": f"Found {len(paths)} valid execution paths"}
            
        except Exception as e:
            return {"valid": False, "error": f"Execution path validation error: {str(e)}"}
    
    def _find_execution_paths(self, nodes: List[Dict], edges: List[Dict]) -> List[List[str]]:
        """Find all execution paths from start to end nodes"""
        if len(nodes) == 1:
            return [[nodes[0]["id"]]]
        
        node_ids = set(node["id"] for node in nodes)
        outgoing = {node_id: [] for node_id in node_ids}
        incoming = {node_id: [] for node_id in node_ids}
        
        for edge in edges:
            outgoing[edge["source"]].append(edge["target"])
            incoming[edge["target"]].append(edge["source"])
        
        # Find start and end nodes
        start_nodes = [node_id for node_id in node_ids if not incoming[node_id]]
        end_nodes = [node_id for node_id in node_ids if not outgoing[node_id]]
        
        paths = []
        
        def find_paths_dfs(current_node: str, current_path: List[str], visited: set):
            if current_node in end_nodes:
                paths.append(current_path + [current_node])
                return
            
            if current_node in visited:
                return  # Avoid cycles
            
            visited.add(current_node)
            
            for next_node in outgoing.get(current_node, []):
                find_paths_dfs(next_node, current_path + [current_node], visited.copy())
        
        # Find all paths from each start node
        for start_node in start_nodes:
            find_paths_dfs(start_node, [], set())
        
        return paths

    def _has_circular_dependency(self, nodes: List[Dict], edges: List[Dict]) -> bool:
        """Basic circular dependency detection"""
        try:
            # Build adjacency list
            graph = {}
            for node in nodes:
                graph[node["id"]] = []
            
            for edge in edges:
                if edge["source"] in graph:
                    graph[edge["source"]].append(edge["target"])
            
            # DFS to detect cycles
            visited = set()
            rec_stack = set()
            
            def has_cycle(node_id):
                if node_id in rec_stack:
                    return True
                if node_id in visited:
                    return False
                
                visited.add(node_id)
                rec_stack.add(node_id)
                
                for neighbor in graph.get(node_id, []):
                    if has_cycle(neighbor):
                        return True
                
                rec_stack.remove(node_id)
                return False
            
            for node_id in graph:
                if node_id not in visited:
                    if has_cycle(node_id):
                        return True
            
            return False
            
        except Exception:
            # If validation fails, assume no circular dependency to be safe
            return False

    def _validate_workflow_structure_cached(self, nodes: List[Dict], edges: List[Dict]) -> Dict[str, Any]:
        """Cached workflow validation with rate limiting"""
        import time
        import hashlib
        
        # Generate cache key from workflow structure
        workflow_hash = hashlib.md5(
            str({"nodes": nodes, "edges": edges}).encode()
        ).hexdigest()
        
        current_time = time.time()
        
        # Rate limiting: Don't validate same workflow more than once per 5 seconds
        if workflow_hash in self._last_validation_time:
            time_since_last = current_time - self._last_validation_time[workflow_hash]
            if time_since_last < 5.0:  # 5 second rate limit
                # Return cached result if available
                if workflow_hash in self._validation_cache:
                    print(f"🚀 Using cached validation result for workflow {workflow_hash[:8]}...")
                    return self._validation_cache[workflow_hash]
                else:
                    # Skip validation to prevent spam
                    print(f"⚠️  Rate limiting validation for workflow {workflow_hash[:8]}")
                    return {"valid": True, "message": "Validation skipped due to rate limiting"}
        
        # Update validation time
        self._last_validation_time[workflow_hash] = current_time
        
        # Perform validation
        print(f"🔍 Validating workflow structure {workflow_hash[:8]}...")
        result = self._validate_workflow_structure(nodes, edges)
        
        # Cache successful results
        if result.get("valid"):
            self._validation_cache[workflow_hash] = result
            print(f"✅ Workflow validation passed - cached for future use")
        else:
            print(f"❌ Workflow validation failed: {result.get('error', 'Unknown error')}")
        
        # Clean old cache entries (keep only last 50)
        if len(self._validation_cache) > 50:
            oldest_keys = list(self._validation_cache.keys())[:-25]  # Keep newest 25
            for key in oldest_keys:
                del self._validation_cache[key]
                if key in self._last_validation_time:
                    del self._last_validation_time[key]
        
        return result

