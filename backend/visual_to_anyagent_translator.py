"""
Visual Workflow to any-agent Multi-Agent Translator

Converts visual workflow definitions from the frontend into any-agent's
native multi-agent orchestration format.
"""

import sys
from typing import Dict, List, Any, Optional
from dataclasses import dataclass
from any_agent import AgentConfig, AgentFramework, AnyAgent, TracingConfig
import multiprocessing
import json
import traceback
import os
import logging

# Import MCP manager (with fallback for backwards compatibility)
try:
    from mcp_manager import get_mcp_manager, is_mcp_enabled
    MCP_INTEGRATION_AVAILABLE = True
except ImportError:
    logging.warning("MCP integration not available")
    MCP_INTEGRATION_AVAILABLE = False
    
    # Fallback functions
    def get_mcp_manager():
        return None
    
    def is_mcp_enabled():
        return False

# Import REAL any-agent tools
try:
    from any_agent.tools import search_web as real_search_web, visit_webpage as real_visit_webpage
    # Use real tools when available
    search_web = real_search_web
    visit_webpage = real_visit_webpage
    print("✅ Using REAL any-agent web search tools")
    logging.info("✅ Production: REAL web search tools loaded successfully")
except ImportError:
    # Fallback to mock functions for backwards compatibility
    def search_web(query: str):
        result = f"Mock search results for: {query}"
        logging.warning(f"⚠️  MOCK SEARCH executed for query: {query}")
        return result

    def visit_webpage(url: str):
        result = f"Mock webpage content for: {url}"
        logging.warning(f"⚠️  MOCK WEBPAGE visit for URL: {url}")
        return result
    print("⚠️  Using MOCK web search tools (any-agent not available)")
    logging.warning("⚠️  Production: MOCK web search tools in use (real tools not available)")

@dataclass
class VisualWorkflowNode:
    """Represents a node in the visual workflow"""
    id: str
    type: str  # 'agent', 'tool', 'input', 'output'
    data: Dict[str, Any]
    position: Dict[str, float]


@dataclass 
class VisualWorkflowEdge:
    """Represents a connection in the visual workflow"""
    id: str
    source: str
    target: str


class VisualToAnyAgentTranslator:
    """Translates visual workflows to any-agent multi-agent configurations"""
    
    def __init__(self):
        # Initialize with existing tools (backwards compatible)
        self.available_tools = {
            "search_web": search_web,
            "visit_webpage": visit_webpage,
            # Add aliases for frontend compatibility
            "web_search": search_web,  # Frontend alias for search_web
            "WebSearch": search_web,   # UI display name alias
            "webpage_visit": visit_webpage,  # Alternative naming
            "visit_page": visit_webpage,     # Alternative naming
        }
        
        # Add Composio tools for workflow execution
        self._add_composio_tools()
        
        # Add MCP tools if available and enabled
        self._update_available_tools()
    
    def _add_composio_tools(self):
        """Add Composio tools to available_tools for workflow execution"""
        try:
            # Import our Composio bridge for per-user execution
            from composio_mcp_bridge import UserComposioManager, UserContext
            
            # Create placeholder functions for each Composio tool that will be executed with user context
            composio_tools = {
                "composio_github_star_repo": self._create_composio_tool_wrapper("github_star_repo"),
                "composio_github_create_issue": self._create_composio_tool_wrapper("github_create_issue"),
                "composio_slack_send_message": self._create_composio_tool_wrapper("slack_send_message"),
                "composio_gmail_send_email": self._create_composio_tool_wrapper("gmail_send_email"),
                "composio_googledocs_create_doc": self._create_composio_tool_wrapper("googledocs_create_doc"),
                "composio_googlesheets_create_sheet": self._create_composio_tool_wrapper("googlesheets_create_sheet"),
                "composio_googledrive_upload": self._create_composio_tool_wrapper("googledrive_upload"),
                "composio_googlecalendar_create_event": self._create_composio_tool_wrapper("googlecalendar_create_event"),
                "composio_notion_create_page": self._create_composio_tool_wrapper("notion_create_page"),
                "composio_linear_create_issue": self._create_composio_tool_wrapper("linear_create_issue"),
                "composio_trello_create_card": self._create_composio_tool_wrapper("trello_create_card"),
                "composio_airtable_create_record": self._create_composio_tool_wrapper("airtable_create_record"),
                "composio_jira_create_issue": self._create_composio_tool_wrapper("jira_create_issue")
            }
            
            self.available_tools.update(composio_tools)
            logging.info(f"✅ Added {len(composio_tools)} Composio tools for workflow execution")
            
        except ImportError as e:
            logging.warning(f"⚠️  Composio integration not available for workflow execution: {e}")
    
    def _create_composio_tool_wrapper(self, tool_name: str):
        """Create a wrapper function for a Composio tool that can be used in workflows"""
        
        def composio_tool_wrapper(input_text: str = "", title: str = "", content: str = "", **kwargs: Any) -> str:
            """Wrapper that executes Composio tool with user context during workflow execution"""
            try:
                # Import here to avoid circular imports
                from composio_mcp_bridge import UserComposioManager, UserContext
                import asyncio
                import os
                
                # Extract parameters from input_text and specific parameters
                params = {}
                if input_text:
                    params["input"] = input_text
                if title:
                    params["title"] = title
                if content:
                    params["content"] = content
                # Add any additional kwargs
                params.update(kwargs)
                
                # Get user context from environment (set by MCP server config)
                api_key = os.getenv('COMPOSIO_API_KEY', '')
                user_id = os.getenv('USER_ID', 'default_user')
                enabled_tools_str = os.getenv('ENABLED_TOOLS', '')
                
                # Parse enabled tools
                enabled_tools = []
                if enabled_tools_str:
                    enabled_tools = [tool.strip() for tool in enabled_tools_str.split(',') if tool.strip()]
                
                # Check if we have a valid API key
                if not api_key:
                    return f"❌ No Composio API key configured. Please set your API key in user settings to enable real {tool_name} execution."
                
                # Create user context
                user_context = UserContext(
                    user_id=user_id,
                    api_key=api_key,
                    enabled_tools=enabled_tools if enabled_tools else None,
                    preferences={}
                )
                
                # Execute the tool for real using the UserComposioManager
                manager = UserComposioManager()
                
                # Run the async execution in the current event loop or create a new one
                try:
                    # Try to get the current event loop
                    loop = asyncio.get_event_loop()
                    if loop.is_running():
                        # If we're already in an async context, create a new event loop in a thread
                        import concurrent.futures
                        import threading
                        
                        def run_in_new_loop():
                            new_loop = asyncio.new_event_loop()
                            asyncio.set_event_loop(new_loop)
                            try:
                                return new_loop.run_until_complete(
                                    manager.execute_tool_for_user(tool_name, params, user_context)
                                )
                            finally:
                                new_loop.close()
                        
                        with concurrent.futures.ThreadPoolExecutor() as executor:
                            future = executor.submit(run_in_new_loop)
                            result = future.result(timeout=30)  # 30 second timeout
                    else:
                        # We can run directly in the current loop
                        result = loop.run_until_complete(
                            manager.execute_tool_for_user(tool_name, params, user_context)
                        )
                except RuntimeError:
                    # No event loop, create one
                    result = asyncio.run(
                        manager.execute_tool_for_user(tool_name, params, user_context)
                    )
                
                # Format the result for the workflow
                if result.get("success"):
                    success_msg = f"✅ Successfully executed {tool_name}"
                    if "result" in result:
                        success_msg += f"\n\nResult: {result['result']}"
                    logging.info(f"🎯 Composio tool executed successfully: {tool_name} for user {user_context.user_id}")
                    return success_msg
                elif "mock_result" in result:
                    # This is a mock execution (no real API key or connection)
                    mock_msg = f"🔧 Mock execution of {tool_name}: {result['mock_result']}"
                    if "message" in result:
                        mock_msg += f"\n💡 {result['message']}"
                    logging.info(f"🔧 Composio tool mock execution: {tool_name}")
                    return mock_msg
                else:
                    # Real execution failed
                    error_msg = f"❌ Failed to execute {tool_name}: {result.get('error', 'Unknown error')}"
                    if "message" in result:
                        error_msg += f"\n💡 {result['message']}"
                    logging.error(f"❌ Composio tool execution failed: {tool_name} - {result.get('error')}")
                    return error_msg
                
            except Exception as e:
                error_msg = f"❌ Error executing Composio tool {tool_name}: {str(e)}"
                logging.error(error_msg)
                return error_msg
        
        # Set function metadata for debugging
        composio_tool_wrapper.__name__ = f"composio_{tool_name}"
        composio_tool_wrapper.__doc__ = f"Composio {tool_name} integration - executes real actions"
        
        return composio_tool_wrapper
    
    def _update_available_tools(self):
        """Safely add MCP tools to existing tool set"""
        if not is_mcp_enabled() or not MCP_INTEGRATION_AVAILABLE:
            logging.debug("MCP tools not enabled or not available")
            return
        
        try:
            mcp_manager = get_mcp_manager()
            if mcp_manager:
                mcp_tools = mcp_manager.get_available_tools()
                self.available_tools.update(mcp_tools)
                logging.info(f"Added {len(mcp_tools)} MCP tools to available tools")
        except Exception as e:
            logging.warning(f"Failed to load MCP tools, continuing with built-in tools only: {e}")
    
    def get_available_tool_info(self) -> Dict[str, Dict[str, Any]]:
        """Get information about all available tools for UI display"""
        tool_info = {}
        
        # Built-in tools
        built_in_tools = {
            "search_web": {"type": "built-in", "description": "Search the web", "category": "web"},
            "visit_webpage": {"type": "built-in", "description": "Visit and read webpage content", "category": "web"}
        }
        tool_info.update(built_in_tools)
        
        # MCP tools (if available)
        if is_mcp_enabled() and MCP_INTEGRATION_AVAILABLE:
            try:
                mcp_manager = get_mcp_manager()
                if mcp_manager:
                    server_status = mcp_manager.get_server_status()
                    for server_id, status in server_status.items():
                        for capability in status.get('capabilities', []):
                            tool_key = f"mcp_{server_id}_{capability}"
                            tool_info[tool_key] = {
                                "type": "mcp",
                                "description": f"{capability} (via {status['name']})",
                                "category": "integration",
                                "server_id": server_id,
                                "server_name": status['name'],
                                "server_status": status['status']
                            }
            except Exception as e:
                logging.warning(f"Failed to get MCP tool info: {e}")
        
        return tool_info
    
    def translate_workflow(self, 
                          nodes: List[Dict], 
                          edges: List[Dict],
                          framework: str = "openai") -> tuple[AgentConfig, List[AgentConfig]]:
        """
        Convert visual workflow to any-agent configuration
        
        Returns:
            tuple: (main_agent_config, managed_agents_configs)
        """
        
        # Parse visual nodes
        visual_nodes = [
            VisualWorkflowNode(
                id=node["id"],
                type=node["type"], 
                data=node["data"],
                position=node["position"]
            ) for node in nodes
        ]
        
        visual_edges = [
            VisualWorkflowEdge(
                id=edge["id"],
                source=edge["source"],
                target=edge["target"]
            ) for edge in edges
        ]
        
        # Separate agent nodes and other types
        # CRITICAL FIX: Check data.type for Composio tools, not just node.type
        agent_nodes = []
        tool_nodes = []
        input_nodes = []
        output_nodes = []
        
        for node in visual_nodes:
            # Check if it's a Composio tool by looking at data.type
            if node.data.get("type", "").startswith("composio-"):
                tool_nodes.append(node)
                logging.info(f"🔧 CLASSIFICATION: Node {node.id} classified as TOOL (Composio: {node.data.get('type')})")
            elif node.type == "agent":
                agent_nodes.append(node)
                logging.info(f"🔧 CLASSIFICATION: Node {node.id} classified as AGENT")
            elif node.type == "tool":
                tool_nodes.append(node)
                logging.info(f"🔧 CLASSIFICATION: Node {node.id} classified as TOOL (regular)")
            elif node.type == "input":
                input_nodes.append(node)
                logging.info(f"🔧 CLASSIFICATION: Node {node.id} classified as INPUT")
            elif node.type == "output":
                output_nodes.append(node)
                logging.info(f"🔧 CLASSIFICATION: Node {node.id} classified as OUTPUT")
        
        logging.info(f"🔧 CLASSIFICATION SUMMARY: {len(agent_nodes)} agents, {len(tool_nodes)} tools, {len(input_nodes)} inputs, {len(output_nodes)} outputs")
        
        if not agent_nodes:
            raise ValueError("Workflow must contain at least one agent node")
        
        # Determine workflow execution pattern
        execution_pattern = self._analyze_workflow_pattern(visual_nodes, visual_edges)
        
        if execution_pattern == "sequential":
            return self._create_sequential_multi_agent(agent_nodes, tool_nodes, framework)
        elif execution_pattern == "collaborative":
            return self._create_collaborative_multi_agent(agent_nodes, tool_nodes, framework)
        else:
            return self._create_simple_multi_agent(agent_nodes, tool_nodes, framework)
    
    def _analyze_workflow_pattern(self, nodes: List[VisualWorkflowNode], 
                                 edges: List[VisualWorkflowEdge]) -> str:
        """Analyze the workflow to determine execution pattern"""
        
        agent_nodes = [node for node in nodes if node.type == "agent"]
        
        if len(agent_nodes) == 1:
            return "single"
        
        # Check if agents are connected sequentially
        agent_connections = 0
        for edge in edges:
            source_node = next((n for n in nodes if n.id == edge.source), None)
            target_node = next((n for n in nodes if n.id == edge.target), None)
            
            if (source_node and target_node and 
                source_node.type == "agent" and target_node.type == "agent"):
                agent_connections += 1
        
        if agent_connections > 0:
            return "sequential"
        else:
            return "collaborative"
    
    def _create_sequential_multi_agent(self, agent_nodes: List[VisualWorkflowNode], 
                                     tool_nodes: List[VisualWorkflowNode],
                                     framework: str) -> tuple[AgentConfig, List[AgentConfig]]:
        """Create sequential handoff-based multi-agent system"""
        
        # First agent becomes the main orchestrator
        main_agent_node = agent_nodes[0]
        managed_agent_nodes = agent_nodes[1:]
        
        # Collect all available tools
        available_tools = []
        for tool_node in tool_nodes:
            tool_type = tool_node.data.get("type", "search_web")
            
            # Handle Composio tool naming conversion (hyphens to underscores)
            normalized_type = tool_type.replace("-", "_")
            
            if normalized_type in self.available_tools:
                available_tools.append(self.available_tools[normalized_type])
                logging.info(f"🔧 SEQUENTIAL: Added tool '{normalized_type}' (from '{tool_type}')")
            elif tool_type in self.available_tools:
                available_tools.append(self.available_tools[tool_type])
                logging.info(f"🔧 SEQUENTIAL: Added tool '{tool_type}' (exact match)")
        
        # Create managed agents (specialized agents)
        managed_agents = []
        for i, agent_node in enumerate(managed_agent_nodes):
            managed_agent = AgentConfig(
                name=agent_node.data.get("name", f"specialist_agent_{i}"),
                model_id=agent_node.data.get("model_id", "gpt-4.1-nano"),
                instructions=agent_node.data.get("instructions", 
                    f"You are a specialist agent. {agent_node.data.get('label', '')}"),
                description=agent_node.data.get("description", 
                    f"Specialist agent: {agent_node.data.get('label', 'Agent')}"),
                tools=available_tools,  # Give all agents access to tools
                agent_args={"handoff": True} if framework == "openai" else None
            )
            managed_agents.append(managed_agent)
        
        # Create main orchestrator agent
        main_agent = AgentConfig(
            name=main_agent_node.data.get("name", "orchestrator"),
            model_id=main_agent_node.data.get("model_id", "gpt-4.1-mini"),
            instructions=(
                main_agent_node.data.get("instructions", "") + 
                "\n\nYou are the main orchestrator. You can hand off tasks to specialist agents "
                "and coordinate their work to complete complex tasks. Use the available agents "
                "strategically and combine their outputs to provide comprehensive results."
            ),
            description="Main orchestrator agent",
            tools=available_tools if not managed_agents else []  # Tools or agents, not both for main
        )
        
        return main_agent, managed_agents
    
    def _create_collaborative_multi_agent(self, agent_nodes: List[VisualWorkflowNode],
                                        tool_nodes: List[VisualWorkflowNode], 
                                        framework: str) -> tuple[AgentConfig, List[AgentConfig]]:
        """Create collaborative multi-agent system where agents work together"""
        
        # First agent becomes coordinator
        main_agent_node = agent_nodes[0]
        specialist_nodes = agent_nodes[1:]
        
        # Collect tools
        available_tools = []
        for tool_node in tool_nodes:
            tool_type = tool_node.data.get("type", "search_web")
            
            # Handle Composio tool naming conversion (hyphens to underscores)
            normalized_type = tool_type.replace("-", "_")
            
            if normalized_type in self.available_tools:
                available_tools.append(self.available_tools[normalized_type])
                logging.info(f"🔧 COLLABORATIVE: Added tool '{normalized_type}' (from '{tool_type}')")
            elif tool_type in self.available_tools:
                available_tools.append(self.available_tools[tool_type])
                logging.info(f"🔧 COLLABORATIVE: Added tool '{tool_type}' (exact match)")
        
        # Create specialist agents
        managed_agents = []
        for i, agent_node in enumerate(specialist_nodes):
            # Assign specific tools to specific agents based on their purpose
            agent_tools = self._assign_tools_to_agent(agent_node, available_tools)
            
            managed_agent = AgentConfig(
                name=agent_node.data.get("name", f"specialist_{i}"),
                model_id=agent_node.data.get("model_id", "gpt-4.1-nano"),
                instructions=agent_node.data.get("instructions",
                    f"You are a specialist. {agent_node.data.get('label', '')}"),
                description=agent_node.data.get("description",
                    f"Specialist: {agent_node.data.get('label', 'Agent')}"),
                tools=agent_tools
            )
            managed_agents.append(managed_agent)
        
        # Create main coordinator
        main_agent = AgentConfig(
            name=main_agent_node.data.get("name", "coordinator"),
            model_id=main_agent_node.data.get("model_id", "gpt-4.1-mini"), 
            instructions=(
                main_agent_node.data.get("instructions", "") +
                "\n\nYou are the coordinator. You can delegate tasks to specialist agents "
                "and integrate their work. Collaborate with the available agents to solve "
                "complex problems efficiently."
            ),
            description="Main coordinator agent"
        )
        
        return main_agent, managed_agents
    
    def _create_simple_multi_agent(self, agent_nodes: List[VisualWorkflowNode],
                                 tool_nodes: List[VisualWorkflowNode],
                                 framework: str) -> tuple[AgentConfig, List[AgentConfig]]:
        """Create simple multi-agent system (fallback)"""
        
        main_agent_node = agent_nodes[0]
        
        # CRITICAL DEBUG: Log visual workflow analysis
        logging.info(f"🔧 TRANSLATION: Processing {len(tool_nodes)} tool nodes from visual workflow")
        for i, tool_node in enumerate(tool_nodes):
            tool_type = tool_node.data.get("type", "search_web")
            logging.info(f"🔧 TRANSLATION: Tool node {i+1}: id={tool_node.id}, type={tool_type}, name={tool_node.data.get('name', 'unnamed')}")
            logging.info(f"🔧 TRANSLATION: Tool node {i+1} FULL DATA: {tool_node.data}")
        
        # Collect tools
        available_tools = []
        for tool_node in tool_nodes:
            tool_type = tool_node.data.get("type", "search_web")
            
            # ENHANCED DEBUG: Check multiple possible field names for tool type
            possible_tool_types = [
                tool_node.data.get("type"),
                tool_node.data.get("tool_type"), 
                tool_node.data.get("toolType"),
                tool_node.data.get("selectedTool"),
                tool_node.data.get("tool"),
                tool_node.data.get("name")
            ]
            logging.info(f"🔧 TRANSLATION: Tool node possible types: {possible_tool_types}")
            
            # Try to find the actual tool type from various fields
            actual_tool_type = None
            for possible_type in possible_tool_types:
                if possible_type:
                    # CRITICAL FIX: Handle Composio tool naming conversion
                    # Convert "composio-googledocs_create_doc" to "composio_googledocs_create_doc"
                    normalized_type = possible_type.replace("-", "_")
                    
                    if normalized_type in self.available_tools:
                        actual_tool_type = normalized_type
                        logging.info(f"🔧 TRANSLATION: Found matching tool type '{actual_tool_type}' (normalized from '{possible_type}')")
                        break
                    elif possible_type in self.available_tools:
                        actual_tool_type = possible_type
                        logging.info(f"🔧 TRANSLATION: Found matching tool type '{actual_tool_type}' (exact match)")
                        break
            
            if actual_tool_type:
                tool_function = self.available_tools[actual_tool_type]
                available_tools.append(tool_function)
                logging.info(f"🔧 TRANSLATION: ✅ Added tool '{actual_tool_type}': {tool_function.__name__ if hasattr(tool_function, '__name__') else str(tool_function)}")
            else:
                logging.warning(f"🔧 TRANSLATION: ❌ No matching tool found. Tried: {possible_tool_types}")
                logging.warning(f"🔧 TRANSLATION: Available tools: {list(self.available_tools.keys())}")
        
        # ENHANCEMENT: If no tool nodes provided, auto-assign relevant tools based on agent instructions
        if len(available_tools) == 0:
            agent_instructions = main_agent_node.data.get("instructions", "").lower()
            agent_name = main_agent_node.data.get("name", "").lower()
            
            # Smart tool assignment based on agent context
            auto_assigned_tools = []
            
            # Always include basic tools
            if "search_web" in self.available_tools:
                auto_assigned_tools.append(self.available_tools["search_web"])
            if "visit_webpage" in self.available_tools:
                auto_assigned_tools.append(self.available_tools["visit_webpage"])
            
            # Add Composio tools based on context
            if any(keyword in agent_instructions + agent_name for keyword in ["google", "docs", "document", "create"]):
                if "composio_googledocs_create_doc" in self.available_tools:
                    auto_assigned_tools.append(self.available_tools["composio_googledocs_create_doc"])
                    logging.info("🔧 AUTO-ASSIGNED: Added Google Docs tool based on agent context")
            
            if any(keyword in agent_instructions + agent_name for keyword in ["github", "repo", "star", "issue"]):
                if "composio_github_star_repo" in self.available_tools:
                    auto_assigned_tools.append(self.available_tools["composio_github_star_repo"])
                if "composio_github_create_issue" in self.available_tools:
                    auto_assigned_tools.append(self.available_tools["composio_github_create_issue"])
                    logging.info("🔧 AUTO-ASSIGNED: Added GitHub tools based on agent context")
            
            if any(keyword in agent_instructions + agent_name for keyword in ["email", "gmail", "send"]):
                if "composio_gmail_send_email" in self.available_tools:
                    auto_assigned_tools.append(self.available_tools["composio_gmail_send_email"])
                    logging.info("🔧 AUTO-ASSIGNED: Added Gmail tool based on agent context")
            
            available_tools = auto_assigned_tools
            logging.info(f"🔧 AUTO-ASSIGNMENT: Agent has {len(available_tools)} auto-assigned tools")

        logging.info(f"🔧 TRANSLATION: Final tool assignment: {len(available_tools)} tools for agent '{main_agent_node.data.get('name', 'agent')}'")

        # Create single agent with tools
        main_agent = AgentConfig(
            name=main_agent_node.data.get("name", "agent"),
            model_id=main_agent_node.data.get("model_id", "gpt-4.1-nano"),
            instructions=main_agent_node.data.get("instructions", 
                "You are a helpful assistant. Use the available tools to help users."),
            tools=available_tools
        )
        
        logging.info(f"🔧 TRANSLATION: Created agent '{main_agent.name}' with {len(main_agent.tools) if main_agent.tools else 0} tools")
        
        return main_agent, []
    
    def _assign_tools_to_agent(self, agent_node: VisualWorkflowNode, 
                              available_tools: List) -> List:
        """Assign appropriate tools to an agent based on its role"""
        
        agent_label = agent_node.data.get("label", "").lower()
        agent_instructions = agent_node.data.get("instructions", "").lower()
        
        assigned_tools = []
        
        # Smart tool assignment based on agent purpose
        if "search" in agent_label or "research" in agent_label or "web" in agent_instructions:
            if search_web in available_tools:
                assigned_tools.append(search_web)
        
        if "webpage" in agent_label or "visit" in agent_label or "read" in agent_instructions:
            if visit_webpage in available_tools:
                assigned_tools.append(visit_webpage)
        
        # If no specific match, give access to all tools
        if not assigned_tools:
            assigned_tools = available_tools
        
        return assigned_tools


def _run_any_agent_in_process(main_agent_config_dict: Dict, managed_agents_config_dict: List[Dict], input_data: str, framework: str) -> Dict[str, Any]:
    """
    Function to run any-agent in a completely separate process to avoid asyncio conflicts.
    This function is designed to be called via multiprocessing.Process.
    """
    try:
        # Ensure the any_agent module is available in the subprocess
        import sys
        import os
        
        # Add the src directory to Python path for this subprocess
        src_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'src')
        if src_path not in sys.path:
            sys.path.insert(0, src_path)
        
        # Now import any_agent
        from any_agent import AgentConfig, AgentFramework, AnyAgent, TracingConfig
        from typing import Any
        
        # Import the real tools for agent configuration
        from any_agent.tools import search_web, visit_webpage
        
        # Create a logger for subprocess
        import logging
        logging.basicConfig(level=logging.INFO)
        logger = logging.getLogger(__name__)
        logger.info(f"🔧 Production subprocess: Imported real tools - search_web: {search_web.__name__}, visit_webpage: {visit_webpage.__name__}")
        
        # Helper function to map tool names to actual tool functions
        def get_actual_tools(tool_names):
            # Basic tools
            tool_map = {
                "search_web": search_web,
                "visit_webpage": visit_webpage
            }
            
            # Add Composio tools by recreating the tool wrappers in subprocess
            try:
                # Import Composio bridge in subprocess
                sys.path.insert(0, os.path.dirname(__file__))
                from composio_mcp_bridge import UserComposioManager, UserContext
                
                # Create Composio tool wrappers in subprocess
                def create_composio_wrapper(tool_name):
                    def wrapper(input_text: str = "", title: str = "", content: str = "", **kwargs: Any) -> str:
                        try:
                            import asyncio
                            import os
                            
                            # Get user context from environment
                            api_key = os.getenv('COMPOSIO_API_KEY', '')
                            user_id = os.getenv('USER_ID', 'default_user')
                            
                            if not api_key:
                                return f"❌ No Composio API key configured for {tool_name}"
                            
                            # Create user context
                            user_context = UserContext(
                                user_id=user_id,
                                api_key=api_key,
                                enabled_tools=None,
                                preferences={}
                            )
                            
                            # Extract parameters from input_text and specific parameters
                            params = {}
                            if input_text:
                                params["input"] = input_text
                            if title:
                                params["title"] = title
                            if content:
                                params["content"] = content
                            # Add any additional kwargs
                            params.update(kwargs)
                            
                            # Execute the tool
                            manager = UserComposioManager()
                            result = asyncio.run(
                                manager.execute_tool_for_user(tool_name, params, user_context)
                            )
                            
                            if result.get("success"):
                                return f"✅ {tool_name} executed successfully: {result.get('result', 'Done')}"
                            else:
                                return f"❌ {tool_name} failed: {result.get('error', 'Unknown error')}"
                                
                        except Exception as e:
                            return f"❌ {tool_name} error: {str(e)}"
                    
                    wrapper.__name__ = f"composio_{tool_name}"
                    return wrapper
                
                # Add Composio tools to the map
                composio_tools = {
                    "composio_googledocs_create_doc": create_composio_wrapper("googledocs_create_doc"),
                    "composio_github_star_repo": create_composio_wrapper("github_star_repo"),
                    "composio_github_create_issue": create_composio_wrapper("github_create_issue"),
                    "composio_slack_send_message": create_composio_wrapper("slack_send_message"),
                    "composio_gmail_send_email": create_composio_wrapper("gmail_send_email"),
                    "composio_googlesheets_create_sheet": create_composio_wrapper("googlesheets_create_sheet"),
                    "composio_googledrive_upload": create_composio_wrapper("googledrive_upload"),
                    "composio_googlecalendar_create_event": create_composio_wrapper("googlecalendar_create_event"),
                    "composio_notion_create_page": create_composio_wrapper("notion_create_page"),
                    "composio_linear_create_issue": create_composio_wrapper("linear_create_issue"),
                    "composio_trello_create_card": create_composio_wrapper("trello_create_card"),
                    "composio_airtable_create_record": create_composio_wrapper("airtable_create_record"),
                    "composio_jira_create_issue": create_composio_wrapper("jira_create_issue")
                }
                tool_map.update(composio_tools)
                logger.info(f"🔧 Subprocess: Added {len(composio_tools)} Composio tools to tool map")
                
            except Exception as e:
                logger.warning(f"⚠️ Subprocess: Could not load Composio tools: {e}")
            
            # Map tool names to functions
            mapped_tools = []
            for name in tool_names:
                if name in tool_map:
                    mapped_tools.append(tool_map[name])
                    logger.info(f"✅ Subprocess: Mapped tool '{name}' successfully")
                else:
                    logger.warning(f"❌ Subprocess: Tool '{name}' not found in tool map")
            
            return mapped_tools
        
        # Recreate AgentConfig objects from dictionaries using the ACTUAL VISUAL WORKFLOW TOOLS
        main_tools = get_actual_tools(main_agent_config_dict.get("tools", []))
        logger.info(f"🔧 Production subprocess: Main agent '{main_agent_config_dict['name']}' assigned tools: {main_agent_config_dict.get('tools', [])}")
        
        main_agent_config = AgentConfig(
            name=main_agent_config_dict["name"],
            model_id=main_agent_config_dict["model_id"],
            instructions=main_agent_config_dict["instructions"],
            description=main_agent_config_dict.get("description", ""),
            tools=main_tools  # Use tools from VISUAL WORKFLOW, not hardcoded
        )
        
        managed_agents_config = []
        for agent_dict in managed_agents_config_dict:
            agent_tools = get_actual_tools(agent_dict.get("tools", []))
            logger.info(f"🔧 Production subprocess: Managed agent '{agent_dict['name']}' assigned tools: {agent_dict.get('tools', [])}")
            
            managed_agent = AgentConfig(
                name=agent_dict["name"],
                model_id=agent_dict["model_id"],
                instructions=agent_dict["instructions"],
                description=agent_dict.get("description", ""),
                tools=agent_tools  # Use tools from VISUAL WORKFLOW, not hardcoded
            )
            managed_agents_config.append(managed_agent)
        
        # Create the any-agent using the real framework
        # Convert framework string to AgentFramework enum
        framework_enum = AgentFramework.from_string(framework.upper())
        
        # Create and run the any-agent using the real API with proper tracing
        agent = AnyAgent.create(
            agent_framework=framework_enum,
            agent_config=main_agent_config,
            tracing=TracingConfig(
                console=True,     # Enable console tracing for debugging
                cost_info=True    # Enable cost and token tracking
            )
        )
        
        # Run the agent and get the trace
        logger.info(f"🚀 Production subprocess: Running agent '{main_agent_config.name}' with input: '{input_data[:100]}...'")
        agent_trace = agent.run(input_data)
        logger.info(f"✅ Production subprocess: Agent execution completed, output length: {len(str(agent_trace))}")
        
        # Extract the final output for input detection
        final_output = agent_trace.final_output if hasattr(agent_trace, 'final_output') else str(agent_trace)
        
        # Check if the agent output indicates a request for user input
        # This is a simplified detection - in a full implementation, this would be more sophisticated
        if final_output and ("?" in final_output) and any(indicator in final_output.lower() for indicator in [
            "what would you like", "please provide", "tell me", "what are your preferences", 
            "what do you think", "how would you like", "what should", "what kind of"
        ]):
            logger.info(f"🤔 Agent output appears to be requesting user input: {final_output[:100]}...")
            # For now, we'll just log this detection
            # The actual input request handling would be implemented in the main execution flow
        
        # Extract detailed trace information from the any-agent result
        trace_data = _extract_trace_from_result(agent_trace)
        
        return {
            "success": True,
            "final_output": agent_trace.final_output if hasattr(agent_trace, 'final_output') else str(agent_trace),
            "agent_trace": trace_data,
            "main_agent": main_agent_config.name,
            "managed_agents": [agent.name for agent in managed_agents_config],
            "framework_used": framework
        }
        
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "traceback": traceback.format_exc()
        }


def _extract_trace_from_result(result) -> Dict[str, Any]:
    """Extract detailed trace information from any-agent result object"""
    try:
        trace_data = {
            "final_output": result,
            "spans": [],
            "performance": {},
            "cost_info": {}
        }
        
        # Extract spans if available
        if hasattr(result, 'spans'):
            spans = getattr(result, 'spans', [])
            for span in spans:
                span_data = {
                    "name": getattr(span, 'name', 'unknown'),
                    "span_id": getattr(span, 'span_id', None),
                    "trace_id": getattr(span, 'trace_id', None),
                    "start_time": getattr(span, 'start_time', 0),
                    "end_time": getattr(span, 'end_time', 0),
                    "duration_ms": None,
                    "status": str(getattr(span, 'status', '')),
                    "attributes": dict(getattr(span, 'attributes', {})),
                    "events": [str(event) for event in getattr(span, 'events', [])],
                    "kind": str(getattr(span, 'kind', ''))
                }
                
                # Calculate duration if we have start and end times
                if span_data["start_time"] and span_data["end_time"]:
                    # Convert nanoseconds to milliseconds
                    duration_ns = span_data["end_time"] - span_data["start_time"]
                    span_data["duration_ms"] = duration_ns / 1_000_000
                
                trace_data["spans"].append(span_data)
        
        # Extract cost information if available
        if hasattr(result, 'get_total_cost'):
            try:
                cost_info = result.get_total_cost()
                trace_data["cost_info"] = {
                    "total_cost": getattr(cost_info, 'total_cost', 0),
                    "total_tokens": getattr(cost_info, 'total_tokens', 0),
                    "input_tokens": getattr(cost_info, 'input_tokens', 0),
                    "output_tokens": getattr(cost_info, 'output_tokens', 0)
                }
            except Exception as cost_e:
                trace_data["cost_info"] = {"extraction_error": str(cost_e)}
        
        # If get_total_cost didn't work, manually aggregate from spans
        if not trace_data["cost_info"] or trace_data["cost_info"].get("total_cost", 0) == 0:
            total_input_tokens = 0
            total_output_tokens = 0
            total_input_cost = 0.0
            total_output_cost = 0.0
            
            for span in trace_data["spans"]:
                attrs = span.get("attributes", {})
                
                # Extract token counts from gen_ai.usage.* fields
                input_tokens = attrs.get("gen_ai.usage.input_tokens", 0)
                output_tokens = attrs.get("gen_ai.usage.output_tokens", 0)
                input_cost = attrs.get("gen_ai.usage.input_cost", 0.0)
                output_cost = attrs.get("gen_ai.usage.output_cost", 0.0)
                
                total_input_tokens += input_tokens
                total_output_tokens += output_tokens
                total_input_cost += input_cost
                total_output_cost += output_cost
            
            total_cost = total_input_cost + total_output_cost
            total_tokens = total_input_tokens + total_output_tokens
            
            trace_data["cost_info"] = {
                "total_cost": total_cost,
                "total_tokens": total_tokens,
                "input_tokens": total_input_tokens,
                "output_tokens": total_output_tokens,
                "input_cost": total_input_cost,
                "output_cost": total_output_cost
            }
        
        # Calculate performance metrics
        if trace_data["spans"]:
            total_duration = sum(span.get("duration_ms", 0) for span in trace_data["spans"] if span.get("duration_ms"))
            total_cost = trace_data["cost_info"].get("total_cost", 0)
            total_tokens = trace_data["cost_info"].get("total_tokens", 0)
            
            trace_data["performance"] = {
                "total_duration_ms": total_duration,
                "total_cost": total_cost,
                "total_tokens": total_tokens,
                "span_count": len(trace_data["spans"])
            }
        
        return trace_data
        
    except Exception as e:
        return {
            "extraction_error": str(e),
            "final_output": str(result) if result else "",
            "spans": [],
            "performance": {},
            "cost_info": {}
        }


async def execute_visual_workflow_with_anyagent(nodes: List[Dict], 
                                               edges: List[Dict],
                                               input_data: str,
                                               framework: str = "openai") -> Dict[str, Any]:
    """
    Execute a visual workflow using any-agent's native multi-agent orchestration
    """
    
    translator = VisualToAnyAgentTranslator()
    
    try:
        # Translate visual workflow to any-agent configuration
        main_agent_config, managed_agents_config = translator.translate_workflow(
            nodes, edges, framework
        )
        
        # Enhanced execution system with mode switching
        # Set USE_MOCK_EXECUTION=false for real any-agent execution (experimental)
        # Set USE_MOCK_EXECUTION=true for intelligent workflow suggestions (stable)
        import os
        execution_mode = os.getenv("USE_MOCK_EXECUTION", "false").lower()
        
        # Add explicit logging to track execution mode
        logging.info(f"🚀 Production: Execution mode = {execution_mode} (USE_MOCK_EXECUTION={os.getenv('USE_MOCK_EXECUTION', 'not_set')})")
        logging.info(f"🔍 Production: Will use {'MOCK/SUGGESTIONS' if execution_mode == 'true' else 'REAL EXECUTION'} mode")
        
        if execution_mode == "true":
            # WORKFLOW SUGGESTION MODE: Provide intelligent workflow building guidance
            mock_response = _generate_workflow_suggestions(input_data)
            mock_response += "\n\n---\n**Note**: This is in **Workflow Suggestion Mode**. I'm providing specific node recommendations to help you build your visual workflow. To execute workflows with real AI agents, use the Visual Workflow Designer or set USE_MOCK_EXECUTION=false."
            
            return {
                "final_output": mock_response,
                "agent_trace": None,
                "execution_pattern": "suggestions",
                "main_agent": "workflow_suggestion_agent",
                "managed_agents": [],
                "framework_used": framework,
                "mode": "suggestions"
            }
        
        # REAL EXECUTION MODE: Execute using any-agent (experimental - may have asyncio issues)
        logging.info("🚀 Production: Starting REAL EXECUTION MODE with process-based execution")
        try:
            # SOLUTION 1: Process-based execution to avoid asyncio conflicts
            import concurrent.futures
            import asyncio
            from functools import partial
            
            # Convert AgentConfig objects to dictionaries for multiprocessing
            # IMPORTANT: Include the tools information so subprocess knows what tools to assign
            main_agent_dict = {
                "name": main_agent_config.name,
                "model_id": main_agent_config.model_id,
                "instructions": main_agent_config.instructions,
                "description": main_agent_config.description,
                "tools": [tool.__name__ for tool in main_agent_config.tools] if main_agent_config.tools else []
            }
            
            managed_agents_dict = []
            if managed_agents_config:
                for agent in managed_agents_config:
                    managed_agents_dict.append({
                        "name": agent.name,
                        "model_id": agent.model_id,
                        "instructions": agent.instructions,
                        "description": agent.description,
                        "tools": [tool.__name__ for tool in agent.tools] if agent.tools else []
                    })
            
            # Run any-agent in a separate process to avoid asyncio conflicts
            logging.info(f"🔧 Production: About to execute subprocess with main_agent={main_agent_dict['name']}")
            loop = asyncio.get_event_loop()
            with concurrent.futures.ProcessPoolExecutor() as executor:
                future = executor.submit(
                    _run_any_agent_in_process,
                    main_agent_dict,
                    managed_agents_dict,
                    input_data,
                    framework
                )
                # Wait for the process to complete with timeout
                logging.info("⏳ Production: Waiting for subprocess to complete...")
                process_result = await loop.run_in_executor(None, lambda: future.result(timeout=60))
                logging.info(f"✅ Production: Subprocess completed with success={process_result.get('success')}")
            
            if process_result.get("success"):
                return {
                    "final_output": process_result["final_output"],
                    "agent_trace": process_result["agent_trace"],
                    "execution_pattern": translator._analyze_workflow_pattern(
                        [VisualWorkflowNode(n["id"], n["type"], n["data"], n["position"]) for n in nodes],
                        [VisualWorkflowEdge(e["id"], e["source"], e["target"]) for e in edges]
                    ),
                    "main_agent": process_result["main_agent"],
                    "managed_agents": process_result["managed_agents"],
                    "framework_used": process_result["framework_used"],
                    "mode": "real_execution"
                }
            else:
                raise Exception(f"Process execution failed: {process_result.get('error', 'Unknown error')}")
                
        except Exception as e:
            # SOLUTION 2: If process execution fails, try thread-based approach
            logging.warning(f"⚠️ Production: Process execution failed: {e}, trying thread approach")
            try:
                import threading
                import queue
                
                result_queue = queue.Queue()
                
                def run_in_thread():
                    try:
                        # Create a new event loop for this thread
                        new_loop = asyncio.new_event_loop()
                        asyncio.set_event_loop(new_loop)
                        
                        # CRITICAL DEBUG: Log what tools are being used in thread execution
                        import logging
                        logging.basicConfig(level=logging.INFO)
                        logger = logging.getLogger(__name__)
                        logger.info(f"🧵 THREAD EXECUTION: Agent '{main_agent_config.name}' has {len(main_agent_config.tools) if main_agent_config.tools else 0} tools")
                        if main_agent_config.tools:
                            for i, tool in enumerate(main_agent_config.tools):
                                logger.info(f"🧵 THREAD EXECUTION: Tool {i+1}: {tool.__name__ if hasattr(tool, '__name__') else str(tool)}")
                        else:
                            logger.info("🧵 THREAD EXECUTION: NO TOOLS assigned to agent!")
                        
                        # CRITICAL FIX: Set up Composio environment for thread execution
                        # The thread execution needs access to user's Composio API key and context
                        import os
                        
                        # Try to get user context from main process environment or MCP system
                        composio_api_key = os.getenv('COMPOSIO_API_KEY', '')
                        user_id = os.getenv('USER_ID', 'default_user')
                        
                        # If not available in environment, try to get from MCP config or direct lookup
                        if not composio_api_key:
                            try:
                                # Try to get from MCP server config
                                if MCP_INTEGRATION_AVAILABLE:
                                    mcp_manager = get_mcp_manager()
                                    if mcp_manager:
                                        # Check if composio-tools server has config with API key
                                        server_configs = mcp_manager.get_server_status()
                                        composio_config = server_configs.get('composio-tools', {})
                                        env_vars = composio_config.get('environment', {})
                                        composio_api_key = env_vars.get('COMPOSIO_API_KEY', '')
                                        if composio_api_key:
                                            user_id = env_vars.get('USER_ID', 'default_user')
                                            logger.info(f"🧵 THREAD: Loaded Composio config from MCP server")
                                        else:
                                            logger.info(f"🧵 THREAD: No API key in MCP server config")
                                
                                # Fallback: try localStorage-style approach (browser settings may be stored server-side)
                                if not composio_api_key:
                                    # This would be implemented if there's a server-side user settings storage
                                    logger.info(f"🧵 THREAD: No user settings storage available, will use mock mode")
                                    
                            except Exception as e:
                                logger.warning(f"🧵 THREAD: Could not load user context: {e}")
                        
                        # Set environment for this thread
                        if composio_api_key:
                            os.environ['COMPOSIO_API_KEY'] = composio_api_key
                            os.environ['USER_ID'] = user_id
                            logger.info(f"🧵 THREAD: Set Composio environment - API key available: {bool(composio_api_key)}")
                        else:
                            logger.warning(f"🧵 THREAD: No Composio API key available - tools will use mock mode")
                        
                        # Convert framework string to AgentFramework enum
                        framework_enum = AgentFramework.from_string(framework.upper())
                        
                        # Create and run the any-agent using the real API
                        agent = AnyAgent.create(
                            agent_framework=framework_enum,
                            agent_config=main_agent_config,
                            tracing=TracingConfig(
                                console=True,     # Enable console tracing for debugging
                                cost_info=True    # Enable cost and token tracking
                            )
                        )
                        
                        logger.info(f"🧵 THREAD EXECUTION: Starting agent run with input: '{input_data[:50]}...'")
                        agent_trace = agent.run(input_data)
                        logger.info(f"🧵 THREAD EXECUTION: Agent completed, output length: {len(str(agent_trace))}")
                        
                        result_queue.put({
                            "success": True,
                            "final_output": agent_trace.final_output if hasattr(agent_trace, 'final_output') else str(agent_trace),
                            "agent_trace": agent_trace,
                            "main_agent": main_agent_config.name,
                            "managed_agents": [agent.name for agent in managed_agents_config] if managed_agents_config else []
                        })
                        
                    except Exception as thread_e:
                        result_queue.put({
                            "success": False,
                            "error": str(thread_e)
                        })
                    finally:
                        new_loop.close()
                
                # Run in thread and wait for result
                thread = threading.Thread(target=run_in_thread)
                thread.start()
                thread.join(timeout=60)  # 60 second timeout
                
                if thread.is_alive():
                    raise Exception("Thread execution timed out")
                
                if not result_queue.empty():
                    thread_result = result_queue.get()
                    if thread_result.get("success"):
                        return {
                            "final_output": thread_result["final_output"],
                            "agent_trace": thread_result["agent_trace"],
                            "execution_pattern": translator._analyze_workflow_pattern(
                                [VisualWorkflowNode(n["id"], n["type"], n["data"], n["position"]) for n in nodes],
                                [VisualWorkflowEdge(e["id"], e["source"], e["target"]) for e in edges]
                            ),
                            "main_agent": thread_result["main_agent"],
                            "managed_agents": thread_result["managed_agents"],
                            "framework_used": framework,
                            "mode": "real_execution_threaded"
                        }
                    else:
                        raise Exception(f"Thread execution failed: {thread_result.get('error', 'Unknown error')}")
                else:
                    raise Exception("No result returned from thread")
                    
            except Exception as thread_e:
                # Final fallback to suggestions mode if both process and thread execution fail
                logging.error(f"❌ Production: Both process and thread execution failed! Process error: {e}, Thread error: {thread_e}")
                logging.error("🔄 Production: Falling back to suggestions mode")
                fallback_response = _generate_workflow_suggestions(input_data)
                fallback_response += f"\n\n---\n**Note**: Real execution failed due to asyncio conflicts ({str(e)}, {str(thread_e)}). Falling back to Workflow Suggestion Mode. This is a known limitation when running any-agent within FastAPI's event loop."
                
                return {
                    "final_output": fallback_response,
                    "agent_trace": None,
                    "execution_pattern": "suggestions_fallback",
                    "main_agent": "workflow_suggestion_agent", 
                    "managed_agents": [],
                    "framework_used": framework,
                    "mode": "suggestions_fallback",
                    "error": f"Asyncio conflict: {str(e)}"
                }
        
    except Exception as e:
        return {
            "error": str(e),
            "final_output": f"Error executing workflow: {str(e)}"
        } 


def _generate_workflow_suggestions(user_request: str) -> str:
    """Generate specific workflow node suggestions based on user request"""
    
    request_lower = user_request.lower()
    
    # Analyze the request to determine the domain and task
    if any(word in request_lower for word in ['grizzly', 'bear', 'wildlife', 'animal', 'spotting']):
        if any(word in request_lower for word in ['yellowstone', 'national park', 'park']):
            return _wildlife_spotting_workflow(user_request)
    
    if any(word in request_lower for word in ['travel', 'trip', 'vacation', 'visit', 'destination']):
        return _travel_planning_workflow(user_request)
    
    if any(word in request_lower for word in ['research', 'analyze', 'study', 'investigate']):
        return _research_workflow(user_request)
    
    if any(word in request_lower for word in ['data', 'analysis', 'process', 'clean']):
        return _data_analysis_workflow(user_request)
    
    if any(word in request_lower for word in ['email', 'message', 'communication', 'social media']):
        return _communication_workflow(user_request)
    
    # Default workflow suggestion
    return _general_workflow_suggestion(user_request)


def _wildlife_spotting_workflow(user_request: str) -> str:
    """Generate wildlife spotting workflow suggestions"""
    return f"""Perfect! I'll help you build a wildlife spotting workflow for: "{user_request}"

## Suggested Workflow Nodes:

### 1. Research Agent Node
- **Type**: Agent
- **Purpose**: Wildlife habitat research specialist
- **Instructions**: "Research wildlife habitats, seasonal patterns, and optimal viewing locations"
- **Model**: gpt-4o-mini

### 2. Web Search Tool Node  
- **Type**: Tool
- **Purpose**: Search for current wildlife sighting reports
- **Tool**: search_web
- **Connected to**: Research Agent

### 3. Location Analysis Agent Node
- **Type**: Agent  
- **Purpose**: Geographic and seasonal analysis specialist
- **Instructions**: "Analyze locations for optimal wildlife viewing based on season, weather, and habitat"
- **Model**: gpt-4o-mini

### 4. Safety Guidelines Agent Node
- **Type**: Agent
- **Purpose**: Wildlife safety and park regulations expert  
- **Instructions**: "Provide safety guidelines, park regulations, and best practices for wildlife viewing"
- **Model**: gpt-4o-mini

### 5. Report Generator Agent Node
- **Type**: Agent
- **Purpose**: Compile comprehensive spotting guide
- **Instructions**: "Create a detailed guide with locations, timing, safety tips, and what to expect"
- **Model**: gpt-4o-mini

## Recommended Connections:
1. Research Agent → Location Analysis Agent
2. Location Analysis Agent → Safety Guidelines Agent  
3. Safety Guidelines Agent → Report Generator Agent
4. Web Search Tool → Research Agent

## Expected Output:
A comprehensive guide with:
- Best grizzly bear viewing locations in Yellowstone
- Optimal timing for late May visits
- Safety protocols and regulations
- What to bring and expect
- Alternative wildlife opportunities

Would you like me to help you add any of these nodes to your visual workflow designer?"""


def _travel_planning_workflow(user_request: str) -> str:
    """Generate travel planning workflow suggestions"""
    return f"""I'll help you create a travel planning workflow for: "{user_request}"

## Suggested Workflow Nodes:

### 1. Destination Research Agent
- **Type**: Agent
- **Purpose**: Travel destination expert
- **Instructions**: "Research destinations, attractions, and travel requirements"

### 2. Weather & Timing Agent  
- **Type**: Agent
- **Purpose**: Weather and seasonal timing specialist
- **Instructions**: "Analyze weather patterns and optimal travel timing"

### 3. Accommodation Agent
- **Type**: Agent
- **Purpose**: Lodging and booking specialist  
- **Instructions**: "Find and recommend accommodations based on preferences and budget"

### 4. Activity Planner Agent
- **Type**: Agent
- **Purpose**: Activity and itinerary specialist
- **Instructions**: "Plan activities, tours, and daily itineraries"

### 5. Web Search Tool
- **Type**: Tool
- **Purpose**: Real-time information gathering
- **Tool**: search_web

Connect these agents sequentially for a comprehensive travel plan!"""


def _research_workflow(user_request: str) -> str:
    """Generate research workflow suggestions"""
    return f"""I'll help you build a research workflow for: "{user_request}"

## Suggested Workflow Nodes:

### 1. Research Coordinator Agent
- **Type**: Agent
- **Purpose**: Research project manager
- **Instructions**: "Coordinate research tasks and synthesize findings"

### 2. Information Gathering Agent
- **Type**: Agent  
- **Purpose**: Data collection specialist
- **Instructions**: "Gather information from multiple sources and verify credibility"

### 3. Analysis Agent
- **Type**: Agent
- **Purpose**: Data analysis specialist
- **Instructions**: "Analyze gathered information and identify patterns"

### 4. Web Search Tool
- **Type**: Tool
- **Purpose**: Online research capabilities
- **Tool**: search_web

### 5. Report Writer Agent
- **Type**: Agent
- **Purpose**: Research report specialist
- **Instructions**: "Compile findings into comprehensive, well-structured reports"

This workflow will systematically research your topic and deliver actionable insights!"""


def _data_analysis_workflow(user_request: str) -> str:
    """Generate data analysis workflow suggestions"""
    return f"""I'll help you create a data analysis workflow for: "{user_request}"

## Suggested Workflow Nodes:

### 1. Data Validator Agent
- **Type**: Agent
- **Purpose**: Data quality specialist
- **Instructions**: "Validate data quality, identify missing values, and suggest cleaning steps"

### 2. Statistical Analysis Agent
- **Type**: Agent
- **Purpose**: Statistical analysis expert
- **Instructions**: "Perform statistical analysis and identify patterns in data"

### 3. Visualization Agent
- **Type**: Agent
- **Purpose**: Data visualization specialist
- **Instructions**: "Create charts, graphs, and visual representations of data insights"

### 4. Insights Generator Agent
- **Type**: Agent
- **Purpose**: Business intelligence specialist
- **Instructions**: "Generate actionable insights and recommendations from analysis"

Connect these for a complete data analysis pipeline!"""


def _communication_workflow(user_request: str) -> str:
    """Generate communication workflow suggestions"""
    return f"""I'll help you build a communication workflow for: "{user_request}"

## Suggested Workflow Nodes:

### 1. Content Strategist Agent
- **Type**: Agent
- **Purpose**: Communication strategy expert
- **Instructions**: "Develop communication strategy and messaging approach"

### 2. Copy Writer Agent
- **Type**: Agent
- **Purpose**: Professional copywriting specialist
- **Instructions**: "Create engaging, targeted copy for various communication channels"

### 3. Tone Analyzer Agent
- **Type**: Agent
- **Purpose**: Communication tone specialist
- **Instructions**: "Analyze and adjust tone for target audience and platform"

### 4. Quality Reviewer Agent
- **Type**: Agent
- **Purpose**: Editorial and quality assurance
- **Instructions**: "Review content for clarity, accuracy, and effectiveness"

This workflow will help you create polished, effective communications!"""


def _general_workflow_suggestion(user_request: str) -> str:
    """Generate general workflow suggestions"""
    return f"""I'll help you build a custom workflow for: "{user_request}"

## Suggested Starting Nodes:

### 1. Task Coordinator Agent
- **Type**: Agent
- **Purpose**: Project coordination and management
- **Instructions**: "Break down the task into manageable steps and coordinate execution"

### 2. Research Agent
- **Type**: Agent  
- **Purpose**: Information gathering specialist
- **Instructions**: "Research relevant information and gather necessary data"

### 3. Web Search Tool
- **Type**: Tool
- **Purpose**: Online information access
- **Tool**: search_web

### 4. Analysis Agent
- **Type**: Agent
- **Purpose**: Analysis and processing specialist
- **Instructions**: "Analyze gathered information and provide insights"

### 5. Output Generator Agent
- **Type**: Agent
- **Purpose**: Final output creation
- **Instructions**: "Compile results into a comprehensive, actionable response"

## Recommended Flow:
Task Coordinator → Research Agent → Analysis Agent → Output Generator

Would you like me to suggest more specific nodes based on your particular use case?""" 