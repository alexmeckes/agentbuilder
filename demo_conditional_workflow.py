#!/usr/bin/env python3
"""
Demonstration of Conditional Router in a practical workflow scenario
This simulates a customer support ticket routing system
"""

import json
from typing import Dict, Any, List

# Simulate the conditional router logic
def evaluate_condition(rule: Dict[str, str], data: Dict[str, Any]) -> bool:
    """Simplified version of the condition evaluation"""
    from jsonpath_ng import parse
    
    try:
        jsonpath_expression = parse(rule['jsonpath'])
        match = jsonpath_expression.find(data)
        
        if not match:
            return False

        extracted_value = match[0].value
        rule_value = rule['value']
        operator = rule['operator']

        if operator == 'equals':
            return str(extracted_value) == rule_value
        elif operator == 'contains':
            return rule_value in str(extracted_value)
        elif operator == 'not_equals':
            return str(extracted_value) != rule_value
        elif operator == 'greater_than':
            try:
                return float(extracted_value) > float(rule_value)
            except (ValueError, TypeError):
                return str(extracted_value) > rule_value
        elif operator == 'less_than':
            try:
                return float(extracted_value) < float(rule_value)
            except (ValueError, TypeError):
                return str(extracted_value) < rule_value
        
        return False
    except Exception as e:
        print(f"Error evaluating condition: {e}")
        return False

def route_support_ticket(ticket_data: Dict[str, Any]) -> str:
    """
    Simulate a support ticket routing workflow using conditional logic
    """
    print(f"📋 Processing Ticket: {ticket_data['ticket_id']}")
    print(f"   Customer: {ticket_data['customer_name']} ({ticket_data['customer_tier']})")
    print(f"   Issue: {ticket_data['subject']}")
    print(f"   Priority: {ticket_data['priority']}")
    print(f"   Category: {ticket_data['category']}")
    
    # Define routing conditions (in priority order)
    routing_conditions = [
        {
            "name": "Critical Emergency",
            "rule": {"jsonpath": "$.priority", "operator": "equals", "value": "critical"},
            "destination": "Emergency Response Team",
            "sla": "15 minutes"
        },
        {
            "name": "Enterprise VIP",
            "rule": {"jsonpath": "$.customer_tier", "operator": "equals", "value": "enterprise"},
            "destination": "Enterprise Support Team",
            "sla": "30 minutes"
        },
        {
            "name": "Billing Issues",
            "rule": {"jsonpath": "$.category", "operator": "contains", "value": "billing"},
            "destination": "Billing Specialist Team",
            "sla": "2 hours"
        },
        {
            "name": "Technical Issues",
            "rule": {"jsonpath": "$.category", "operator": "contains", "value": "technical"},
            "destination": "Technical Support Team",
            "sla": "4 hours"
        },
        {
            "name": "High Priority",
            "rule": {"jsonpath": "$.priority", "operator": "equals", "value": "high"},
            "destination": "Priority Support Team",
            "sla": "1 hour"
        }
    ]
    
    # Evaluate conditions in order
    for condition in routing_conditions:
        if evaluate_condition(condition['rule'], ticket_data):
            print(f"   ✅ Matched: {condition['name']}")
            print(f"   🎯 Routed to: {condition['destination']}")
            print(f"   ⏱️  SLA: {condition['sla']}")
            return condition['destination']
    
    # Default routing
    print(f"   📋 No specific conditions matched")
    print(f"   🎯 Routed to: General Support Team")
    print(f"   ⏱️  SLA: 24 hours")
    return "General Support Team"

def demo_workflow():
    """Demonstrate the conditional router with various ticket scenarios"""
    
    print("🎯 Customer Support Ticket Routing Demo")
    print("=" * 60)
    print("This demo shows how conditional routing works in practice")
    print("Each ticket is evaluated against conditions in priority order\n")
    
    # Sample support tickets
    tickets = [
        {
            "ticket_id": "T-001",
            "customer_name": "Acme Corp",
            "customer_tier": "enterprise",
            "subject": "Server outage affecting production",
            "category": "technical_critical",
            "priority": "critical",
            "created_time": "2024-01-15T10:30:00Z"
        },
        {
            "ticket_id": "T-002", 
            "customer_name": "Small Business Inc",
            "customer_tier": "professional",
            "subject": "Invoice payment not processing",
            "category": "billing_payment",
            "priority": "high",
            "created_time": "2024-01-15T11:15:00Z"
        },
        {
            "ticket_id": "T-003",
            "customer_name": "StartupXYZ",
            "customer_tier": "startup",
            "subject": "API rate limits too restrictive",
            "category": "technical_api",
            "priority": "medium",
            "created_time": "2024-01-15T12:00:00Z"
        },
        {
            "ticket_id": "T-004",
            "customer_name": "Enterprise Global",
            "customer_tier": "enterprise",
            "subject": "Need custom integration consultation",
            "category": "consultation",
            "priority": "low",
            "created_time": "2024-01-15T13:30:00Z"
        },
        {
            "ticket_id": "T-005",
            "customer_name": "Regular User",
            "customer_tier": "basic",
            "subject": "Password reset not working",
            "category": "account_access",
            "priority": "medium",
            "created_time": "2024-01-15T14:00:00Z"
        }
    ]
    
    # Process each ticket
    routing_results = []
    for i, ticket in enumerate(tickets, 1):
        print(f"\n{i}. Processing Ticket {ticket['ticket_id']}")
        print("-" * 40)
        
        destination = route_support_ticket(ticket)
        routing_results.append({
            "ticket_id": ticket['ticket_id'],
            "customer": ticket['customer_name'],
            "destination": destination
        })
        
        print()
    
    # Summary
    print("📊 Routing Summary")
    print("=" * 60)
    
    # Group by destination
    destinations = {}
    for result in routing_results:
        dest = result['destination']
        if dest not in destinations:
            destinations[dest] = []
        destinations[dest].append(result)
    
    for destination, tickets in destinations.items():
        print(f"\n🏢 {destination}:")
        for ticket in tickets:
            print(f"   • {ticket['ticket_id']} - {ticket['customer']}")
    
    print(f"\n✨ Processed {len(tickets)} tickets with automated routing!")
    print("🎯 Each ticket was routed based on its specific conditions")

def show_condition_examples():
    """Show examples of different condition types"""
    
    print("\n🧪 Condition Examples")
    print("=" * 60)
    
    examples = [
        {
            "name": "Priority Routing",
            "data": {"priority": "critical", "user": "admin"},
            "condition": {"jsonpath": "$.priority", "operator": "equals", "value": "critical"},
            "description": "Route critical issues to emergency team"
        },
        {
            "name": "Tier-based Routing", 
            "data": {"customer_tier": "enterprise", "support_level": "premium"},
            "condition": {"jsonpath": "$.customer_tier", "operator": "equals", "value": "enterprise"},
            "description": "Enterprise customers get premium support"
        },
        {
            "name": "Keyword Detection",
            "data": {"subject": "billing payment failed", "category": "finance"},
            "condition": {"jsonpath": "$.subject", "operator": "contains", "value": "billing"},
            "description": "Detect billing-related issues"
        },
        {
            "name": "Threshold Checking",
            "data": {"severity_score": 8.5, "impact": "high"},
            "condition": {"jsonpath": "$.severity_score", "operator": "greater_than", "value": "7.0"},
            "description": "High severity issues need immediate attention"
        },
        {
            "name": "Exclusion Logic",
            "data": {"account_type": "premium", "status": "active"},
            "condition": {"jsonpath": "$.account_type", "operator": "not_equals", "value": "trial"},
            "description": "Skip trial accounts for premium features"
        }
    ]
    
    for i, example in enumerate(examples, 1):
        print(f"\n{i}. {example['name']}")
        print(f"   Data: {json.dumps(example['data'], indent=8)}")
        print(f"   Condition: {json.dumps(example['condition'], indent=14)}")
        print(f"   Result: {evaluate_condition(example['condition'], example['data'])}")
        print(f"   Use Case: {example['description']}")

if __name__ == "__main__":
    print("🚀 Conditional Router Workflow Demo\n")
    
    # Run the main demo
    demo_workflow()
    
    # Show condition examples
    show_condition_examples()
    
    print(f"\n{'='*70}")
    print("🎉 Demo completed!")
    print("💡 This shows how conditional routing enables sophisticated workflow logic")
    print("🔧 You can now build similar logic in the visual workflow designer!") 