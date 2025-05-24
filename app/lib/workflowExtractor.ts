/**
 * Workflow Context Extractor
 * 
 * This module provides intelligent extraction of workflow context from AI assistant responses
 * to generate relevant input suggestions for users. It analyzes assistant messages to:
 * 
 * 1. Extract specific examples mentioned in quotes or after trigger words
 * 2. Identify workflow patterns (data analysis, automation, content generation, etc.)
 * 3. Parse actionable steps and recommendations
 * 4. Generate contextual placeholder text for the input field
 * 
 * The extracted context is used to:
 * - Show dynamic input suggestions that appear temporarily
 * - Update input placeholder text based on workflow type
 * - Display workflow type badges in the chat header
 * 
 * @example
 * // When AI says: "You could create a data analysis workflow"
 * // This returns: { suggestion: "Analyze sales data from last quarter", workflowType: "data-analysis" }
 */

interface WorkflowContext {
  suggestion: string
  context: string
  workflowType?: string
}

/**
 * Extracts workflow context and generates relevant suggestions from AI assistant content
 * @param content - The AI assistant's response content
 * @returns WorkflowContext object with suggestion and type, or null if no context found
 */
export function extractWorkflowContext(content: string): WorkflowContext | null {
  if (!content) return null

  // Clean the content for analysis
  const cleanContent = content.toLowerCase().replace(/[^\w\s]/g, ' ')
  
  // Look for specific examples first (they're often in quotes or after "like" or "such as")
  const examplePatterns = [
    /"([^"]{15,80})"/g,  // Content in quotes
    /like:\s*"([^"]{15,80})"/gi,  // After "like:"
    /such as:\s*"([^"]{15,80})"/gi,  // After "such as:"
    /example:\s*"([^"]{15,80})"/gi,  // After "example:"
    /try:\s*"([^"]{15,80})"/gi,  // After "try:"
  ]

  for (const pattern of examplePatterns) {
    const matches = content.matchAll(pattern)
    for (const match of matches) {
      if (match[1] && match[1].length >= 15 && match[1].length <= 80) {
        const example = match[1].trim()
        return {
          suggestion: example.charAt(0).toUpperCase() + example.slice(1),
          context: 'specific example from AI',
          workflowType: 'custom'
        }
      }
    }
  }

  // Common workflow patterns and their corresponding suggestions
  const workflowPatterns = [
    {
      patterns: ['data analysis', 'analyze data', 'data processing', 'process data', 'data pipeline'],
      suggestions: [
        'Analyze sales data from the last quarter',
        'Process customer feedback data and extract insights',
        'Create a data cleaning and validation pipeline',
        'Build automated reporting from database'
      ],
      context: 'data analysis workflow',
      type: 'data-analysis'
    },
    {
      patterns: ['research', 'gather information', 'find information', 'search', 'investigate'],
      suggestions: [
        'Research competitors in the tech industry',
        'Find information about market trends in 2024',
        'Gather data on user preferences and behavior',
        'Investigate best practices for customer retention'
      ],
      context: 'research workflow',
      type: 'research'
    },
    {
      patterns: ['content generation', 'create content', 'generate content', 'write', 'blog', 'article'],
      suggestions: [
        'Generate blog posts about AI trends and insights',
        'Create engaging social media content',
        'Write product descriptions for e-commerce',
        'Generate newsletter content automatically'
      ],
      context: 'content generation workflow',
      type: 'content'
    },
    {
      patterns: ['automation', 'automate', 'task automation', 'workflow automation', 'schedule'],
      suggestions: [
        'Automate email responses to customer inquiries',
        'Create an automated reporting and alert system',
        'Build a customer onboarding workflow',
        'Schedule social media posts automatically'
      ],
      context: 'automation workflow',
      type: 'automation'
    },
    {
      patterns: ['monitoring', 'track', 'observe', 'watch', 'surveillance', 'alert'],
      suggestions: [
        'Monitor website performance and uptime',
        'Track user engagement metrics across platforms',
        'Observe system health and resource usage',
        'Set up alerts for critical system events'
      ],
      context: 'monitoring workflow',
      type: 'monitoring'
    },
    {
      patterns: ['notification', 'alert', 'notify', 'inform', 'message', 'communication'],
      suggestions: [
        'Send alerts for system errors and outages',
        'Notify team members about project updates',
        'Alert customers about order status changes',
        'Create automated status update messages'
      ],
      context: 'notification workflow',
      type: 'notification'
    },
    {
      patterns: ['integration', 'connect', 'sync', 'api', 'webhook', 'combine'],
      suggestions: [
        'Integrate Slack with project management tools',
        'Sync data between CRM and email platform',
        'Connect payment system with inventory management',
        'Build API workflows between different services'
      ],
      context: 'integration workflow',
      type: 'integration'
    },
    {
      patterns: ['recommendation', 'suggest', 'recommend', 'advice', 'personalize'],
      suggestions: [
        'Recommend products to customers based on history',
        'Suggest content based on user behavior patterns',
        'Provide personalized recommendations for users',
        'Create smart product suggestion engine'
      ],
      context: 'recommendation workflow',
      type: 'recommendation'
    },
    {
      patterns: ['approval', 'review', 'workflow', 'process', 'manage'],
      suggestions: [
        'Create a document approval workflow',
        'Build a content review and publishing process',
        'Design employee leave request system',
        'Set up project milestone approval process'
      ],
      context: 'approval workflow',
      type: 'approval'
    },
    {
      patterns: ['customer service', 'support', 'helpdesk', 'ticket'],
      suggestions: [
        'Automate customer support ticket routing',
        'Create FAQ response system',
        'Build customer service escalation workflow',
        'Design automated help desk responses'
      ],
      context: 'customer service workflow',
      type: 'support'
    }
  ]

  // Find matching patterns
  for (const pattern of workflowPatterns) {
    if (pattern.patterns.some(p => cleanContent.includes(p))) {
      const randomSuggestion = pattern.suggestions[Math.floor(Math.random() * pattern.suggestions.length)]
      return {
        suggestion: randomSuggestion,
        context: pattern.context,
        workflowType: pattern.type
      }
    }
  }

  // Look for action words that might indicate next steps
  const actionWords = ['create', 'build', 'design', 'implement', 'add', 'configure', 'set up', 'develop']
  const sentences = content.split(/[.!?]+/)
  
  for (const sentence of sentences) {
    const lowerSentence = sentence.toLowerCase().trim()
    if (actionWords.some(word => lowerSentence.includes(word)) && 
        lowerSentence.length > 20 && lowerSentence.length < 150) {
      // Clean up the sentence to make it a good suggestion
      const cleanSuggestion = sentence.trim()
        .replace(/^(you can|you could|try to|you might|you should|consider|maybe|perhaps)\s*/i, '')
        .replace(/^(to\s+)/i, '')
        .replace(/[.!?]*$/, '')
        .trim()
      
      if (cleanSuggestion.length > 15 && cleanSuggestion.length < 100) {
        return {
          suggestion: cleanSuggestion.charAt(0).toUpperCase() + cleanSuggestion.slice(1),
          context: 'workflow action from response',
          workflowType: 'action'
        }
      }
    }
  }

  // Look for workflow steps or processes mentioned
  const stepMatches = content.match(/step \d+[:\-\s]+([^.!?]{20,80})/gi)
  if (stepMatches && stepMatches.length > 0) {
    const step = stepMatches[0].replace(/step \d+[:\-\s]+/i, '').trim()
    if (step.length > 15) {
      return {
        suggestion: step.charAt(0).toUpperCase() + step.slice(1),
        context: 'workflow step',
        workflowType: 'step'
      }
    }
  }

  // Default fallback suggestions based on common workflow needs
  const fallbackSuggestions = [
    'Create a workflow for task automation',
    'Build a data processing pipeline',
    'Design a content approval workflow',
    'Set up an alert and monitoring system',
    'Configure API integrations between services',
    'Create a customer onboarding process',
    'Build an automated reporting system',
    'Design a content generation pipeline'
  ]

  return {
    suggestion: fallbackSuggestions[Math.floor(Math.random() * fallbackSuggestions.length)],
    context: 'general workflow suggestion',
    workflowType: 'general'
  }
}

/**
 * Generates contextual placeholder text for the input field based on workflow type
 * @param workflowType - The type of workflow context (e.g., 'data-analysis', 'automation')
 * @returns Contextual placeholder text suggesting relevant actions
 */
export function generateContextualPlaceholder(workflowType?: string): string {
  const placeholders: Record<string, string> = {
    'data-analysis': 'Try: "Process customer data" or "Analyze user behavior"',
    'research': 'Try: "Research market trends" or "Find competitor analysis"',
    'content': 'Try: "Generate blog content" or "Create marketing copy"',
    'automation': 'Try: "Automate email workflows" or "Build approval process"',
    'monitoring': 'Try: "Monitor system health" or "Track user engagement"',
    'notification': 'Try: "Send status updates" or "Alert on errors"',
    'integration': 'Try: "Connect APIs" or "Sync data sources"',
    'recommendation': 'Try: "Recommend products" or "Suggest content"',
    'approval': 'Try: "Create approval workflow" or "Design review process"',
    'support': 'Try: "Automate customer support" or "Build help desk"',
    'action': 'Continue building your workflow...',
    'step': 'What\'s the next step in your workflow?',
    'custom': 'Ask about modifications or add more details...',
    'default': 'Ask about workflow design, node configuration, or best practices...'
  }

  return placeholders[workflowType || 'default'] || placeholders.default
} 