"""
Multi-step Workflow Execution Engine
Executes workflows based on visual designer node graphs
"""

from typing import Dict, List, Any, Optional, Set, Tuple
from dataclasses import dataclass
from enum import Enum
import asyncio
import json
import time
from opentelemetry import trace
from opentelemetry.trace import Status, StatusCode
from any_agent import AnyAgent, AgentConfig, AgentFramework
from any_agent.tools import search_web


class NodeType(Enum):
    INPUT = "input"
    AGENT = "agent"  
    TOOL = "tool"
    OUTPUT = "output"
    DECISION = "decision"


class NodeStatus(Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"


@dataclass
class WorkflowNode:
    id: str
    type: NodeType
    data: Dict[str, Any]
    position: Dict[str, float]
    inputs: Dict[str, Any] = None
    outputs: Dict[str, Any] = None
    status: NodeStatus = NodeStatus.PENDING
    error: Optional[str] = None
    execution_time: Optional[float] = None

    def __post_init__(self):
        if self.inputs is None:
            self.inputs = {}
        if self.outputs is None:
            self.outputs = {}


@dataclass 
class WorkflowEdge:
    id: str
    source: str
    target: str
    source_output: str = "default"  # which output from source
    target_input: str = "default"   # which input to target


@dataclass
class WorkflowExecutionContext:
    """Maintains state during workflow execution"""
    workflow_id: str
    nodes: Dict[str, WorkflowNode]
    edges: List[WorkflowEdge]
    execution_order: List[str]
    completed_nodes: Set[str]
    failed_nodes: Set[str]
    node_outputs: Dict[str, Dict[str, Any]]  # node_id -> {output_name: value}
    initial_input: str
    framework: AgentFramework


class WorkflowExecutionEngine:
    """Orchestrates multi-step workflow execution"""
    
    def __init__(self):
        self.node_handlers = {
            NodeType.INPUT: self._handle_input_node,
            NodeType.AGENT: self._handle_agent_node,
            NodeType.TOOL: self._handle_tool_node,
            NodeType.OUTPUT: self._handle_output_node,
            NodeType.DECISION: self._handle_decision_node,
        }
        self.tracer = trace.get_tracer(__name__)
    
    async def execute_workflow(self, 
                             nodes: List[Dict], 
                             edges: List[Dict], 
                             input_data: str,
                             framework: str = "openai",
                             workflow_name: Optional[str] = None) -> Dict[str, Any]:
        """Execute a complete workflow"""
        
        # Convert to internal representation
        workflow_nodes = {
            node["id"]: WorkflowNode(
                id=node["id"],
                type=NodeType(node["type"]),
                data=node["data"],
                position=node["position"]
            ) for node in nodes
        }
        
        workflow_edges = [
            WorkflowEdge(
                id=edge["id"],
                source=edge["source"], 
                target=edge["target"]
            ) for edge in edges
        ]
        
        # Create execution context
        context = WorkflowExecutionContext(
            workflow_id=f"workflow_{len(workflow_nodes)}",
            nodes=workflow_nodes,
            edges=workflow_edges,
            execution_order=[],
            completed_nodes=set(),
            failed_nodes=set(),
            node_outputs={},
            initial_input=input_data,
            framework=AgentFramework.from_string(framework.upper())
        )
        
        # Derive workflow name if not provided
        if not workflow_name:
            # Try to get name from first agent node or use generic name
            agent_nodes = [n for n in workflow_nodes.values() if n.type == NodeType.AGENT]
            if agent_nodes:
                workflow_name = agent_nodes[0].data.get("label", f"Workflow {context.workflow_id}")
            else:
                workflow_name = f"Workflow {context.workflow_id}"
        
        # Start root workflow span
        with self.tracer.start_as_current_span(
            f"Workflow: {workflow_name}",
            attributes={
                "workflow.id": context.workflow_id,
                "workflow.name": workflow_name,
                "workflow.node_count": len(workflow_nodes),
                "workflow.edge_count": len(workflow_edges),
                "workflow.framework": framework,
                "workflow.input_length": len(input_data)
            }
        ) as workflow_span:
            try:
                # Plan execution order (topological sort)
                execution_order = self._plan_execution_order(context)
                context.execution_order = execution_order
                workflow_span.set_attribute("workflow.execution_order", ",".join(execution_order))
                
                # Execute nodes in order
                final_outputs = {}
                execution_trace = []
                
                for node_id in execution_order:
                    node = context.nodes[node_id]
                    
                    try:
                        # Prepare inputs for this node
                        inputs = self._prepare_node_inputs(node_id, context)
                        node.inputs = inputs
                        node.status = NodeStatus.RUNNING
                        
                        # Execute the node
                        start_time = time.time()
                        
                        outputs = await self._execute_node_with_span(node, context)
                        
                        end_time = time.time()
                        node.execution_time = end_time - start_time
                        
                        # Store outputs
                        node.outputs = outputs
                        context.node_outputs[node_id] = outputs
                        node.status = NodeStatus.COMPLETED
                        context.completed_nodes.add(node_id)
                        
                        # Add to trace
                        execution_trace.append({
                            "node_id": node_id,
                            "node_type": node.type.value,
                            "node_name": node.data.get("label", node_id),
                            "inputs": inputs,
                            "outputs": outputs,
                            "execution_time": node.execution_time,
                            "status": "completed"
                        })
                        
                        # Collect final outputs from output nodes
                        if node.type == NodeType.OUTPUT:
                            final_outputs[node_id] = outputs
                            
                    except Exception as e:
                        node.status = NodeStatus.FAILED
                        node.error = str(e)
                        context.failed_nodes.add(node_id)
                        
                        execution_trace.append({
                            "node_id": node_id,
                            "node_type": node.type.value,
                            "node_name": node.data.get("label", node_id),
                            "inputs": node.inputs,
                            "outputs": None,
                            "execution_time": node.execution_time,
                            "status": "failed",
                            "error": str(e)
                        })
                        
                        # For now, stop on first failure (could implement retry logic)
                        break
                
                # Set workflow span status based on execution result
                if context.failed_nodes:
                    workflow_span.set_status(Status(StatusCode.ERROR, "Workflow execution failed"))
                    workflow_span.set_attribute("workflow.failed_nodes", len(context.failed_nodes))
                else:
                    workflow_span.set_status(Status(StatusCode.OK))
                
                workflow_span.set_attribute("workflow.completed_nodes", len(context.completed_nodes))
                workflow_span.set_attribute("workflow.total_execution_time", 
                                          sum(node.execution_time or 0 for node in context.nodes.values()))
                
                # Determine final result
                if final_outputs:
                    # Use output from output nodes
                    final_result = "\n\n".join([
                        f"**{context.nodes[node_id].data.get('label', node_id)}:**\n{outputs.get('result', outputs)}"
                        for node_id, outputs in final_outputs.items()
                    ])
                else:
                    # Use output from last completed node
                    last_completed = None
                    for node_id in reversed(execution_order):
                        if node_id in context.completed_nodes:
                            last_completed = node_id
                            break
                    
                    if last_completed:
                        final_result = context.node_outputs[last_completed].get('result', 
                                      str(context.node_outputs[last_completed]))
                    else:
                        final_result = "Workflow execution failed - no nodes completed successfully"
                
                return {
                    "final_output": final_result,
                    "execution_trace": execution_trace,
                    "workflow_status": "completed" if not context.failed_nodes else "failed",
                    "nodes_completed": len(context.completed_nodes),
                    "nodes_failed": len(context.failed_nodes),
                    "total_nodes": len(workflow_nodes)
                }
                
            except Exception as e:
                workflow_span.set_status(Status(StatusCode.ERROR, str(e)))
                workflow_span.record_exception(e)
                raise
    
    def _plan_execution_order(self, context: WorkflowExecutionContext) -> List[str]:
        """Determine execution order using topological sort"""
        
        # Build adjacency lists
        dependencies = {node_id: set() for node_id in context.nodes.keys()}
        dependents = {node_id: set() for node_id in context.nodes.keys()}
        
        for edge in context.edges:
            dependencies[edge.target].add(edge.source)
            dependents[edge.source].add(edge.target)
        
        # Find starting nodes (no dependencies, or input nodes)
        start_nodes = []
        for node_id, node in context.nodes.items():
            if node.type == NodeType.INPUT or len(dependencies[node_id]) == 0:
                start_nodes.append(node_id)
        
        # Topological sort
        execution_order = []
        remaining_dependencies = {k: v.copy() for k, v in dependencies.items()}
        
        queue = start_nodes.copy()
        
        while queue:
            current = queue.pop(0)
            execution_order.append(current)
            
            # Update dependencies for dependent nodes
            for dependent in dependents[current]:
                remaining_dependencies[dependent].discard(current)
                if len(remaining_dependencies[dependent]) == 0:
                    queue.append(dependent)
        
        return execution_order
    
    def _prepare_node_inputs(self, node_id: str, context: WorkflowExecutionContext) -> Dict[str, Any]:
        """Prepare inputs for a node from upstream node outputs"""
        
        inputs = {}
        
        # Find incoming edges to this node
        incoming_edges = [edge for edge in context.edges if edge.target == node_id]
        
        if not incoming_edges:
            # No incoming edges - this might be a start node
            node = context.nodes[node_id]
            if node.type == NodeType.INPUT:
                inputs["data"] = context.initial_input
            else:
                inputs["prompt"] = context.initial_input
        else:
            # Collect inputs from source nodes
            collected_inputs = []
            for edge in incoming_edges:
                source_outputs = context.node_outputs.get(edge.source, {})
                output_value = source_outputs.get(edge.source_output, 
                              source_outputs.get("result",
                              source_outputs.get("default", "")))
                collected_inputs.append(str(output_value))
            
            # Combine inputs (could be more sophisticated)
            if len(collected_inputs) == 1:
                inputs["prompt"] = collected_inputs[0]
            else:
                inputs["prompt"] = "\n\n".join([
                    f"Input {i+1}:\n{input_val}" 
                    for i, input_val in enumerate(collected_inputs)
                ])
        
        return inputs
    
    async def _execute_node_with_span(self, node: WorkflowNode, context: WorkflowExecutionContext) -> Dict[str, Any]:
        """Execute a node within its own span"""
        node_name = node.data.get("label", node.id)
        span_name = f"Node: {node_name}"
        
        with self.tracer.start_as_current_span(
            span_name,
            attributes={
                "node.id": node.id,
                "node.type": node.type.value,
                "node.name": node_name,
                "workflow.id": context.workflow_id,
                "node.position.x": node.position.get("x", 0),
                "node.position.y": node.position.get("y", 0)
            }
        ) as span:
            try:
                # Add input information to span
                if node.inputs:
                    span.add_event("node.input", {"data": str(node.inputs)[:1000]})  # Truncate large inputs
                
                # Execute the appropriate handler
                result = await self.node_handlers[node.type](node, context)
                
                # Add output information to span
                if result:
                    span.add_event("node.output", {"data": str(result)[:1000]})  # Truncate large outputs
                    span.set_attribute("node.output_size", len(str(result)))
                
                # Set node-specific attributes based on type
                if node.type == NodeType.AGENT:
                    span.set_attribute("node.model_id", node.data.get("model_id", "unknown"))
                    span.set_attribute("node.agent_name", node.data.get("name", "unnamed"))
                elif node.type == NodeType.DECISION:
                    # Track which branch was taken (to be implemented in decision logic)
                    span.set_attribute("node.decision.condition", node.data.get("condition", "unknown"))
                elif node.type == NodeType.TOOL:
                    span.set_attribute("node.tool_type", node.data.get("tool_type", "unknown"))
                
                span.set_status(Status(StatusCode.OK))
                return result
                
            except Exception as e:
                span.set_status(Status(StatusCode.ERROR, str(e)))
                span.record_exception(e)
                raise
    
    async def _handle_input_node(self, node: WorkflowNode, context: WorkflowExecutionContext) -> Dict[str, Any]:
        """Handle input node - just passes through the initial input"""
        return {
            "result": node.inputs.get("data", context.initial_input),
            "default": node.inputs.get("data", context.initial_input)
        }
    
    async def _handle_agent_node(self, node: WorkflowNode, context: WorkflowExecutionContext) -> Dict[str, Any]:
        """Handle agent node - execute LLM with specific configuration"""
        
        # Get agent configuration from node data
        model_id = node.data.get("model_id", "gpt-3.5-turbo")
        instructions = node.data.get("instructions", "You are a helpful assistant.")
        agent_name = node.data.get("name", node.data.get("label", "Agent"))
        
        # Get input prompt
        prompt = node.inputs.get("prompt", context.initial_input)
        
        # Create agent config
        agent_config = AgentConfig(
            model_id=model_id,
            instructions=instructions,
            name=agent_name,
            tools=[]  # TODO: Add tools based on node configuration
        )
        
        # Execute agent in thread pool (same as before to avoid event loop conflicts)
        def run_agent():
            import asyncio
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            
            try:
                agent = AnyAgent.create(
                    agent_framework=context.framework,
                    agent_config=agent_config
                )
                
                result = agent.run(prompt=prompt)
                agent.exit()
                
                return str(result.final_output) if hasattr(result, 'final_output') else str(result)
            finally:
                loop.close()
        
        import concurrent.futures
        with concurrent.futures.ThreadPoolExecutor() as executor:
            future = executor.submit(run_agent)
            result = future.result(timeout=60)  # 60 second timeout
        
        return {
            "result": result,
            "default": result
        }
    
    async def _handle_tool_node(self, node: WorkflowNode, context: WorkflowExecutionContext) -> Dict[str, Any]:
        """Handle tool node - execute specific tools"""
        
        tool_type = node.data.get("tool_type", "web_search")
        query = node.inputs.get("prompt", "")
        
        if tool_type == "web_search" or "search" in node.data.get("label", "").lower():
            # Execute web search
            search_result = search_web(query)
            return {
                "result": search_result,
                "default": search_result
            }
        else:
            # Unknown tool type
            return {
                "result": f"Tool '{tool_type}' not implemented",
                "default": f"Tool '{tool_type}' not implemented"
            }
    
    async def _handle_output_node(self, node: WorkflowNode, context: WorkflowExecutionContext) -> Dict[str, Any]:
        """Handle output node - format final output"""
        
        input_data = node.inputs.get("prompt", "")
        output_format = node.data.get("format", "text")
        
        # Apply any output formatting
        if output_format == "json":
            try:
                formatted_output = json.dumps({"result": input_data}, indent=2)
            except:
                formatted_output = input_data
        else:
            formatted_output = input_data
        
        return {
            "result": formatted_output,
            "default": formatted_output
        }
    
    async def _handle_decision_node(self, node: WorkflowNode, context: WorkflowExecutionContext) -> Dict[str, Any]:
        """Handle decision node - branch based on conditions"""
        
        # TODO: Implement decision logic
        # For now, just pass through
        input_data = node.inputs.get("prompt", "")
        return {
            "result": input_data,
            "default": input_data
        } 