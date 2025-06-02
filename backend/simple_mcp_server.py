#!/usr/bin/env python3
"""
Simple MCP Server for Web Search

This is a basic MCP server that provides web search functionality using DuckDuckGo.
"""

import asyncio
import json
import logging
from typing import Any, Dict, List, Optional

# MCP server imports
try:
    from mcp.server.fastmcp import FastMCP
    from mcp.server import NotificationOptions, Server
    from mcp.server.models import InitializationOptions
    import mcp.server.stdio
    from mcp.types import (
        Resource, Tool, TextContent, ImageContent, EmbeddedResource
    )
    MCP_AVAILABLE = True
except ImportError:
    print("MCP not available. Install with: pip install mcp")
    MCP_AVAILABLE = False
    exit(1)

# Web search functionality
try:
    from duckduckgo_search import DDGS
    SEARCH_AVAILABLE = True
except ImportError:
    print("DuckDuckGo Search not available. Install with: pip install duckduckgo-search")
    SEARCH_AVAILABLE = False

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create the MCP server
server = Server("web-search-server")

@server.list_tools()
async def handle_list_tools() -> List[Tool]:
    """List available tools"""
    tools = []
    
    if SEARCH_AVAILABLE:
        tools.append(Tool(
            name="web_search",
            description="Search the web for information using DuckDuckGo",
            inputSchema={
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "The search query"
                    },
                    "max_results": {
                        "type": "integer",
                        "description": "Maximum number of results to return (default: 5)",
                        "default": 5
                    }
                },
                "required": ["query"]
            }
        ))
    
    tools.append(Tool(
        name="echo",
        description="Echo back the input text (for testing)",
        inputSchema={
            "type": "object",
            "properties": {
                "text": {
                    "type": "string",
                    "description": "Text to echo back"
                }
            },
            "required": ["text"]
        }
    ))
    
    return tools

@server.call_tool()
async def handle_call_tool(name: str, arguments: Dict[str, Any]) -> List[TextContent]:
    """Handle tool execution"""
    
    if name == "echo":
        text = arguments.get("text", "")
        return [TextContent(
            type="text",
            text=f"Echo: {text}"
        )]
    
    elif name == "web_search" and SEARCH_AVAILABLE:
        query = arguments.get("query", "")
        max_results = arguments.get("max_results", 5)
        
        if not query:
            return [TextContent(
                type="text",
                text="Error: No search query provided"
            )]
        
        try:
            # Perform web search
            with DDGS() as ddgs:
                results = list(ddgs.text(
                    keywords=query,
                    max_results=max_results,
                    safesearch='moderate'
                ))
            
            if not results:
                return [TextContent(
                    type="text",
                    text=f"No search results found for: {query}"
                )]
            
            # Format results
            formatted_results = f"Web search results for: {query}\n\n"
            
            for i, result in enumerate(results, 1):
                formatted_results += f"{i}. **{result.get('title', 'No title')}**\n"
                formatted_results += f"   URL: {result.get('href', 'No URL')}\n"
                formatted_results += f"   Summary: {result.get('body', 'No description')}\n\n"
            
            return [TextContent(
                type="text",
                text=formatted_results
            )]
            
        except Exception as e:
            logger.error(f"Search error: {e}")
            return [TextContent(
                type="text",
                text=f"Search error: {str(e)}"
            )]
    
    else:
        return [TextContent(
            type="text",
            text=f"Unknown tool: {name}"
        )]

async def main():
    """Run the MCP server"""
    # Use stdio transport
    async with mcp.server.stdio.stdio_server() as (read_stream, write_stream):
        await server.run(
            read_stream,
            write_stream,
            InitializationOptions(
                server_name="web-search-server",
                server_version="1.0.0",
                capabilities=server.get_capabilities(
                    notification_options=NotificationOptions(),
                    experimental_capabilities={}
                )
            )
        )

if __name__ == "__main__":
    if not MCP_AVAILABLE:
        print("MCP not available. Please install mcp package.")
        exit(1)
    
    print("Starting Web Search MCP Server...")
    asyncio.run(main()) 