"""
AI-powered features routes.
"""
import random
from typing import Dict, List, Any
from fastapi import APIRouter, HTTPException

router = APIRouter(prefix="/api/ai", tags=["ai"])

# Dependencies
ai_workflow_refiner = None
MCP_AVAILABLE = False
get_mcp_manager = None
COMPOSIO_AVAILABLE = False


def set_ai_dependencies(refiner=None, mcp_available=False, mcp_manager_func=None, composio_available=False):
    """Set AI dependencies - called from main.py"""
    global ai_workflow_refiner, MCP_AVAILABLE, get_mcp_manager, COMPOSIO_AVAILABLE
    ai_workflow_refiner = refiner
    MCP_AVAILABLE = mcp_available
    get_mcp_manager = mcp_manager_func
    COMPOSIO_AVAILABLE = composio_available


@router.post("/evaluation-suggestions")
async def get_evaluation_suggestions(request: dict):
    """Get AI-powered suggestions for workflow evaluation criteria"""
    user_input = request.get("user_input", "")
    evaluation_context = request.get("context", {})
    
    if not user_input:
        # Return rule-based suggestions if no input
        return await get_rule_based_suggestions(user_input, evaluation_context)
    
    try:
        # TODO: Integrate with AI model for suggestions
        # For now, return rule-based suggestions
        return await get_rule_based_suggestions(user_input, evaluation_context)
    except Exception as e:
        print(f"Error getting evaluation suggestions: {e}")
        # Fallback to rule-based
        return await get_rule_based_suggestions(user_input, evaluation_context)


async def get_rule_based_suggestions(user_input: str, evaluation_context: dict):
    """Generate rule-based evaluation suggestions"""
    workflow_type = evaluation_context.get("workflow_type", "general")
    
    # Base evaluation criteria templates
    base_criteria = {
        "general": [
            {
                "name": "Output Completeness",
                "description": "Check if the output contains all required information",
                "points": 20
            },
            {
                "name": "Accuracy",
                "description": "Verify the correctness of the generated output",
                "points": 30
            },
            {
                "name": "Format Compliance",
                "description": "Ensure output follows the expected format",
                "points": 20
            }
        ],
        "data_processing": [
            {
                "name": "Data Validation",
                "description": "Verify input data is properly validated",
                "points": 25
            },
            {
                "name": "Processing Accuracy",
                "description": "Check calculations and transformations are correct",
                "points": 35
            },
            {
                "name": "Error Handling",
                "description": "Ensure errors are properly caught and reported",
                "points": 20
            }
        ],
        "content_generation": [
            {
                "name": "Content Relevance",
                "description": "Ensure generated content is relevant to the prompt",
                "points": 30
            },
            {
                "name": "Quality and Coherence",
                "description": "Check content quality and logical flow",
                "points": 30
            },
            {
                "name": "Originality",
                "description": "Verify content is original and not plagiarized",
                "points": 20
            }
        ]
    }
    
    # Get criteria based on workflow type
    criteria = base_criteria.get(workflow_type, base_criteria["general"])
    
    # Add performance criteria
    criteria.append({
        "name": "Execution Time",
        "description": "Workflow completes within acceptable time limits",
        "points": 10
    })
    
    criteria.append({
        "name": "Resource Efficiency",
        "description": "Workflow uses resources efficiently",
        "points": 10
    })
    
    return {
        "suggestions": criteria,
        "total_points": sum(c["points"] for c in criteria),
        "workflow_type": workflow_type
    }


@router.post("/test-case-generation")
async def generate_test_cases(request: dict):
    """Generate test cases for workflow evaluation"""
    workflow_type = request.get("workflow_type", "general")
    domain = request.get("domain", "general")
    difficulty = request.get("difficulty", "medium")
    count = request.get("count", 3)
    
    try:
        # TODO: Integrate with AI model for test case generation
        # For now, return template-based test cases
        return await generate_fallback_test_cases(workflow_type, domain, difficulty, count)
    except Exception as e:
        print(f"Error generating test cases: {e}")
        return await generate_fallback_test_cases(workflow_type, domain, difficulty, count)


async def generate_fallback_test_cases(workflow_type: str, domain: str, difficulty: str, count: int = 3):
    """Generate fallback test cases using templates"""
    test_case_templates = {
        "general": [
            {
                "name": "Basic Input Test",
                "input": "Process this simple input",
                "expected_output": "Processed output",
                "validation_criteria": ["Output exists", "No errors"]
            },
            {
                "name": "Complex Input Test",
                "input": "Handle multiple data points: A, B, C with conditions X, Y, Z",
                "expected_output": "Structured response addressing all points",
                "validation_criteria": ["All points addressed", "Proper structure"]
            }
        ],
        "data_processing": [
            {
                "name": "CSV Processing Test",
                "input": "name,age,city\\nJohn,30,NYC\\nJane,25,LA",
                "expected_output": "Processed 2 records successfully",
                "validation_criteria": ["Record count correct", "No data loss"]
            },
            {
                "name": "JSON Transform Test",
                "input": '{"users": [{"name": "John", "age": 30}]}',
                "expected_output": "Transformed data structure",
                "validation_criteria": ["Valid JSON output", "Schema compliance"]
            }
        ],
        "content_generation": [
            {
                "name": "Article Generation Test",
                "input": "Write an article about sustainable technology",
                "expected_output": "Article with introduction, body, and conclusion",
                "validation_criteria": ["Minimum 300 words", "Proper structure", "On topic"]
            },
            {
                "name": "Summary Generation Test",
                "input": "Summarize the key points of machine learning in 100 words",
                "expected_output": "Concise summary covering main concepts",
                "validation_criteria": ["Word count compliance", "Key concepts covered"]
            }
        ]
    }
    
    # Get templates for workflow type
    templates = test_case_templates.get(workflow_type, test_case_templates["general"])
    
    # Select random test cases up to count
    selected = random.sample(templates, min(count, len(templates)))
    
    # Add difficulty adjustments
    if difficulty == "easy":
        for tc in selected:
            tc["validation_criteria"] = tc["validation_criteria"][:1]
    elif difficulty == "hard":
        for tc in selected:
            tc["validation_criteria"].extend(["Performance under 5s", "Memory efficient"])
    
    return {
        "test_cases": selected,
        "workflow_type": workflow_type,
        "difficulty": difficulty,
        "count": len(selected)
    }


@router.post("/workflow-evaluation-suggestions")
async def get_workflow_evaluation_suggestions(request: dict):
    """Get AI suggestions for evaluating specific workflow components"""
    workflow = request.get("workflow", {})
    focus_area = request.get("focus_area", "overall")
    
    nodes = workflow.get("nodes", [])
    edges = workflow.get("edges", [])
    
    suggestions = {
        "node_criteria": [],
        "edge_criteria": [],
        "overall_criteria": []
    }
    
    # Analyze nodes
    for node in nodes:
        node_type = node.get("type", "unknown")
        if node_type == "agent":
            suggestions["node_criteria"].append({
                "node_id": node.get("id"),
                "criteria": [
                    "Agent responds appropriately to input",
                    "Agent output is well-formatted",
                    "Agent handles edge cases"
                ]
            })
        elif node_type == "tool":
            suggestions["node_criteria"].append({
                "node_id": node.get("id"),
                "criteria": [
                    "Tool executes successfully",
                    "Tool output matches expected schema",
                    "Tool errors are handled gracefully"
                ]
            })
    
    # Overall workflow criteria
    suggestions["overall_criteria"] = [
        "Workflow completes end-to-end",
        "Data flows correctly between nodes",
        "Error handling is comprehensive",
        "Performance is acceptable"
    ]
    
    return suggestions


@router.post("/tool-recommendations")
async def get_tool_recommendations(request: dict):
    """Get AI-powered tool recommendations based on workflow context"""
    node_data = request.get("node_data", {})
    workflow_context = request.get("workflow_context", {})
    
    # Get available tools
    available_tools = {"builtin": [], "mcp": {}, "composio": []}
    
    if MCP_AVAILABLE and get_mcp_manager:
        try:
            manager = get_mcp_manager()
            available_tools["mcp"] = await manager.get_all_tools()
        except:
            pass
    
    # Try AI-powered recommendations first
    try:
        # TODO: Integrate with AI model
        pass
    except:
        pass
    
    # Fallback to rule-based recommendations
    return await get_fallback_tool_recommendations(node_data, available_tools)


async def get_fallback_tool_recommendations(node_data: dict, mcp_tools: dict):
    """Fallback rule-based tool recommendations"""
    agent_name = node_data.get("name", "").lower()
    agent_prompt = node_data.get("prompt", "").lower()
    
    recommendations = []
    
    # Flatten MCP tools for easier searching
    all_tools = []
    for server_id, tools in mcp_tools.items():
        for tool in tools:
            all_tools.append({
                "name": tool.get("name", ""),
                "description": tool.get("description", ""),
                "server": server_id,
                "category": _categorize_tool(tool.get("name", ""), server_id)
            })
    
    # Rule-based matching
    keywords_to_tools = {
        "file": ["filesystem", "read", "write"],
        "web": ["fetch", "scrape", "browser"],
        "data": ["parse", "transform", "analyze"],
        "api": ["request", "http", "rest"],
        "database": ["query", "sql", "db"],
        "search": ["find", "lookup", "search"],
        "github": ["repository", "commit", "issue", "pr"]
    }
    
    # Check for keyword matches
    for keyword, tool_keywords in keywords_to_tools.items():
        if keyword in agent_name or keyword in agent_prompt:
            for tool in all_tools:
                tool_name_lower = tool["name"].lower()
                tool_desc_lower = tool["description"].lower()
                if any(tk in tool_name_lower or tk in tool_desc_lower for tk in tool_keywords):
                    recommendations.append({
                        "tool": tool["name"],
                        "description": tool["description"],
                        "server": tool["server"],
                        "category": tool["category"],
                        "relevance_score": 0.8
                    })
    
    # If no specific matches, recommend general tools
    if not recommendations:
        general_tools = ["read_file", "write_file", "fetch_url", "run_command"]
        for tool in all_tools:
            if tool["name"] in general_tools:
                recommendations.append({
                    "tool": tool["name"],
                    "description": tool["description"],
                    "server": tool["server"],
                    "category": tool["category"],
                    "relevance_score": 0.5
                })
    
    # Limit recommendations
    recommendations = sorted(recommendations, key=lambda x: x["relevance_score"], reverse=True)[:5]
    
    return {
        "recommendations": recommendations,
        "total_available_tools": len(all_tools),
        "method": "rule_based"
    }


def _categorize_tool(tool_name: str, server_id: str) -> str:
    """Categorize a tool based on its name and server"""
    tool_lower = tool_name.lower()
    
    if "file" in tool_lower or "read" in tool_lower or "write" in tool_lower:
        return "filesystem"
    elif "web" in tool_lower or "fetch" in tool_lower or "http" in tool_lower:
        return "web"
    elif "github" in server_id or "git" in tool_lower:
        return "version_control"
    elif "sql" in tool_lower or "query" in tool_lower or "database" in tool_lower:
        return "database"
    else:
        return "general"