#!/usr/bin/env python3
"""
AI Agent + Conditional Router Workflow Examples
These workflows show how to combine AI processing with intelligent routing
"""

def print_ai_conditional_workflows():
    """Print AI-powered conditional workflow scenarios"""
    
    print("🤖 AI Agent + Conditional Router Workflows")
    print("=" * 70)
    print("These workflows combine AI processing with intelligent routing decisions\n")
    
    workflows = [
        {
            "name": "📧 Smart Email Routing System",
            "description": "AI analyzes emails, router sends to appropriate teams",
            "workflow_structure": """
[Input: Email] → [AI Analyzer Agent] → [Conditional Router] → [Sales Team Agent]
                                                           → [Support Team Agent]
                                                           → [Billing Team Agent]
                                                           → [Spam Filter Agent]
            """,
            "setup": {
                "ai_agent": {
                    "name": "Email Analyzer",
                    "model": "gpt-4o-mini",
                    "instructions": """Analyze the incoming email and extract:
1. Intent: sales, support, billing, complaint, spam
2. Priority: high, medium, low  
3. Sentiment: positive, neutral, negative

Return JSON format:
{
  "intent": "sales",
  "priority": "high", 
  "sentiment": "positive",
  "confidence": 0.9
}"""
                },
                "conditions": [
                    "$.intent equals spam → Spam Filter",
                    "$.priority equals high → Priority Queue", 
                    "$.intent equals sales → Sales Team",
                    "$.intent equals billing → Billing Team",
                    "Default → General Support"
                ]
            },
            "test_inputs": [
                '"I want to upgrade to your premium plan ASAP!"',
                '"My payment failed again, this is the third time!"',
                '"Buy cheap watches here! Amazing deals!"',
                '"How do I reset my password?"'
            ]
        },
        {
            "name": "📄 Document Processing Pipeline", 
            "description": "AI classifies documents, router sends to specialized processors",
            "workflow_structure": """
[Input: Document] → [AI Classifier Agent] → [Conditional Router] → [Invoice Processor Agent]
                                                                 → [Contract Analyzer Agent]
                                                                 → [Resume Screener Agent]
                                                                 → [Manual Review Agent]
            """,
            "setup": {
                "ai_agent": {
                    "name": "Document Classifier",
                    "model": "gpt-4o-mini", 
                    "instructions": """Analyze the document and classify it:
1. Type: invoice, contract, resume, legal, other
2. Urgency: urgent, normal, low
3. Confidence: 0.0-1.0

Return JSON:
{
  "document_type": "invoice",
  "urgency": "normal",
  "confidence": 0.95,
  "requires_human": false
}"""
                },
                "conditions": [
                    "$.confidence less_than 0.7 → Manual Review",
                    "$.document_type equals invoice → Invoice Processor",
                    "$.document_type equals contract → Contract Analyzer", 
                    "$.document_type equals resume → Resume Screener",
                    "Default → General Processing"
                ]
            },
            "test_inputs": [
                '"Invoice #12345 - Amount Due: $1,250.00 - Due Date: Jan 30, 2024"',
                '"Employment Agreement between Company X and John Doe..."',
                '"John Smith - Software Engineer - 5 years experience..."',
                '"Random text that is hard to classify..."'
            ]
        },
        {
            "name": "🛡️ Content Moderation System",
            "description": "AI analyzes content safety, router decides action",
            "workflow_structure": """
[Input: Content] → [AI Safety Agent] → [Conditional Router] → [Auto Approve Agent]
                                                            → [Human Review Agent]  
                                                            → [Content Block Agent]
                                                            → [User Warning Agent]
            """,
            "setup": {
                "ai_agent": {
                    "name": "Content Safety Analyzer",
                    "model": "gpt-4o-mini",
                    "instructions": """Analyze content for safety issues:
1. Safety score: 0.0 (unsafe) to 1.0 (safe)
2. Issues: violence, hate, adult, spam, none
3. Action: approve, review, block, warn

Return JSON:
{
  "safety_score": 0.85,
  "issues": ["none"],
  "recommended_action": "approve",
  "reasoning": "Clean, family-friendly content"
}"""
                },
                "conditions": [
                    "$.safety_score less_than 0.3 → Content Block",
                    "$.safety_score less_than 0.6 → Human Review",
                    "$.recommended_action equals warn → User Warning",
                    "$.safety_score greater_than 0.8 → Auto Approve",
                    "Default → Human Review"
                ]
            },
            "test_inputs": [
                '"Check out this amazing sunset photo from my vacation!"',
                '"This tutorial will help you learn Python programming."',
                '"I hate this stupid website and everyone who uses it!"',
                '"Buy followers! Get rich quick! Amazing deals!"'
            ]
        },
        {
            "name": "🎯 Lead Qualification System",
            "description": "AI qualifies leads, router assigns to sales reps",
            "workflow_structure": """
[Input: Lead Info] → [AI Qualifier Agent] → [Conditional Router] → [Enterprise Sales Agent]
                                                                 → [SMB Sales Agent]
                                                                 → [Nurturing Agent]
                                                                 → [Disqualify Agent]
            """,
            "setup": {
                "ai_agent": {
                    "name": "Lead Qualifier",
                    "model": "gpt-4o-mini",
                    "instructions": """Analyze lead information and score:
1. Company size: enterprise (1000+), smb (10-999), small (1-9)
2. Budget potential: high, medium, low
3. Urgency: immediate, soon, someday
4. Lead score: 0-100

Return JSON:
{
  "company_size": "smb",
  "budget_potential": "high", 
  "urgency": "immediate",
  "lead_score": 85,
  "qualification": "qualified"
}"""
                },
                "conditions": [
                    "$.lead_score less_than 30 → Disqualify",
                    "$.company_size equals enterprise → Enterprise Sales",
                    "$.lead_score greater_than 70 → SMB Sales",
                    "$.urgency equals immediate → Priority Queue",
                    "Default → Nurturing Campaign"
                ]
            },
            "test_inputs": [
                '"Company: TechCorp (500 employees), Budget: $50K, Need: Immediate"',
                '"Company: MegaCorp (5000 employees), Budget: $500K, Timeline: Q1"',
                '"Company: StartupXYZ (5 employees), Budget: Unknown, Just browsing"',
                '"Company: SmallBiz (50 employees), Budget: $10K, Need: Next month"'
            ]
        }
    ]
    
    for i, workflow in enumerate(workflows, 1):
        print(f"{i}. {workflow['name']}")
        print(f"   📝 {workflow['description']}")
        print(f"   🏗️  Workflow Structure:")
        for line in workflow['workflow_structure'].strip().split('\n'):
            print(f"   {line}")
        print()
        print(f"   🤖 AI Agent Setup:")
        print(f"      Name: {workflow['setup']['ai_agent']['name']}")
        print(f"      Model: {workflow['setup']['ai_agent']['model']}")
        print(f"      Instructions: {workflow['setup']['ai_agent']['instructions'][:100]}...")
        print()
        print(f"   📋 Router Conditions:")
        for condition in workflow['setup']['conditions']:
            print(f"      • {condition}")
        print()
        print(f"   🧪 Test Inputs:")
        for j, test_input in enumerate(workflow['test_inputs'], 1):
            print(f"      {j}. {test_input}")
        print("\n" + "="*70 + "\n")

def print_building_instructions():
    """Print step-by-step instructions for building AI + conditional workflows"""
    
    print("🚀 How to Build AI + Conditional Router Workflows")
    print("=" * 70)
    
    steps = [
        "🏗️  Basic Workflow Structure:",
        "   1. Drag 'Input Node' to canvas",
        "   2. Drag 'Agent Node' (this will be your AI analyzer)",
        "   3. Drag 'Conditional Router' after the agent",
        "   4. Drag 3-4 more 'Agent Nodes' (specialized processors)",
        "   5. Connect: Input → AI Agent → Router → Specialist Agents",
        "",
        "🤖 Configure the AI Analyzer Agent:",
        "   1. Click on the first agent node", 
        "   2. Set Model: 'gpt-4o-mini' or 'gpt-4'",
        "   3. Set Instructions: Use the examples above",
        "   4. Key: Make sure it returns JSON with fields for routing",
        "",
        "🔀 Configure the Conditional Router:",
        "   1. Click 'Edit' on the conditional router",
        "   2. Add conditions based on AI agent output",
        "   3. Use JSONPath to query the AI response: $.intent, $.score, etc.",
        "   4. Set up routing logic based on AI analysis",
        "",
        "🎯 Configure Specialist Agents:",
        "   1. Each output agent handles a specific case",
        "   2. Customize instructions for each specialist",
        "   3. Examples: 'Sales Agent', 'Support Agent', 'Review Agent'",
        "",
        "🧪 Testing:",
        "   1. Execute with test inputs",
        "   2. Watch AI agent analyze the input", 
        "   3. See conditional router make routing decision",
        "   4. Verify correct specialist agent processes the result",
        "",
        "💡 Pro Tips:",
        "   • AI instructions should always specify JSON output format",
        "   • Use consistent field names for reliable routing",
        "   • Test edge cases where AI might be uncertain",
        "   • Include confidence scores for better routing decisions"
    ]
    
    for step in steps:
        print(step)

def print_sample_ai_instructions():
    """Print reusable AI agent instruction templates"""
    
    print("\n📝 Reusable AI Agent Instruction Templates")
    print("=" * 70)
    
    templates = [
        {
            "name": "Text Classifier Template",
            "use_case": "Categorizing any text input",
            "instructions": """Analyze the input text and classify it.

Categories: [category1, category2, category3]
Sentiment: positive, neutral, negative  
Confidence: 0.0 to 1.0

Return JSON format:
{
  "category": "category1",
  "sentiment": "positive", 
  "confidence": 0.95,
  "keywords": ["keyword1", "keyword2"]
}"""
        },
        {
            "name": "Scorer Template", 
            "use_case": "Scoring content on multiple dimensions",
            "instructions": """Score the input on multiple criteria:

1. Quality score: 0-100
2. Relevance score: 0-100  
3. Priority: high, medium, low
4. Action needed: immediate, review, archive

Return JSON:
{
  "quality_score": 85,
  "relevance_score": 90,
  "priority": "high",
  "action": "immediate"
}"""
        },
        {
            "name": "Extractor Template",
            "use_case": "Extracting structured data from text",
            "instructions": """Extract key information from the input:

Required fields:
- field1: description
- field2: description
- field3: description

Return JSON:
{
  "field1": "extracted_value1",
  "field2": "extracted_value2", 
  "field3": "extracted_value3",
  "extraction_confidence": 0.9
}"""
        }
    ]
    
    for template in templates:
        print(f"🔧 {template['name']}")
        print(f"   Use Case: {template['use_case']}")
        print("   Instructions:")
        for line in template['instructions'].split('\n'):
            print(f"   {line}")
        print()

if __name__ == "__main__":
    print_ai_conditional_workflows()
    print_building_instructions()
    print_sample_ai_instructions()
    
    print("=" * 70)
    print("🎯 Ready to build intelligent AI workflows!")
    print("💡 Start with the Email Routing System - it's practical and easy to test.") 