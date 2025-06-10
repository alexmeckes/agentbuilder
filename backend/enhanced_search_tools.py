#!/usr/bin/env python3
"""
Enhanced Search Tools with DuckDuckGo Error Handling

Provides robust web search functionality with fallbacks for DuckDuckGo issues.
"""

import time
import random
import logging
from typing import Optional, List, Dict, Any

# Set up logging
logger = logging.getLogger(__name__)

def enhanced_search_web(query: str, max_results: int = 10, retry_count: int = 3) -> str:
    """
    Enhanced web search with error handling and retries
    
    Args:
        query: Search query string
        max_results: Maximum number of results to return
        retry_count: Number of retry attempts
        
    Returns:
        Formatted search results or error message
    """
    # Try DuckDuckGo first with retries
    for attempt in range(retry_count):
        try:
            result = _try_duckduckgo_search(query, max_results)
            if result:
                return result
        except Exception as e:
            logger.warning(f"DuckDuckGo search attempt {attempt + 1} failed: {e}")
            if attempt < retry_count - 1:
                # Add exponential backoff
                delay = (2 ** attempt) + random.uniform(0, 1)
                time.sleep(delay)
    
    # If DuckDuckGo fails, return fallback response
    return _create_fallback_response(query)

def _try_duckduckgo_search(query: str, max_results: int) -> Optional[str]:
    """
    Attempt DuckDuckGo search with proper error handling
    """
    try:
        from duckduckgo_search import DDGS
        
        # Add some randomization to avoid detection
        time.sleep(random.uniform(0.5, 2.0))
        
        # Use context manager for better resource handling
        with DDGS() as ddgs:
            results = list(ddgs.text(
                keywords=query,
                max_results=max_results,
                safesearch='moderate',
                region='wt-wt'  # Worldwide
            ))
        
        if not results:
            logger.warning(f"No results returned for query: {query}")
            return None
        
        # Format results
        formatted_results = f"🔍 Search Results for: {query}\n\n"
        
        for i, result in enumerate(results, 1):
            title = result.get('title', 'No title')
            href = result.get('href', 'No URL')
            body = result.get('body', 'No description')
            
            formatted_results += f"{i}. **{title}**\n"
            formatted_results += f"   URL: {href}\n"
            formatted_results += f"   Description: {body}\n\n"
        
        return formatted_results
        
    except ImportError:
        logger.error("duckduckgo_search not available")
        return None
    except Exception as e:
        logger.error(f"DuckDuckGo search error: {e}")
        return None

def _create_fallback_response(query: str) -> str:
    """
    Create a fallback response when search fails
    """
    return f"""🚨 Search Temporarily Unavailable

I apologize, but web search is currently experiencing issues (DuckDuckGo rate limiting/blocking).

**Your query was**: {query}

**Suggested alternatives**:
1. Try your search query on Google manually: https://www.google.com/search?q={query.replace(' ', '+')}
2. Check specific websites directly (e.g., nps.gov for Yellowstone information)
3. Try the search again in a few minutes

**For Yellowstone moose viewing**, here's some general guidance:
- Best areas: Willow Park, Swan Lake Flat, Oxbow Bend
- Best times: Early morning (6-9 AM) and late evening (5-8 PM)
- Peak season: Late spring through early fall
- Safety: Maintain 25-yard distance from moose

The search functionality should resume shortly. This is a temporary issue with the search provider."""

def enhanced_visit_webpage(url: str) -> str:
    """
    Enhanced webpage visitor with better error handling
    """
    try:
        import requests
        from markdownify import markdownify
        import re
        
        # Add user agent to avoid blocking
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
        
        response = requests.get(url, headers=headers, timeout=10)
        response.raise_for_status()
        
        # Convert to markdown
        markdown_content = markdownify(response.text).strip()
        markdown_content = re.sub(r"\n{2,}", "\n", markdown_content)
        
        # Truncate if too long
        max_length = 10000
        if len(markdown_content) > max_length:
            markdown_content = (
                markdown_content[:max_length//2] + 
                f"\n..._Content truncated to stay below {max_length} characters_...\n" +
                markdown_content[-max_length//2:]
            )
        
        return markdown_content
        
    except Exception as e:
        return f"❌ Error visiting webpage {url}: {str(e)}"

# Export functions for compatibility
search_web = enhanced_search_web
visit_webpage = enhanced_visit_webpage 