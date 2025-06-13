#!/usr/bin/env python3
"""
Test script for conditional router node functionality
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

def test_evaluate_condition():
    """Test the _evaluate_condition function with various scenarios"""
    
    print("🧪 Testing Conditional Router Node Logic")
    print("=" * 50)
    
    # Test data
    test_data = {
        "user": "Alice",
        "age": 25,
        "score": 85,
        "status": "active",
        "preferences": {
            "theme": "dark",
            "notifications": True
        },
        "tags": ["premium", "verified"]
    }
    
    # Test cases
    test_cases = [
        {
            "name": "Simple equality check",
            "rule": {
                "jsonpath": "$.user",
                "operator": "equals",
                "value": "Alice"
            },
            "expected": True
        },
        {
            "name": "Numeric comparison (equals)",
            "rule": {
                "jsonpath": "$.age",
                "operator": "equals",
                "value": "25"
            },
            "expected": True
        },
        {
            "name": "String contains check",
            "rule": {
                "jsonpath": "$.status",
                "operator": "contains",
                "value": "act"
            },
            "expected": True
        },
        {
            "name": "Nested object access",
            "rule": {
                "jsonpath": "$.preferences.theme",
                "operator": "equals",
                "value": "dark"
            },
            "expected": True
        },
        {
            "name": "Array element check",
            "rule": {
                "jsonpath": "$.tags[0]",
                "operator": "equals",
                "value": "premium"
            },
            "expected": True
        },
        {
            "name": "Failed equality check",
            "rule": {
                "jsonpath": "$.user",
                "operator": "equals",
                "value": "Bob"
            },
            "expected": False
        },
        {
            "name": "Non-existent path",
            "rule": {
                "jsonpath": "$.nonexistent",
                "operator": "equals",
                "value": "anything"
            },
            "expected": False
        }
    ]
    
    # Run tests
    results = []
    for i, test_case in enumerate(test_cases, 1):
        print(f"\n{i}. {test_case['name']}")
        print(f"   Rule: {test_case['rule']}")
        
        try:
            result = _evaluate_condition(test_case['rule'], test_data)
            expected = test_case['expected']
            
            if result == expected:
                print(f"   ✅ PASS: {result}")
                results.append(True)
            else:
                print(f"   ❌ FAIL: Expected {expected}, got {result}")
                results.append(False)
                
        except Exception as e:
            print(f"   ❌ ERROR: {str(e)}")
            results.append(False)
    
    # Summary
    passed = sum(results)
    total = len(results)
    print(f"\n{'='*50}")
    print(f"Test Summary: {passed}/{total} tests passed")
    
    if passed == total:
        print("🎉 All tests passed!")
    else:
        print(f"⚠️  {total - passed} tests failed")
    
    return passed == total

def test_conditional_workflow():
    """Test a complete conditional workflow scenario"""
    
    print("\n🔄 Testing Complete Conditional Workflow")
    print("=" * 50)
    
    # Sample workflow nodes
    nodes = [
        {
            "id": "input-1",
            "type": "input",
            "data": {
                "label": "Input Node",
                "name": "Input"
            }
        },
        {
            "id": "conditional-1",
            "type": "conditional",
            "data": {
                "label": "Age Router",
                "conditions": [
                    {
                        "id": "condition-adult",
                        "name": "Adult Path",
                        "rule": {
                            "jsonpath": "$.age",
                            "operator": "equals",
                            "value": "25"
                        }
                    },
                    {
                        "id": "condition-minor",
                        "name": "Minor Path",
                        "rule": {
                            "jsonpath": "$.age",
                            "operator": "equals",
                            "value": "17"
                        }
                    },
                    {
                        "id": "default",
                        "name": "Default Path",
                        "is_default": True
                    }
                ]
            }
        },
        {
            "id": "output-adult",
            "type": "output",
            "data": {
                "label": "Adult Output",
                "name": "AdultOutput"
            }
        },
        {
            "id": "output-minor",
            "type": "output",
            "data": {
                "label": "Minor Output",
                "name": "MinorOutput"
            }
        },
        {
            "id": "output-default",
            "type": "output",
            "data": {
                "label": "Default Output",
                "name": "DefaultOutput"
            }
        }
    ]
    
    # Sample edges
    edges = [
        {
            "id": "edge-1",
            "source": "input-1",
            "target": "conditional-1",
            "sourceHandle": "default",
            "targetHandle": "default"
        },
        {
            "id": "edge-2",
            "source": "conditional-1",
            "target": "output-adult",
            "sourceHandle": "condition-adult",
            "targetHandle": "default"
        },
        {
            "id": "edge-3",
            "source": "conditional-1",
            "target": "output-minor",
            "sourceHandle": "condition-minor",
            "targetHandle": "default"
        },
        {
            "id": "edge-4",
            "source": "conditional-1",
            "target": "output-default",
            "sourceHandle": "default",
            "targetHandle": "default"
        }
    ]
    
    # Test scenarios
    test_scenarios = [
        {
            "name": "Adult user (age 25)",
            "input_data": {"age": 25, "name": "Alice"},
            "expected_path": "output-adult"
        },
        {
            "name": "Minor user (age 17)",
            "input_data": {"age": 17, "name": "Bob"},
            "expected_path": "output-minor"
        },
        {
            "name": "Default case (age 30)",
            "input_data": {"age": 30, "name": "Charlie"},
            "expected_path": "output-default"
        }
    ]
    
    print("Workflow Structure:")
    print(f"  - Input → Conditional Router → 3 Output Paths")
    print(f"  - Conditions: age=25 (Adult), age=17 (Minor), Default")
    
    for i, scenario in enumerate(test_scenarios, 1):
        print(f"\n{i}. {scenario['name']}")
        print(f"   Input: {scenario['input_data']}")
        
        # Simulate the conditional logic
        conditional_node = next(n for n in nodes if n['type'] == 'conditional')
        conditions = conditional_node['data']['conditions']
        
        selected_path = None
        for condition in conditions:
            if condition.get('is_default'):
                continue
            
            if 'rule' in condition and _evaluate_condition(condition['rule'], scenario['input_data']):
                # Find the corresponding edge
                for edge in edges:
                    if edge['source'] == 'conditional-1' and edge['sourceHandle'] == condition['id']:
                        selected_path = edge['target']
                        break
                break
        
        # If no condition matched, use default
        if not selected_path:
            for edge in edges:
                if edge['source'] == 'conditional-1' and edge['sourceHandle'] == 'default':
                    selected_path = edge['target']
                    break
        
        expected = scenario['expected_path']
        if selected_path == expected:
            print(f"   ✅ PASS: Routed to {selected_path}")
        else:
            print(f"   ❌ FAIL: Expected {expected}, got {selected_path}")
    
    print(f"\n{'='*50}")
    print("🎯 Conditional workflow test completed")

if __name__ == "__main__":
    print("🚀 Starting Conditional Router Node Tests\n")
    
    # Run individual condition tests
    condition_tests_passed = test_evaluate_condition()
    
    # Run workflow tests
    test_conditional_workflow()
    
    print(f"\n{'='*60}")
    print("✨ Test execution completed!")
    
    if condition_tests_passed:
        print("🎉 Ready to test in the visual workflow designer!")
    else:
        print("⚠️  Some basic tests failed - check implementation") 