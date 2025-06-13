#!/usr/bin/env python3
"""
Test script to verify analytics data generation and retrieval
"""

import requests
import json
import time

BACKEND_URL = "http://localhost:8000"

def test_analytics_flow():
    print("=== Testing Analytics Data Flow ===\n")
    
    # Step 1: Check if backend is running
    try:
        health = requests.get(f"{BACKEND_URL}/health")
        print(f"✅ Backend health check: {health.status_code}")
    except Exception as e:
        print(f"❌ Backend not accessible: {e}")
        print("Please ensure the backend is running on port 8000")
        return
    
    # Step 2: Get workflow analytics
    print("\n📊 Fetching workflow analytics...")
    try:
        analytics_response = requests.get(f"{BACKEND_URL}/analytics/workflows")
        analytics_data = analytics_response.json()
        
        print(f"Total workflows: {analytics_data.get('total_workflows', 0)}")
        print(f"Total executions: {analytics_data.get('total_executions', 0)}")
        print(f"Total cost: ${analytics_data.get('performance_overview', {}).get('total_cost', 0):.4f}")
        
        if analytics_data.get('recent_executions'):
            print(f"\nRecent executions found: {len(analytics_data['recent_executions'])}")
            for exec in analytics_data['recent_executions'][:3]:
                print(f"  - {exec['execution_id']}: {exec['status']} (${exec['cost']:.4f})")
        else:
            print("❌ No recent executions found")
            
    except Exception as e:
        print(f"❌ Error fetching analytics: {e}")
    
    # Step 3: Get execution list
    print("\n📋 Fetching executions...")
    try:
        exec_response = requests.get(f"{BACKEND_URL}/executions")
        executions = exec_response.json()
        
        if executions:
            print(f"Found {len(executions)} executions")
            # Get the most recent execution with completed status
            completed_execs = [e for e in executions if e.get('status') == 'completed']
            
            if completed_execs:
                latest_exec = completed_execs[0]
                exec_id = latest_exec['execution_id']
                print(f"\n🔍 Examining execution: {exec_id}")
                
                # Get trace data
                trace_response = requests.get(f"{BACKEND_URL}/executions/{exec_id}/trace")
                if trace_response.status_code == 200:
                    trace_data = trace_response.json()
                    trace = trace_data.get('trace', {})
                    
                    print(f"  Status: {trace_data.get('status')}")
                    print(f"  Has trace: {'Yes' if trace else 'No'}")
                    
                    if trace:
                        cost_info = trace.get('cost_info', {})
                        print(f"  Total cost: ${cost_info.get('total_cost', 0):.6f}")
                        print(f"  Total tokens: {cost_info.get('total_tokens', 0)}")
                        
                        spans = trace.get('spans', [])
                        print(f"  Spans: {len(spans)}")
                        
                        if spans:
                            print("\n  Sample span attributes:")
                            sample_span = spans[0]
                            attrs = sample_span.get('attributes', {})
                            for key in ['gen_ai.usage.input_tokens', 'gen_ai.usage.output_tokens', 
                                       'gen_ai.usage.input_cost', 'gen_ai.usage.output_cost']:
                                if key in attrs:
                                    print(f"    {key}: {attrs[key]}")
                    else:
                        print("  ⚠️  Trace data is empty")
                        
                    # Get performance data
                    perf_response = requests.get(f"{BACKEND_URL}/executions/{exec_id}/performance")
                    if perf_response.status_code == 200:
                        perf_data = perf_response.json()
                        overall = perf_data.get('overall_performance', {})
                        print(f"\n  Performance metrics:")
                        print(f"    Duration: {overall.get('total_duration_ms', 0):.2f}ms")
                        print(f"    Total cost: ${overall.get('total_cost', 0):.6f}")
                        print(f"    Total tokens: {overall.get('total_tokens', 0)}")
                else:
                    print(f"  ❌ Failed to get trace: {trace_response.status_code}")
            else:
                print("❌ No completed executions found")
        else:
            print("❌ No executions found at all")
            
    except Exception as e:
        print(f"❌ Error fetching executions: {e}")
        
    # Step 4: Create a test execution if none exist
    print("\n\n💡 If no executions exist, try running a workflow from the UI first.")
    print("   Or use the backend's test endpoint: POST /test/create-test-executions")

if __name__ == "__main__":
    test_analytics_flow()