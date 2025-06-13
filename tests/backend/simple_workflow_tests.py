#!/usr/bin/env python3
"""
Simple workflow test scenarios for the conditional router
Copy these JSON inputs into your visual workflow designer to test
"""

def print_test_scenarios():
    """Print test scenarios that can be copied into the visual interface"""
    
    print("🧪 Simple Conditional Router Test Scenarios")
    print("=" * 60)
    print("Copy these JSON inputs into your workflow designer to test different paths\n")
    
    scenarios = [
        {
            "name": "🎂 Age Verification Workflow",
            "description": "Route users based on age",
            "conditions": [
                "$.age greater_than 17 → Adult Content",
                "$.age greater_than 12 → Teen Content", 
                "$.age less_than 13 → Child Content"
            ],
            "test_inputs": [
                '{"age": 25, "name": "Alice"}',
                '{"age": 16, "name": "Bob"}', 
                '{"age": 8, "name": "Charlie"}',
                '{"age": 18, "name": "Diana"}'
            ]
        },
        {
            "name": "🎫 Support Ticket Routing",
            "description": "Route tickets to specialized teams",
            "conditions": [
                "$.priority equals critical → Emergency Team",
                "$.category contains billing → Billing Team",
                "$.customer_tier equals enterprise → VIP Support"
            ],
            "test_inputs": [
                '{"priority": "critical", "issue": "server down"}',
                '{"category": "billing_payment", "customer": "startup"}',
                '{"customer_tier": "enterprise", "issue": "integration"}',
                '{"priority": "low", "category": "general", "customer": "basic"}'
            ]
        },
        {
            "name": "🛡️ Content Moderation",
            "description": "Route content based on safety",
            "conditions": [
                "$.safety_score less_than 0.5 → Manual Review",
                "$.content_type contains video → Video Processing", 
                "$.safety_score greater_than 0.8 → Auto Approve"
            ],
            "test_inputs": [
                '{"safety_score": 0.3, "content_type": "text"}',
                '{"safety_score": 0.9, "content_type": "image"}',
                '{"safety_score": 0.7, "content_type": "video_upload"}',
                '{"safety_score": 0.6, "content_type": "article"}'
            ]
        },
        {
            "name": "🛒 E-commerce Orders",
            "description": "Route orders by value and customer",
            "conditions": [
                "$.order_value greater_than 100 → VIP Processing",
                "$.customer_tier equals gold → Priority Queue",
                "$.region not_equals US → International Team"
            ],
            "test_inputs": [
                '{"order_value": 250, "customer_tier": "silver", "region": "US"}',
                '{"order_value": 50, "customer_tier": "gold", "region": "US"}',
                '{"order_value": 75, "customer_tier": "basic", "region": "UK"}',
                '{"order_value": 25, "customer_tier": "basic", "region": "US"}'
            ]
        },
        {
            "name": "🔐 User Authentication",
            "description": "Route users based on account status",
            "conditions": [
                "$.login_attempts greater_than 3 → Security Check",
                "$.account_status not_equals active → Account Recovery",
                "$.email_verified equals false → Email Verification"
            ],
            "test_inputs": [
                '{"login_attempts": 5, "account_status": "active"}',
                '{"login_attempts": 1, "account_status": "suspended"}',
                '{"login_attempts": 2, "account_status": "active", "email_verified": false}',
                '{"login_attempts": 1, "account_status": "active", "email_verified": true}'
            ]
        }
    ]
    
    for i, scenario in enumerate(scenarios, 1):
        print(f"{i}. {scenario['name']}")
        print(f"   📝 {scenario['description']}")
        print("   📋 Conditions:")
        for condition in scenario['conditions']:
            print(f"      • {condition}")
        print("   🧪 Test Inputs:")
        for j, test_input in enumerate(scenario['test_inputs'], 1):
            print(f"      {j}. {test_input}")
        print()

def print_simple_step_by_step():
    """Print step-by-step instructions for testing"""
    
    print("🚀 How to Test in Visual Workflow Designer")
    print("=" * 60)
    
    steps = [
        "Start the servers:",
        "  cd backend && source venv/bin/activate && python main.py",
        "  cd frontend && npm run dev",
        "",
        "Open http://localhost:3001 in your browser",
        "",
        "Create a simple workflow:",
        "  1. Drag 'Input Node' to canvas",
        "  2. Drag 'Conditional Router' to canvas", 
        "  3. Drag 2-3 'Agent Nodes' to canvas",
        "  4. Connect: Input → Conditional Router → Agents",
        "",
        "Configure the Conditional Router:",
        "  1. Click 'Edit' on the conditional router",
        "  2. Add conditions using the examples above",
        "  3. Save the configuration",
        "",
        "Test with sample data:",
        "  1. Click 'Execute' on the workflow",
        "  2. Paste one of the JSON inputs above",
        "  3. Watch which path the data takes",
        "",
        "Try different inputs to test different paths!"
    ]
    
    for step in steps:
        print(step)

def print_debugging_tips():
    """Print tips for debugging conditional router workflows"""
    
    print("\n🔧 Debugging Tips")
    print("=" * 60)
    
    tips = [
        "💡 Start Simple:",
        "   • Test with just 1-2 conditions first",
        "   • Use basic data like {\"age\": 25}",
        "   • Verify each condition works individually",
        "",
        "🔍 Check JSONPath Syntax:",
        "   • Use $.field for simple fields",
        "   • Use $.nested.field for nested objects", 
        "   • Test JSONPath expressions online first",
        "",
        "⚠️ Common Issues:",
        "   • Numbers are compared as strings by default",
        "   • Use quotes around numeric values: \"25\" not 25",
        "   • Check condition order - first match wins",
        "",
        "📊 Monitor Execution:",
        "   • Watch the browser console for errors",
        "   • Check which condition matched in the logs",
        "   • Verify the correct output path is taken"
    ]
    
    for tip in tips:
        print(tip)

if __name__ == "__main__":
    print_test_scenarios()
    print_simple_step_by_step()
    print_debugging_tips()
    
    print("\n" + "=" * 70)
    print("🎯 Ready to test! Copy the JSON inputs above into your workflow designer.")
    print("💡 Start with the Age Verification workflow - it's the simplest to understand.") 