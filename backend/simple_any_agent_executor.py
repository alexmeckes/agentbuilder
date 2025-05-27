"""
Simplified Workflow Executor using only any-agent's built-in multi-agent capabilities
This approach eliminates custom orchestration but loses some visual workflow features.
"""

import time
from typing import Dict, List, Any
from any_agent import AnyAgent, AgentConfig, AgentFramework
from any_agent.tools import search_web


class SimpleAnyAgentExecutor:
    """Execute workflows using only any-agent's native multi-agent capabilities"""
    
    def __init__(self):
        self.executions: Dict[str, Dict[str, Any]] = {}
    
    async def execute_workflow(self, 
                             nodes: List[Dict], 
                             edges: List[Dict], 
                             input_data: str,
                             framework: str = "openai") -> Dict[str, Any]:
        """Convert visual workflow to any-agent multi-agent system"""
        
        execution_id = f"exec_{len(self.executions) + 1}"
        start_time = time.time()
        
        try:
            # Extract main agent and managed agents from visual workflow
            main_agent_config, managed_agents_configs = self._convert_workflow_to_agents(nodes)
            
            # Create the any-agent multi-agent system
            agent = AnyAgent.create(
                agent_framework=framework,
                agent_config=main_agent_config,
                managed_agents=managed_agents_configs
            )
            
            # Execute using any-agent's built-in orchestration
            result = agent.run(prompt=input_data)
            agent.exit()
            
            # Store execution results
            completion_time = time.time()
            execution_duration = completion_time - start_time
            
            self.executions[execution_id] = {
                "status": "completed",
                "input": input_data,
                "result": str(result.final_output),
                "created_at": start_time,
                "completed_at": completion_time,
                "duration": execution_duration,
                "framework": framework,
                "nodes_count": len(nodes),
                "agent_trace": result
            }
            
            return {
                "execution_id": execution_id,
                "status": "completed", 
                "result": str(result.final_output),
                "trace": {
                    "final_output": str(result.final_output),
                    "execution_duration": execution_duration,
                    "framework_used": framework,
                    "agents_involved": len(managed_agents_configs) + 1,
                    "native_any_agent": True
                }
            }
            
        except Exception as e:
            self.executions[execution_id] = {
                "status": "failed",
                "error": str(e),
                "input": input_data,
                "created_at": start_time,
                "framework": framework
            }
            
            return {
                "execution_id": execution_id,
                "status": "failed",
                "error": str(e)
            }
    
    def _convert_workflow_to_agents(self, nodes: List[Dict]) -> tuple[AgentConfig, List[AgentConfig]]:
        """Convert visual workflow nodes to any-agent configurations"""
        
        agent_nodes = [node for node in nodes if node.get("type") == "agent"]
        
        if not agent_nodes:
            # Create a default agent if no agent nodes
            main_agent = AgentConfig(
                name="WorkflowAgent",
                instructions="Process the given input and provide a helpful response.",
                model_id="gpt-3.5-turbo",
                tools=[search_web]
            )
            return main_agent, []
        
        # Use first agent as main, rest as managed agents
        main_node = agent_nodes[0]
        managed_nodes = agent_nodes[1:]
        
        # Configure main agent
        main_agent = AgentConfig(
            name=main_node["data"].get("name", main_node["data"].get("label", "MainAgent")),
            instructions=self._build_main_instructions(main_node, managed_nodes),
            model_id=main_node["data"].get("model_id", "gpt-3.5-turbo"),
            tools=[search_web]  # Add tools as needed
        )
        
        # Configure managed agents
        managed_agents = []
        for i, node in enumerate(managed_nodes):
            managed_agent = AgentConfig(
                name=node["data"].get("name", node["data"].get("label", f"Agent{i+2}")),
                description=f"Specialized agent: {node['data'].get('label', f'Agent {i+2}')}",
                instructions=node["data"].get("instructions", "You are a helpful specialized agent."),
                model_id=node["data"].get("model_id", "gpt-3.5-turbo"),
                tools=[search_web]
            )
            managed_agents.append(managed_agent)
        
        return main_agent, managed_agents
    
    def _build_main_instructions(self, main_node: Dict, managed_nodes: List[Dict]) -> str:
        """Build instructions for main agent to orchestrate managed agents"""
        
        base_instructions = main_node["data"].get("instructions", 
            "You are the main orchestrator agent.")
        
        if not managed_nodes:
            return base_instructions
        
        # Add instructions about available managed agents
        agent_descriptions = []
        for node in managed_nodes:
            name = node["data"].get("name", node["data"].get("label", "Unnamed Agent"))
            desc = node["data"].get("instructions", "A specialized agent")
            agent_descriptions.append(f"- {name}: {desc}")
        
        orchestration_instructions = f"""
{base_instructions}

You have access to the following specialized agents:
{chr(10).join(agent_descriptions)}

Use these agents when their specializations would be helpful for the task. 
Coordinate their work and synthesize their outputs into a comprehensive response.
"""
        
        return orchestration_instructions 