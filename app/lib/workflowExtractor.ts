/**
 * Workflow Context Extractor
 * 
 * This module provides intelligent extraction of workflow context from AI assistant responses
 * to generate relevant input suggestions for users. It uses an LLM to analyze assistant messages and:
 * 
 * 1. Extract the main topic and intent from the conversation
 * 2. Generate contextually relevant workflow suggestions
 * 3. Identify workflow patterns and types
 * 4. Create actionable input suggestions for users
 * 
 * The extracted context is used to:
 * - Show dynamic input suggestions that appear temporarily
 * - Update input placeholder text based on workflow type
 * - Display workflow type badges in the chat header
 * 
 * @example
 * // When AI discusses grizzly bears in Yellowstone
 * // This returns: { suggestion: "Find best grizzly bear viewing spots in Yellowstone", workflowType: "travel" }
 */

interface WorkflowContext {
  suggestion: string
  context: string
  workflowType?: string
}

/**
 * Extracts workflow context and generates relevant suggestions from AI assistant content using LLM
 * @param content - The AI assistant's response content
 * @returns WorkflowContext object with suggestion and type, or null if no context found
 */
export async function extractWorkflowContext(content: string): Promise<WorkflowContext | null> {
  if (!content || content.length < 20) return null

  console.log('🔍 Extracting context from:', content.substring(0, 200) + '...')

  try {
    // Use LLM to intelligently extract context and generate suggestions
    const contextResult = await extractContextWithLLM(content)
    
    if (contextResult) {
      console.log('✅ LLM extracted context:', contextResult)
      return contextResult
    }

    // Fallback to pattern matching if LLM fails
    console.log('⚠️ LLM extraction failed, falling back to pattern matching')
    return extractContextWithPatterns(content)

  } catch (error) {
    console.error('❌ Error in LLM context extraction:', error)
    // Fallback to pattern matching
    return extractContextWithPatterns(content)
  }
}

/**
 * Uses LLM to extract workflow context and generate suggestions
 */
async function extractContextWithLLM(content: string): Promise<WorkflowContext | null> {
  const prompt = `Analyze this AI assistant response and extract a relevant workflow suggestion for the user.

AI Response: "${content}"

Based on this response, generate:
1. A specific, actionable workflow suggestion (10-60 characters) that the user might want to create
2. The workflow type category
3. Brief context explanation

Focus on the main topic/intent. If the AI is discussing grizzly bears in Yellowstone, suggest something like "Find grizzly bear spots in Yellowstone". If discussing data analysis, suggest "Analyze customer data" etc.

Respond in this exact JSON format:
{
  "suggestion": "specific actionable suggestion here",
  "workflowType": "category like travel, data-analysis, research, etc",
  "context": "brief explanation"
}

If no clear workflow suggestion can be extracted, respond with: {"suggestion": null}`

  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: [
          {
            role: 'system',
            content: 'You are a workflow suggestion expert. Extract actionable workflow suggestions from AI responses. Always respond with valid JSON only.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        workflowContext: { nodes: [], edges: [] },
        extractionMode: true // Flag to indicate this is for context extraction
      }),
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data = await response.json()
    const llmResponse = data.message

    // Parse the JSON response from the LLM
    const jsonMatch = llmResponse.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error('No JSON found in LLM response')
    }

    const parsed = JSON.parse(jsonMatch[0])
    
    if (parsed.suggestion && parsed.suggestion !== null) {
      return {
        suggestion: parsed.suggestion,
        context: parsed.context || 'LLM-generated suggestion',
        workflowType: parsed.workflowType || detectWorkflowType(content)
      }
    }

    return null

  } catch (error) {
    console.error('LLM context extraction error:', error)
    throw error
  }
}

/**
 * Fallback pattern-based context extraction (original implementation)
 */
function extractContextWithPatterns(content: string): WorkflowContext | null {
  console.log('🔄 Using pattern-based fallback extraction')

  // Look for specific examples in quotes first (most relevant)
  const quotedExamples = content.match(/"([^"]{10,150})"/g)
  if (quotedExamples && quotedExamples.length > 0) {
    // Use the first quoted example as it's usually most relevant
    const example = quotedExamples[0].replace(/"/g, '').trim()
    if (example.length >= 10 && example.length <= 150) {
      console.log('✅ Found quoted example:', example)
      return {
        suggestion: example.charAt(0).toUpperCase() + example.slice(1),
        context: 'quoted example from AI response',
        workflowType: detectWorkflowType(content)
      }
    }
  }

  // Look for specific topic-based suggestions (e.g., "grizzly bears in Yellowstone")
  const topicSuggestion = extractTopicBasedSuggestion(content)
  if (topicSuggestion) {
    console.log('✅ Found topic-based suggestion:', topicSuggestion)
    return {
      suggestion: topicSuggestion,
      context: 'topic-based extraction from AI response',
      workflowType: detectWorkflowType(content)
    }
  }

  // Look for action-oriented sentences that could be suggestions
  const actionSuggestion = extractActionSuggestion(content)
  if (actionSuggestion) {
    console.log('✅ Found action suggestion:', actionSuggestion)
    return {
      suggestion: actionSuggestion,
      context: 'action-oriented sentence from AI response',
      workflowType: detectWorkflowType(content)
    }
  }

  console.log('❌ No workflow context extracted with patterns')
  return null
}

/**
 * Extracts topic-based suggestions from content (e.g., "grizzly bears in Yellowstone")
 */
function extractTopicBasedSuggestion(content: string): string | null {
  // Look for specific topics and locations mentioned in the content
  const topicPatterns = [
    // Wildlife and nature
    /(?:find|see|spot|locate|discover|visit)\s+(?:the\s+)?(?:best\s+)?(?:spots?|places?|locations?|areas?)\s+(?:to\s+)?(?:see|find|spot|watch|observe)\s+([^.!?]{10,80})/gi,
    // Travel and destinations
    /(?:travel|visit|go|trip)\s+(?:to\s+)?([^.!?]{10,60})/gi,
    // Research topics
    /(?:research|analyze|study|investigate|explore)\s+([^.!?]{10,60})/gi,
    // General workflow topics
    /(?:workflow|process|system)\s+(?:for|to|that)\s+(?:helps?|finds?|analyzes?|creates?|builds?)\s+([^.!?]{10,80})/gi
  ]

  for (const pattern of topicPatterns) {
    const matches = [...content.matchAll(pattern)]
    for (const match of matches) {
      if (match[1]) {
        let suggestion = match[1].trim()
        // Clean up the suggestion
        suggestion = suggestion
          .replace(/\s+/g, ' ')
          .replace(/^(you|your|the|a|an)\s+/i, '')
          .replace(/\s+(in|at|on|for|with|about)$/, '')
          .trim()
        
        if (suggestion.length >= 10 && suggestion.length <= 80) {
          return suggestion.charAt(0).toUpperCase() + suggestion.slice(1)
        }
      }
    }
  }

  return null
}

/**
 * Extracts action-oriented suggestions from content
 */
function extractActionSuggestion(content: string): string | null {
  const sentences = content.split(/[.!?]+/)
  
  for (const sentence of sentences) {
    const trimmed = sentence.trim()
    
    // Skip very short or very long sentences
    if (trimmed.length < 15 || trimmed.length > 120) continue
    
    // Look for sentences that start with action words or suggestions
    const actionPatterns = [
      /^(try|create|build|design|make|add|set up|configure|implement|develop|analyze|research|find|gather|generate|write|automate|monitor|track|connect|integrate)\s+/i,
      /^(you can|you could|you might|consider|maybe|perhaps)\s+(try|create|build|design|make|add|set up|configure|implement|develop|analyze|research|find|gather|generate|write|automate|monitor|track|connect|integrate)/i,
      /^(let's|we can|we could)\s+(create|build|design|make|set up|configure|implement|develop)/i
    ]
    
    for (const pattern of actionPatterns) {
      if (pattern.test(trimmed)) {
        // Clean up the sentence to make it a good suggestion
        let suggestion = trimmed
          .replace(/^(you can|you could|you might|consider|maybe|perhaps|let's|we can|we could)\s*/i, '')
          .replace(/^(try to|try)\s*/i, '')
          .replace(/^(create|build|design|make|set up|configure|implement|develop)\s+(a|an|the)\s*/i, (match, verb) => verb + ' ')
          .trim()
        
        // Capitalize first letter
        suggestion = suggestion.charAt(0).toUpperCase() + suggestion.slice(1)
        
        // Make sure it's a reasonable length
        if (suggestion.length >= 15 && suggestion.length <= 100) {
          return suggestion
        }
      }
    }
  }

  return null
}

/**
 * Detects the type of workflow being discussed based on keywords
 */
function detectWorkflowType(content: string): string | undefined {
  const cleanContent = content.toLowerCase()
  
  const typePatterns = [
    { keywords: ['data analysis', 'analyze data', 'data processing', 'analytics', 'sentiment analysis'], type: 'data-analysis' },
    { keywords: ['research', 'gather information', 'find information', 'investigate', 'web search', 'search for'], type: 'research' },
    { keywords: ['content generation', 'create content', 'generate content', 'write', 'blog'], type: 'content' },
    { keywords: ['automation', 'automate', 'task automation', 'workflow automation'], type: 'automation' },
    { keywords: ['monitoring', 'track', 'observe', 'watch', 'surveillance'], type: 'monitoring' },
    { keywords: ['notification', 'alert', 'notify', 'inform', 'message'], type: 'notification' },
    { keywords: ['integration', 'connect', 'sync', 'api', 'webhook'], type: 'integration' },
    { keywords: ['recommendation', 'suggest', 'recommend', 'advice', 'find the best', 'best spots', 'best places'], type: 'recommendation' },
    { keywords: ['approval', 'review', 'workflow', 'process', 'manage'], type: 'approval' },
    { keywords: ['customer service', 'support', 'helpdesk', 'ticket', 'feedback'], type: 'support' },
    { keywords: ['travel', 'tourism', 'visit', 'trip', 'destination', 'wildlife', 'animals', 'bears', 'yellowstone'], type: 'travel' }
  ]

  for (const pattern of typePatterns) {
    if (pattern.keywords.some(keyword => cleanContent.includes(keyword))) {
      return pattern.type
    }
  }

  return undefined
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
    'travel': 'Try: "Find best travel spots" or "Plan wildlife viewing"',
    'action': 'Continue building your workflow...',
    'step': 'What\'s the next step in your workflow?',
    'custom': 'Ask about modifications or add more details...',
    'default': 'Ask about workflow design, node configuration, or best practices...'
  }

  return placeholders[workflowType || 'default'] || placeholders.default
} 