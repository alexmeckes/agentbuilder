#!/usr/bin/env python3
"""
Environment Setup Helper

This script helps you set up the .env file with your OpenAI API key.
"""

import os
import sys

def setup_env_file():
    """Create or update .env file with OpenAI API key"""
    
    print("🔧 OpenAI API Key Setup")
    print("=" * 50)
    
    # Check if .env already exists
    env_file = ".env"
    existing_content = ""
    if os.path.exists(env_file):
        with open(env_file, 'r') as f:
            existing_content = f.read()
        print(f"📄 Found existing {env_file} file")
    else:
        print(f"📄 Creating new {env_file} file")
    
    # Get API key from user
    print("\n🔑 Please enter your OpenAI API key:")
    print("   (You can get one from: https://platform.openai.com/api-keys)")
    print("   (Press Enter to skip if you want to set it manually later)")
    
    api_key = input("OpenAI API Key: ").strip()
    
    if not api_key:
        print("\n⚠️  No API key provided. Creating template .env file...")
        api_key = "sk-your-actual-openai-api-key-here"
    
    # Create .env content
    env_content = f"""# OpenAI API Configuration
OPENAI_API_KEY={api_key}

# Other optional environment variables
# OPENAI_BASE_URL=https://api.openai.com/v1
# OPENAI_MODEL=gpt-3.5-turbo
# OPENAI_TEMPERATURE=0.7

# any-agent framework settings
# DEBUG=true
"""
    
    # Write .env file
    with open(env_file, 'w') as f:
        f.write(env_content)
    
    print(f"\n✅ Created {env_file} file successfully!")
    
    if api_key == "sk-your-actual-openai-api-key-here":
        print(f"\n⚠️  Remember to edit {env_file} and replace the placeholder with your real API key")
        print(f"   File location: {os.path.abspath(env_file)}")
    else:
        print(f"\n🎉 API key configured! You can now start the backend.")
    
    print(f"\n📖 To start the backend:")
    print(f"   cd {os.path.dirname(os.path.abspath(__file__))}")
    print(f"   source venv/bin/activate")
    print(f"   python main.py")

if __name__ == "__main__":
    setup_env_file() 