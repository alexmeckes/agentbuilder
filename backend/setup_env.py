#!/usr/bin/env python3
"""
Environment Setup Helper

This script helps you set up the .env file with your OpenAI API key.
"""

import os
import sys
from dotenv import load_dotenv

def setup_environment():
    """Setup environment variables and configurations"""
    
    # Load .env file if it exists
    if os.path.exists('.env'):
        load_dotenv()
        print("📄 Loaded environment variables from .env file")
    
    # Set default execution mode if not specified
    if not os.getenv("USE_MOCK_EXECUTION"):
        os.environ["USE_MOCK_EXECUTION"] = "false"  # Default to real execution
        print("🔧 Set USE_MOCK_EXECUTION=false (real any-agent execution)")
    
    execution_mode = os.getenv("USE_MOCK_EXECUTION", "false").lower()
    
    if execution_mode == "true":
        print("📝 Running in WORKFLOW SUGGESTION MODE (Mock execution)")
        print("   - Provides intelligent workflow building guidance")
        print("   - No asyncio conflicts")
        print("   - Set USE_MOCK_EXECUTION=false for real any-agent execution")
    else:
        print("🤖 Running in REAL EXECUTION MODE")
        print("   - Uses any-agent multi-agent orchestration")  
        print("   - Asyncio conflicts resolved with process/thread isolation")
        print("   - Set USE_MOCK_EXECUTION=true for suggestion mode only")
    
    # Check for API keys
    if not os.getenv("OPENAI_API_KEY"):
        print("⚠️  Warning: OPENAI_API_KEY not set. OpenAI agents will not work.")
        print("🔧 Please set your OpenAI API key: export OPENAI_API_KEY='your_key_here'")
    
    return {
        "execution_mode": execution_mode,
        "openai_configured": bool(os.getenv("OPENAI_API_KEY")),
        "environment": "development" if os.getenv("DEBUG", "false").lower() == "true" else "production"
    }

if __name__ == "__main__":
    config = setup_environment()
    print(f"\n🎯 Configuration Summary:")
    print(f"   - Execution Mode: {'Suggestions' if config['execution_mode'] == 'true' else 'Real any-agent'}")
    print(f"   - OpenAI Configured: {config['openai_configured']}")
    print(f"   - Environment: {config['environment']}") 