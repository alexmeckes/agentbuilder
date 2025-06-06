"""
AI Workflow Refiner

This module uses an AI model to translate a natural language command
into a series of structured actions to modify a workflow.
"""

import os
import json
from openai import OpenAI
from typing import List, Dict, Any

# Initialize OpenAI client
client = OpenAI(api_key=os.environ.get("OPENAI_API_KEY"))

ACTION_SCHEMA = """
[
  {
    "action": "ADD_NODE",
    "payload": {
      "id": "<new_node_id>",
      "type": "agent|tool|input|output",
      "position": { "x": 100, "y": 100 },
      "data": { ... }
    }
  },
  {
    "action": "DELETE_NODE",
    "nodeId": "<node_id_to_delete>"
  },
  {
    "action": "UPDATE_NODE",
    "nodeId": "<node_id_to_update>",
    "payload": {
      "label": "<new_label>",
      "instructions": "<new_instructions>"
    }
  },
  {
    "action": "CREATE_EDGE",
    "payload": {
      "source": "<source_node_id>",
      "target": "<target_node_id>"
    }
  },
  {
    "action": "DELETE_EDGE",
    "edgeId": "<edge_id_to_delete>"
  }
]
"""

# Define as a regular multi-line string and use .format() to avoid f-string issues.
SYSTEM_PROMPT_TEMPLATE = """
You are an expert AI workflow assistant. Your task is to translate a user's natural language command into a structured list of actions to modify a workflow.

The user will provide a command and the current workflow's state as a JSON object containing 'nodes' and 'edges'.

You must analyze the command and the workflow state to determine the necessary changes. Then, you must output a new JSON object containing a single key, "actions", which is a list of action objects.

Each action object must conform to the following schema:
{action_schema}

RULES:
- You must only output a valid JSON object with the "actions" key.
- Node IDs and Edge IDs must be referenced correctly from the provided workflow state.
- When creating a new node, provide a short, descriptive ID (e.g., "agent-2", "tool-web-search").
- When creating an edge, you can create a simple ID like "e-1-2".
- IMPORTANT: Users will refer to nodes by their 'data.label'. You MUST find the correct 'id' for a node by looking it up in the provided 'nodes' array. Do not use the label as the 'nodeId'.

EXAMPLE:
User command: "Rename the 'Initial Agent' to 'Research Agent'"
Workflow state: {{ "nodes": [{{ "id": "agent-1-xyz", "data": {{ "label": "Initial Agent" }} }}] }}

Your output:
{{
  "actions": [
    {{
      "action": "UPDATE_NODE",
      "nodeId": "agent-1-xyz",
      "payload": {{
        "label": "Research Agent"
      }}
    }}
  ]
}}
"""
SYSTEM_PROMPT = SYSTEM_PROMPT_TEMPLATE.format(action_schema=ACTION_SCHEMA)

def generate_workflow_actions(command: str, nodes: List[Dict], edges: List[Dict]) -> List[Dict]:
    """
    Uses an AI model to generate a list of actions to modify a workflow.
    """
    workflow_state = json.dumps({"nodes": nodes, "edges": edges}, indent=2)
    user_message = f"Command: {command}\n\nWorkflow State:\n{workflow_state}"

    try:
        response = client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": user_message},
            ],
            response_format={"type": "json_object"},
        )
        actions_json = response.choices[0].message.content
        return json.loads(actions_json).get("actions", [])
    except Exception as e:
        print(f"Error calling OpenAI: {e}")
        return []

def apply_actions(nodes: List[Dict], edges: List[Dict], actions: List[Dict]) -> Dict[str, List]:
    """
    Applies a list of actions to the workflow's nodes and edges.
    """
    node_map = {node['id']: node for node in nodes}
    edge_map = {edge['id']: edge for edge in edges}

    for action in actions:
        action_type = action.get("action")
        if action_type == "ADD_NODE":
            new_node = action["payload"]
            # Ensure the new node has a position
            if "position" not in new_node:
                new_node["position"] = {"x": 100, "y": 100}
            node_map[new_node['id']] = new_node
        elif action_type == "DELETE_NODE":
            node_id = action.get("nodeId")
            if node_id in node_map:
                del node_map[node_id]
                # Also remove connected edges
                edges = [e for e in edges if e['source'] != node_id and e['target'] != node_id]
                edge_map = {edge['id']: edge for edge in edges}
        elif action_type == "UPDATE_NODE":
            node_id = action.get("nodeId")
            if node_id in node_map:
                node_map[node_id]['data'].update(action["payload"])
        elif action_type == "CREATE_EDGE":
            new_edge = action["payload"]
            # Ensure edge has a unique ID
            new_edge['id'] = new_edge.get('id', f"e-{new_edge['source']}-{new_edge['target']}")
            edge_map[new_edge['id']] = new_edge
        elif action_type == "DELETE_EDGE":
            edge_id = action.get("edgeId")
            if edge_id in edge_map:
                del edge_map[edge_id]

    return {
        "nodes": list(node_map.values()),
        "edges": list(edge_map.values()),
    } 