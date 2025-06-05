#!/usr/bin/env python3
"""
Test script to discover real Composio action names
"""

import os
import sys
import requests
import json
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def test_composio_api():
    """Test Composio API endpoints to discover real action names"""
    
    # Get API key from environment or prompt
    api_key = os.getenv('COMPOSIO_API_KEY')
    if not api_key:
        api_key = input("Enter your Composio API key: ").strip()
    
    if not api_key:
        print("❌ No API key provided")
        return
    
    headers = {
        'x-api-key': api_key,
        'Content-Type': 'application/json'
    }
    
    print(f"🔍 Testing with API key: {api_key[:8]}...")
    
    # Test 1: Get connected accounts
    print("\n1️⃣ Testing connected accounts...")
    try:
        response = requests.get(
            'https://backend.composio.dev/api/v1/connectedAccounts',
            headers=headers,
            timeout=10
        )
        print(f"Status: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print("✅ Connected accounts response:")
            print(json.dumps(data, indent=2))
            
            if data.get('items'):
                connected_apps = [item.get('appName') for item in data['items']]
                print(f"📱 Connected apps: {connected_apps}")
            else:
                print("⚠️ No connected accounts found")
        else:
            print(f"❌ Error: {response.status_code}")
            print(response.text[:500])
    except Exception as e:
        print(f"❌ Exception: {e}")
    
    # Test 2: Get Google Docs actions specifically
    print("\n2️⃣ Testing Google Docs actions...")
    try:
        response = requests.get(
            'https://backend.composio.dev/api/v2/actions?appNames=googledocs&limit=20',
            headers=headers,
            timeout=10
        )
        print(f"Status: {response.status_code}")
        print(f"Content-Type: {response.headers.get('content-type', 'unknown')}")
        
        if response.status_code == 200:
            # Try to parse as JSON
            try:
                data = response.json()
                print("✅ Google Docs actions response:")
                if data.get('items'):
                    for action in data['items']:
                        print(f"  📄 {action.get('name')} - {action.get('description', 'No description')}")
                else:
                    print("⚠️ No actions found")
            except json.JSONDecodeError:
                print("❌ Response is not JSON:")
                print(response.text[:500])
        else:
            print(f"❌ Error: {response.status_code}")
            print(response.text[:500])
    except Exception as e:
        print(f"❌ Exception: {e}")
    
    # Test 3: Try different variations of the endpoint
    print("\n3️⃣ Testing alternative action endpoints...")
    
    endpoints_to_try = [
        'https://backend.composio.dev/api/v1/actions?appNames=googledocs',
        'https://backend.composio.dev/api/v2/actions?appNames=GOOGLEDOCS',
        'https://backend.composio.dev/api/v2/actions?apps=googledocs',
        'https://backend.composio.dev/api/v1/apps/googledocs/actions',
    ]
    
    for endpoint in endpoints_to_try:
        try:
            print(f"\n🔍 Trying: {endpoint}")
            response = requests.get(endpoint, headers=headers, timeout=5)
            print(f"Status: {response.status_code}, Content-Type: {response.headers.get('content-type', 'unknown')}")
            
            if response.status_code == 200:
                try:
                    data = response.json()
                    if isinstance(data, dict) and data.get('items'):
                        print(f"✅ Found {len(data['items'])} actions!")
                        for action in data['items'][:3]:  # Show first 3
                            print(f"  📄 {action.get('name')} - {action.get('description', 'No description')}")
                    elif isinstance(data, list) and len(data) > 0:
                        print(f"✅ Found {len(data)} actions!")
                        for action in data[:3]:  # Show first 3
                            print(f"  📄 {action.get('name')} - {action.get('description', 'No description')}")
                    else:
                        print("⚠️ Valid JSON but no actions found")
                except json.JSONDecodeError:
                    print("❌ Not JSON, probably HTML error page")
            else:
                print(f"❌ Failed with {response.status_code}")
        except Exception as e:
            print(f"❌ Exception: {e}")

if __name__ == "__main__":
    test_composio_api() 