#!/usr/bin/env python3
"""
Enhanced test script for conditional router node functionality
Tests all operators: equals, contains, not_equals, greater_than, less_than
"""

import sys
import os
import json
from typing import Dict, List, Any

# Import from the current directory (assumes we're running from backend/)
try:
    from visual_to_anyagent_translator import _evaluate_condition
except ImportError:
    # Fallback: add the backend directory to path
    sys.path.append(os.path.join(os.getcwd(), 'backend'))
    from backend.visual_to_anyagent_translator import _evaluate_condition

def test_all_operators():
    """Test all supported operators with various scenarios"""
    
    print("🧪 Testing All Conditional Router Operators")
    print("=" * 60)
    
    # Comprehensive test data
    test_data = {
        "user": "Alice",
        "age": 25,
        "score": 85.5,
        "status": "active",
        "priority": "high",
        "preferences": {
            "theme": "dark",
            "notifications": True
        },
        "tags": ["premium", "verified"],
        "metadata": {
            "created": "2024-01-15",
            "version": "2.1.0"
        }
    }
    
    # Comprehensive test cases for all operators
    test_cases = [
        # EQUALS operator tests
        {
            "name": "EQUALS - String match",
            "rule": {"jsonpath": "$.user", "operator": "equals", "value": "Alice"},
            "expected": True
        },
        {
            "name": "EQUALS - Number as string",
            "rule": {"jsonpath": "$.age", "operator": "equals", "value": "25"},
            "expected": True
        },
        {
            "name": "EQUALS - Nested object",
            "rule": {"jsonpath": "$.preferences.theme", "operator": "equals", "value": "dark"},
            "expected": True
        },
        {
            "name": "EQUALS - Failed match",
            "rule": {"jsonpath": "$.user", "operator": "equals", "value": "Bob"},
            "expected": False
        },
        
        # CONTAINS operator tests
        {
            "name": "CONTAINS - Substring match",
            "rule": {"jsonpath": "$.status", "operator": "contains", "value": "act"},
            "expected": True
        },
        {
            "name": "CONTAINS - Version string",
            "rule": {"jsonpath": "$.metadata.version", "operator": "contains", "value": "2.1"},
            "expected": True
        },
        {
            "name": "CONTAINS - Failed match",
            "rule": {"jsonpath": "$.user", "operator": "contains", "value": "xyz"},
            "expected": False
        },
        
        # NOT_EQUALS operator tests
        {
            "name": "NOT_EQUALS - Different string",
            "rule": {"jsonpath": "$.user", "operator": "not_equals", "value": "Bob"},
            "expected": True
        },
        {
            "name": "NOT_EQUALS - Different status",
            "rule": {"jsonpath": "$.status", "operator": "not_equals", "value": "inactive"},
            "expected": True
        },
        {
            "name": "NOT_EQUALS - Same value (should fail)",
            "rule": {"jsonpath": "$.user", "operator": "not_equals", "value": "Alice"},
            "expected": False
        },
        
        # GREATER_THAN operator tests
        {
            "name": "GREATER_THAN - Numeric comparison (true)",
            "rule": {"jsonpath": "$.age", "operator": "greater_than", "value": "20"},
            "expected": True
        },
        {
            "name": "GREATER_THAN - Float comparison (true)",
            "rule": {"jsonpath": "$.score", "operator": "greater_than", "value": "80"},
            "expected": True
        },
        {
            "name": "GREATER_THAN - Exact value (false)",
            "rule": {"jsonpath": "$.age", "operator": "greater_than", "value": "25"},
            "expected": False
        },
        {
            "name": "GREATER_THAN - String comparison",
            "rule": {"jsonpath": "$.priority", "operator": "greater_than", "value": "low"},
            "expected": False  # "high" < "low" in string comparison
        },
        {
            "name": "GREATER_THAN - Version string comparison",
            "rule": {"jsonpath": "$.metadata.version", "operator": "greater_than", "value": "2.0.0"},
            "expected": True  # "2.1.0" > "2.0.0" in string comparison
        },
        
        # LESS_THAN operator tests
        {
            "name": "LESS_THAN - Numeric comparison (true)",
            "rule": {"jsonpath": "$.age", "operator": "less_than", "value": "30"},
            "expected": True
        },
        {
            "name": "LESS_THAN - Float comparison (false)",
            "rule": {"jsonpath": "$.score", "operator": "less_than", "value": "80"},
            "expected": False
        },
        {
            "name": "LESS_THAN - Exact value (false)",
            "rule": {"jsonpath": "$.age", "operator": "less_than", "value": "25"},
            "expected": False
        },
        {
            "name": "LESS_THAN - String comparison",
            "rule": {"jsonpath": "$.priority", "operator": "less_than", "value": "medium"},
            "expected": True  # "high" < "medium" in string comparison
        },
        
        # Edge cases
        {
            "name": "EDGE CASE - Non-existent path",
            "rule": {"jsonpath": "$.nonexistent", "operator": "equals", "value": "anything"},
            "expected": False
        },
        {
            "name": "EDGE CASE - Array element access",
            "rule": {"jsonpath": "$.tags[0]", "operator": "equals", "value": "premium"},
            "expected": True
        },
        {
            "name": "EDGE CASE - Boolean as string",
            "rule": {"jsonpath": "$.preferences.notifications", "operator": "equals", "value": "True"},
            "expected": True
        }
    ]
    
    # Group tests by operator for better readability
    operators = {}
    for test_case in test_cases:
        op = test_case['rule']['operator']
        if op not in operators:
            operators[op] = []
        operators[op].append(test_case)
    
    # Run tests grouped by operator
    all_results = []
    for operator, tests in operators.items():
        print(f"\n📋 Testing {operator.upper().replace('_', ' ')} operator:")
        print("-" * 40)
        
        for i, test_case in enumerate(tests, 1):
            print(f"  {i}. {test_case['name']}")
            print(f"     Rule: {test_case['rule']}")
            
            try:
                result = _evaluate_condition(test_case['rule'], test_data)
                expected = test_case['expected']
                
                if result == expected:
                    print(f"     ✅ PASS: {result}")
                    all_results.append(True)
                else:
                    print(f"     ❌ FAIL: Expected {expected}, got {result}")
                    all_results.append(False)
                    
            except Exception as e:
                print(f"     ❌ ERROR: {str(e)}")
                all_results.append(False)
    
    # Summary
    passed = sum(all_results)
    total = len(all_results)
    print(f"\n{'='*60}")
    print(f"Test Summary: {passed}/{total} tests passed")
    
    if passed == total:
        print("🎉 All operator tests passed!")
    else:
        print(f"⚠️  {total - passed} tests failed")
    
    return passed == total

def test_complex_workflow_scenarios():
    """Test complex real-world workflow scenarios"""
    
    print("\n🔄 Testing Complex Workflow Scenarios")
    print("=" * 60)
    
    scenarios = [
        {
            "name": "E-commerce Order Processing",
            "description": "Route orders based on value and customer status",
            "input_data": {"order_value": 150, "customer_tier": "gold", "region": "US"},
            "conditions": [
                {"rule": {"jsonpath": "$.order_value", "operator": "greater_than", "value": "100"}, "path": "high_value"},
                {"rule": {"jsonpath": "$.customer_tier", "operator": "equals", "value": "gold"}, "path": "vip_processing"},
                {"rule": {"jsonpath": "$.region", "operator": "not_equals", "value": "US"}, "path": "international"}
            ],
            "expected_path": "high_value"  # First matching condition
        },
        {
            "name": "User Authentication Flow",
            "description": "Route users based on account status and verification",
            "input_data": {"account_status": "active", "email_verified": True, "login_attempts": 2},
            "conditions": [
                {"rule": {"jsonpath": "$.login_attempts", "operator": "greater_than", "value": "3"}, "path": "security_check"},
                {"rule": {"jsonpath": "$.account_status", "operator": "not_equals", "value": "active"}, "path": "account_recovery"},
                {"rule": {"jsonpath": "$.email_verified", "operator": "equals", "value": "True"}, "path": "normal_flow"}
            ],
            "expected_path": "normal_flow"
        },
        {
            "name": "Content Moderation",
            "description": "Route content based on safety scores and keywords",
            "input_data": {"safety_score": 0.85, "content_type": "image", "flagged_keywords": []},
            "conditions": [
                {"rule": {"jsonpath": "$.safety_score", "operator": "less_than", "value": "0.7"}, "path": "manual_review"},
                {"rule": {"jsonpath": "$.content_type", "operator": "contains", "value": "video"}, "path": "video_processing"},
                {"rule": {"jsonpath": "$.safety_score", "operator": "greater_than", "value": "0.8"}, "path": "auto_approve"}
            ],
            "expected_path": "auto_approve"
        }
    ]
    
    for i, scenario in enumerate(scenarios, 1):
        print(f"\n{i}. {scenario['name']}")
        print(f"   Description: {scenario['description']}")
        print(f"   Input: {scenario['input_data']}")
        
        # Simulate conditional routing
        selected_path = None
        for condition in scenario['conditions']:
            if _evaluate_condition(condition['rule'], scenario['input_data']):
                selected_path = condition['path']
                print(f"   Matched condition: {condition['rule']}")
                break
        
        if not selected_path:
            selected_path = "default"
        
        expected = scenario['expected_path']
        if selected_path == expected:
            print(f"   ✅ PASS: Routed to {selected_path}")
        else:
            print(f"   ❌ FAIL: Expected {expected}, got {selected_path}")
    
    print(f"\n{'='*60}")
    print("🎯 Complex workflow scenarios completed")

def test_performance():
    """Test performance with multiple conditions"""
    
    print("\n⚡ Testing Performance with Multiple Conditions")
    print("=" * 60)
    
    import time
    
    # Large test data
    large_data = {
        "users": [{"id": i, "score": i * 10, "status": "active" if i % 2 == 0 else "inactive"} for i in range(100)],
        "metadata": {"total_users": 100, "processing_time": 1.5},
        "config": {"max_score": 1000, "threshold": 500}
    }
    
    # Multiple conditions to test
    conditions = [
        {"jsonpath": "$.metadata.total_users", "operator": "greater_than", "value": "50"},
        {"jsonpath": "$.metadata.processing_time", "operator": "less_than", "value": "2.0"},
        {"jsonpath": "$.config.threshold", "operator": "equals", "value": "500"},
        {"jsonpath": "$.users[0].status", "operator": "equals", "value": "active"},
        {"jsonpath": "$.config.max_score", "operator": "greater_than", "value": "999"}
    ]
    
    # Run performance test
    start_time = time.time()
    iterations = 1000
    
    for _ in range(iterations):
        for condition in conditions:
            _evaluate_condition(condition, large_data)
    
    end_time = time.time()
    total_time = end_time - start_time
    avg_time = (total_time / (iterations * len(conditions))) * 1000  # Convert to milliseconds
    
    print(f"   Processed {iterations * len(conditions)} condition evaluations")
    print(f"   Total time: {total_time:.3f} seconds")
    print(f"   Average time per evaluation: {avg_time:.3f} ms")
    
    if avg_time < 1.0:  # Less than 1ms per evaluation is good
        print("   ✅ PASS: Performance is acceptable")
    else:
        print("   ⚠️  WARNING: Performance may need optimization")

if __name__ == "__main__":
    print("🚀 Starting Enhanced Conditional Router Tests\n")
    
    # Run comprehensive operator tests
    operators_passed = test_all_operators()
    
    # Run complex workflow scenarios
    test_complex_workflow_scenarios()
    
    # Run performance tests
    test_performance()
    
    print(f"\n{'='*70}")
    print("✨ Enhanced test execution completed!")
    
    if operators_passed:
        print("🎉 All operators working correctly!")
        print("🎯 Ready for production use in visual workflows!")
    else:
        print("⚠️  Some operator tests failed - review implementation") 