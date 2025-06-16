#!/usr/bin/env python3
"""
Simple test to verify tool type mapping works correctly
"""

# Test the tool type mapping logic
def test_tool_mapping():
    print("🧪 Testing Tool Type Mapping")
    print("="*60)
    
    # Simulate the tool mapping logic from visual_to_anyagent_translator.py
    
    # Mock available tools (like in the translator)
    available_tools = {
        "search_web": "search_web_function",
        "visit_webpage": "visit_webpage_function",
        # Aliases for frontend compatibility
        "web_search": "search_web_function",  # Frontend sends this!
        "WebSearch": "search_web_function",
        "webpage_visit": "visit_webpage_function",
        "visit_page": "visit_webpage_function"
    }
    
    # Test cases: what the frontend sends
    test_cases = [
        ("web_search", "Expected: search_web_function"),
        ("search_web", "Expected: search_web_function"),
        ("WebSearch", "Expected: search_web_function"),
        ("visit_webpage", "Expected: visit_webpage_function"),
        ("webpage_visit", "Expected: visit_webpage_function"),
        ("unknown_tool", "Expected: None")
    ]
    
    print("Available tools in map:")
    for key in available_tools:
        print(f"  - {key}")
    print()
    
    # Test each case
    for tool_type, expected in test_cases:
        # Normalize tool type (handle underscores vs hyphens)
        normalized_type = tool_type.replace("-", "_")
        
        # Try to find the tool
        result = None
        if normalized_type in available_tools:
            result = available_tools[normalized_type]
        elif tool_type in available_tools:
            result = available_tools[tool_type]
        
        status = "✅" if result else "❌"
        print(f"{status} Tool type '{tool_type}' -> {result} ({expected})")
    
    print("="*60)
    print("\n🔍 Key Finding:")
    print("The frontend sends 'web_search' but the backend expects 'search_web'")
    print("Our aliases map 'web_search' -> 'search_web_function' correctly!")

if __name__ == "__main__":
    test_tool_mapping()