"use client"

import { useState, useEffect } from 'react'
import { 
  Bot, 
  MessageCircle, 
  Send, 
  Sparkles, 
  Lightbulb, 
  Target, 
  CheckCircle,
  Loader2,
  X,
  Maximize2,
  Minimize2
} from 'lucide-react'
import { EvaluationCase } from '../../types/evaluation'

interface EvaluationAssistantProps {
  evaluationCase?: Partial<EvaluationCase>
  onSuggestionApply?: (suggestion: any) => void
  isOpen: boolean
  onToggle: () => void
}

interface Message {
  id: string
  type: 'user' | 'assistant'
  content: string
  timestamp: Date
  suggestions?: AssistantSuggestion[]
}

interface AssistantSuggestion {
  id: string
  type: 'checkpoint' | 'ground_truth' | 'judge_model' | 'test_case'
  title: string
  description: string
  data: any
  confidence: number
}

interface RecentWorkflow {
  id: string
  name: string
  category: string
  description?: string
  workflow: any
  input_data: string
  created_at: number
}

export function EvaluationAssistant({ 
  evaluationCase, 
  onSuggestionApply, 
  isOpen, 
  onToggle 
}: EvaluationAssistantProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      type: 'assistant',
      content: `Hi! I'm your AI evaluation assistant. I can help you design better evaluations by:

• **Suggesting evaluation criteria** based on your use case
• **Generating test cases** that cover edge cases
• **Recommending judge models** for your evaluation type  
• **Providing best practices** for reliable testing

What kind of workflow are you looking to evaluate today?`,
      timestamp: new Date(),
      suggestions: [
        {
          id: 'template-qa',
          type: 'checkpoint',
          title: 'Q&A Evaluation Template',
          description: 'Pre-built criteria for question-answering workflows',
          data: {
            checkpoints: [
              { points: 2, criteria: 'Answer is factually correct and complete' },
              { points: 1, criteria: 'Response is clear and well-structured' },
              { points: 1, criteria: 'Answer addresses all parts of the question' }
            ]
          },
          confidence: 0.9
        },
        {
          id: 'template-research',
          type: 'checkpoint',
          title: 'Research Workflow Template',
          description: 'Evaluation criteria for research and analysis tasks',
          data: {
            checkpoints: [
              { points: 3, criteria: 'Comprehensive information gathering from multiple sources' },
              { points: 2, criteria: 'Critical analysis and synthesis of findings' },
              { points: 2, criteria: 'Citations and references provided' },
              { points: 1, criteria: 'Clear conclusions and recommendations' }
            ]
          },
          confidence: 0.85
        },
        {
          id: 'template-creative',
          type: 'checkpoint',
          title: 'Creative Content Template',
          description: 'Criteria for evaluating creative writing and content generation',
          data: {
            checkpoints: [
              { points: 2, criteria: 'Content is engaging and well-written' },
              { points: 2, criteria: 'Follows specified tone and style requirements' },
              { points: 1, criteria: 'Grammar and spelling are correct' },
              { points: 1, criteria: 'Content is original and creative' }
            ]
          },
          confidence: 0.8
        }
      ]
    }
  ])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const [recentWorkflows, setRecentWorkflows] = useState<RecentWorkflow[]>([])
  const [appliedSuggestions, setAppliedSuggestions] = useState<Set<string>>(new Set())

  // Load recent workflows on component mount
  useEffect(() => {
    loadRecentWorkflows()
  }, [isOpen])

  const loadRecentWorkflows = async () => {
    try {
      const recentWorkflowsData = localStorage.getItem('recentWorkflowExecutions')
      console.log('🔍 Loading recent workflows from localStorage:', recentWorkflowsData)
      
      if (recentWorkflowsData) {
        const workflows = JSON.parse(recentWorkflowsData)
        console.log('📊 Parsed workflows:', workflows)
        
        // Get the last 4 workflows with proper metadata
        const formattedWorkflows: RecentWorkflow[] = workflows
          .slice(0, 4)
          .map((w: any, index: number) => ({
            id: w.execution_id || `workflow-${index}`,
            name: w.workflow_name || `Workflow ${index + 1}`,
            category: w.workflow_category || 'general',
            description: w.workflow_description,
            workflow: w.workflow,
            input_data: w.input_data || '',
            created_at: w.created_at || Date.now() - (index * 3600000) // Recent first
          }))
        
        console.log('✨ Formatted workflows for pills:', formattedWorkflows)
        setRecentWorkflows(formattedWorkflows)
      } else {
        console.log('📭 No recent workflows found in localStorage')
      }
    } catch (error) {
      console.log('❌ Error loading recent workflows:', error)
    }
  }

  // Get category emoji for workflow pills
  const getCategoryEmoji = (category: string): string => {
    const emojiMap: { [key: string]: string } = {
      'research': '🔍',
      'analysis': '📊', 
      'content': '✍️',
      'automation': '🔄',
      'support': '🎧',
      'data-processing': '⚙️',
      'qa': '❓',
      'creative': '🎨',
      'general': '🔧'
    }
    return emojiMap[category] || '🔧'
  }

  // Generate workflow-specific prompt
  const generateWorkflowPrompt = (workflow: RecentWorkflow): string => {
    return `Generate comprehensive evaluation criteria for my "${workflow.name}" workflow. This is a ${workflow.category} workflow${workflow.description ? `: ${workflow.description}` : ''}. Focus on domain-specific evaluation criteria that would test the key capabilities and potential failure modes of this particular workflow.`
  }

  const handleSendMessage = async () => {
    if (!input.trim()) return

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: input.trim(),
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    const userInput = input.trim()
    setInput('')
    setIsLoading(true)

    try {
      // Check if we can get workflow context from the current page
      const workflowContext = await getWorkflowContext()
      
      let apiEndpoint = 'http://localhost:8000/ai/evaluation-suggestions'
      let requestBody: any = {
        input: userInput,
        context: {
          current_evaluation: evaluationCase,
          current_checkpoints: evaluationCase?.checkpoints || [],
          current_ground_truth: evaluationCase?.ground_truth || []
        }
      }

      // If we detected workflow context, use the workflow-aware endpoint
      if (workflowContext.hasWorkflow) {
        apiEndpoint = 'http://localhost:8000/ai/workflow-evaluation-suggestions'
        requestBody = {
          user_request: userInput,
          workflow: workflowContext.workflow,
          sample_input: workflowContext.sampleInput,
          context: {
            current_evaluation: evaluationCase,
            current_checkpoints: evaluationCase?.checkpoints || [],
            current_ground_truth: evaluationCase?.ground_truth || []
          }
        }
      }

      // Make API call to backend for AI-powered suggestions
      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      })

      const data = await response.json()

      if (data.success && data.suggestions) {
        // Enhanced response for workflow-aware suggestions
        let aiContent = data.ai_response || generateContextualResponse(userInput, data.suggestions)
        
        // Add workflow insights if available
        if (data.workflow_insights) {
          const insights = data.workflow_insights
          aiContent += `\n\n**🔍 Workflow Analysis:**\n`
          if (insights.detected_purpose) {
            aiContent += `**Purpose:** ${insights.detected_purpose}\n`
          }
          if (insights.key_evaluation_areas && insights.key_evaluation_areas.length > 0) {
            aiContent += `**Key Areas:** ${insights.key_evaluation_areas.join(', ')}\n`
          }
          if (insights.suggested_test_inputs && insights.suggested_test_inputs.length > 0) {
            aiContent += `**Suggested Test Inputs:** ${insights.suggested_test_inputs.slice(0, 2).join(', ')}\n`
          }
        }

        // Add workflow identity if available
        if (data.workflow_identity) {
          const identity = data.workflow_identity
          aiContent += `\n**🏷️ Workflow Profile:**\n`
          aiContent += `**Name:** ${identity.name}\n`
          aiContent += `**Category:** ${identity.category}\n`
          if (identity.description) {
            aiContent += `**Description:** ${identity.description}\n`
          }
        }

        const aiResponse: Message = {
          id: Date.now().toString(),
          type: 'assistant',
          content: aiContent,
          timestamp: new Date(),
          suggestions: data.suggestions
        }
        setMessages(prev => [...prev, aiResponse])
        
        // Add source indicator
        const sourceType = data.source === "workflow_aware_ai" ? "Workflow-Aware AI" : 
                          data.source === "ai_generated" ? "AI" : "Rule-Based"
        const sourceMessage: Message = {
          id: (Date.now() + 1).toString(),
          type: 'assistant',
          content: `🧠 **Powered by ${sourceType}** - ${
            data.source === "workflow_aware_ai" 
              ? "These suggestions are specifically tailored to your workflow's structure and purpose"
              : data.source === "ai_generated"
              ? "These suggestions were generated using real artificial intelligence"
              : "These are rule-based suggestions (AI temporarily unavailable)"
          }`,
          timestamp: new Date()
        }
        setMessages(prev => [...prev, sourceMessage])
        
      } else {
        throw new Error(data.message || 'Failed to get AI suggestions')
      }
    } catch (error) {
      console.error('Failed to get AI suggestions:', error)
      
      // Fallback to helpful error message
      const errorMessage: Message = {
        id: Date.now().toString(),
        type: 'assistant',
        content: `I'm having trouble connecting to the AI service right now. Here are some general evaluation tips:\n\n• Focus on measurable criteria\n• Test edge cases and failure modes\n• Evaluate both process and outcomes\n• Consider the specific domain of your workflow\n\nTry asking again in a moment, or describe your workflow type for more specific guidance.`,
        timestamp: new Date()
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  // Helper function to detect workflow context
  const getWorkflowContext = async (): Promise<{
    hasWorkflow: boolean
    workflow?: any
    sampleInput?: string
  }> => {
    try {
      // Try to detect if we're in a workflow context by checking for workflow data
      // This could come from localStorage, URL params, or other state management
      
      // Check localStorage for recent workflow data
      const recentWorkflows = localStorage.getItem('recentWorkflowExecutions')
      if (recentWorkflows) {
        const workflows = JSON.parse(recentWorkflows)
        const latestWorkflow = workflows[0] // Get most recent
        if (latestWorkflow && latestWorkflow.workflow) {
          return {
            hasWorkflow: true,
            workflow: latestWorkflow.workflow,
            sampleInput: latestWorkflow.input_data || "Sample workflow input"
          }
        }
      }

      // Check if there's workflow data in the URL or global state
      const urlParams = new URLSearchParams(window.location.search)
      const workflowId = urlParams.get('workflowId')
      if (workflowId) {
        // Could fetch workflow data by ID
        // For now, return false as we don't have this implementation
      }

      return { hasWorkflow: false }
    } catch (error) {
      console.log('No workflow context available:', error)
      return { hasWorkflow: false }
    }
  }

  const generateContextualResponse = (userInput: string, suggestions: AssistantSuggestion[]): string => {
    const input = userInput.toLowerCase()
    
    if (input.includes('research') || input.includes('analysis')) {
      return `Great! I've analyzed your request for research workflow evaluation and generated ${suggestions.length} tailored suggestions. These are based on best practices for evaluating research quality, information gathering, and analytical depth.`
    }
    
    if (input.includes('qa') || input.includes('question') || input.includes('answer')) {
      return `Perfect! For Q&A evaluations, I've focused on accuracy, completeness, and clarity. Here are ${suggestions.length} AI-generated suggestions to help you create robust question-answering evaluations.`
    }
    
    if (input.includes('creative') || input.includes('writing') || input.includes('content')) {
      return `Excellent! Creative content evaluation requires balancing objective criteria with subjective quality. I've generated ${suggestions.length} suggestions that help you evaluate both technical and creative aspects.`
    }
    
    if (input.includes('best practices') || input.includes('help') || input.includes('guide')) {
      return `I've analyzed evaluation best practices and generated ${suggestions.length} recommendations to help you design more effective evaluations. These suggestions are based on industry standards and proven methodologies.`
    }
    
    return `Based on your input, I've generated ${suggestions.length} AI-powered suggestions to improve your evaluation design. Each suggestion includes confidence scores and can be applied with one click.`
  }

  const generateAIResponse = (userInput: string, context?: Partial<EvaluationCase>): Message => {
    const input = userInput.toLowerCase()
    
    // Analyze user intent and provide contextual suggestions
    if (input.includes('research') || input.includes('analysis')) {
      return {
        id: Date.now().toString(),
        type: 'assistant',
        content: `Great! For research workflows, I recommend focusing on information quality and analytical depth. Here are some tailored suggestions:`,
        timestamp: new Date(),
        suggestions: [
          {
            id: 'research-criteria',
            type: 'checkpoint',
            title: 'Research Quality Checkpoints',
            description: 'Comprehensive criteria for research evaluation',
            data: {
              checkpoints: [
                { points: 3, criteria: 'Sources are credible and diverse' },
                { points: 2, criteria: 'Information is current and relevant' },
                { points: 2, criteria: 'Analysis shows critical thinking' },
                { points: 1, criteria: 'Findings are well-organized' }
              ]
            },
            confidence: 0.92
          },
          {
            id: 'research-judge',
            type: 'judge_model',
            title: 'Recommended Judge Model',
            description: 'GPT-4o for complex reasoning evaluation',
            data: { llm_judge: 'openai/gpt-4o' },
            confidence: 0.88
          },
          {
            id: 'research-test-cases',
            type: 'test_case',
            title: 'Research Test Cases',
            description: 'Diverse scenarios to test research capabilities',
            data: {
              test_cases: [
                'Research the impact of AI on employment rates',
                'Analyze the environmental effects of cryptocurrency mining',
                'Compare renewable energy policies across different countries'
              ]
            },
            confidence: 0.85
          }
        ]
      }
    }

    if (input.includes('qa') || input.includes('question') || input.includes('answer')) {
      return {
        id: Date.now().toString(),
        type: 'assistant',
        content: `Perfect! For Q&A evaluations, accuracy and clarity are key. Here's what I recommend:`,
        timestamp: new Date(),
        suggestions: [
          {
            id: 'qa-criteria',
            type: 'checkpoint',
            title: 'Q&A Evaluation Criteria',
            description: 'Focused criteria for question-answering accuracy',
            data: {
              checkpoints: [
                { points: 3, criteria: 'Answer is factually correct' },
                { points: 2, criteria: 'Response is complete and addresses all parts' },
                { points: 1, criteria: 'Answer is clear and concise' }
              ]
            },
            confidence: 0.95
          },
          {
            id: 'qa-ground-truth',
            type: 'ground_truth',
            title: 'Ground Truth Examples',
            description: 'Add specific expected answers for verification',
            data: {
              ground_truth: [
                { name: 'capital_france', value: 'Paris', points: 1 },
                { name: 'largest_ocean', value: 'Pacific Ocean', points: 1 }
              ]
            },
            confidence: 0.9
          }
        ]
      }
    }

    if (input.includes('creative') || input.includes('writing') || input.includes('content')) {
      return {
        id: Date.now().toString(),
        type: 'assistant',
        content: `Creative content evaluation requires balancing objectivity with subjective quality. Here are my suggestions:`,
        timestamp: new Date(),
        suggestions: [
          {
            id: 'creative-criteria',
            type: 'checkpoint',
            title: 'Creative Content Criteria',
            description: 'Balanced evaluation for creative outputs',
            data: {
              checkpoints: [
                { points: 2, criteria: 'Content meets specified requirements' },
                { points: 2, criteria: 'Writing is engaging and well-structured' },
                { points: 1, criteria: 'Grammar and style are appropriate' },
                { points: 1, criteria: 'Content demonstrates creativity' }
              ]
            },
            confidence: 0.87
          },
          {
            id: 'creative-judge',
            type: 'judge_model',
            title: 'Creative Evaluation Model',
            description: 'Claude 3 Sonnet excels at creative evaluation',
            data: { llm_judge: 'anthropic/claude-3-sonnet' },
            confidence: 0.82
          }
        ]
      }
    }

    // Generic helpful response
    return {
      id: Date.now().toString(),
      type: 'assistant',
      content: `I'd love to help you design a better evaluation! Could you tell me more about:

• What type of workflow you're testing (Q&A, research, creative, etc.)
• What specific aspects you want to evaluate
• Any particular challenges you're facing

I can suggest relevant criteria, test cases, and best practices based on your needs.`,
      timestamp: new Date(),
      suggestions: [
        {
          id: 'generic-help',
          type: 'checkpoint',
          title: 'Common Evaluation Patterns',
          description: 'Popular evaluation criteria that work for most workflows',
          data: {
            checkpoints: [
              { points: 2, criteria: 'Output meets the specified requirements' },
              { points: 1, criteria: 'Response is well-formatted and clear' },
              { points: 1, criteria: 'No hallucinations or factual errors' }
            ]
          },
          confidence: 0.75
        }
      ]
    }
  }

  const applySuggestion = (suggestion: AssistantSuggestion) => {
    // Prevent double-application
    if (appliedSuggestions.has(suggestion.id)) {
      const alreadyAppliedMessage: Message = {
        id: Date.now().toString(),
        type: 'assistant',
        content: `⚠️ "${suggestion.title}" has already been applied! You can find it in your evaluation case editor.`,
        timestamp: new Date()
      }
      setMessages(prev => [...prev, alreadyAppliedMessage])
      return
    }

    // Mark as applied
    setAppliedSuggestions(prev => new Set([...prev, suggestion.id]))
    
    if (onSuggestionApply) {
      onSuggestionApply(suggestion)
    }
    
    // Add confirmation message
    const confirmMessage: Message = {
      id: Date.now().toString(),
      type: 'assistant',
      content: `✅ Applied "${suggestion.title}"! I've added the suggested ${suggestion.type === 'checkpoint' ? 'evaluation criteria' : suggestion.type} to your evaluation case. You can modify them in the editor if needed.`,
      timestamp: new Date()
    }
    setMessages(prev => [...prev, confirmMessage])
  }

  if (!isOpen) {
    return (
      <button
        onClick={onToggle}
        className="fixed bottom-6 right-6 w-14 h-14 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center z-50"
      >
        <Bot className="w-6 h-6" />
      </button>
    )
  }

  return (
    <div className={`fixed ${isExpanded ? 'inset-4' : 'bottom-6 right-6 w-96 h-[500px]'} bg-white rounded-xl shadow-2xl border border-gray-200 flex flex-col z-50 transition-all duration-300`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gradient-to-r from-purple-50 to-blue-50 rounded-t-xl">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full flex items-center justify-center">
            <Bot className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Evaluation Assistant</h3>
            <p className="text-xs text-gray-600">AI-powered evaluation design</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 text-gray-400 hover:text-gray-600 rounded"
          >
            {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
          <button
            onClick={onToggle}
            className="p-1 text-gray-400 hover:text-gray-600 rounded"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div key={message.id} className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] rounded-lg p-3 ${
              message.type === 'user' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-100 text-gray-900'
            }`}>
              <p className="text-sm whitespace-pre-line">{message.content}</p>
              
              {/* Suggestions */}
              {message.suggestions && message.suggestions.length > 0 && (
                <div className="mt-3 space-y-2">
                  {message.suggestions.map((suggestion) => (
                    <div
                      key={suggestion.id}
                      className="bg-white rounded-lg p-3 border border-gray-200 shadow-sm"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Sparkles className="w-4 h-4 text-purple-600" />
                          <h4 className="font-medium text-gray-900 text-sm">{suggestion.title}</h4>
                        </div>
                        <span className="text-xs text-gray-500">{Math.round(suggestion.confidence * 100)}%</span>
                      </div>
                      <p className="text-xs text-gray-600 mb-3">{suggestion.description}</p>
                      <button
                        onClick={() => applySuggestion(suggestion)}
                        disabled={appliedSuggestions.has(suggestion.id)}
                        className={`w-full px-3 py-1.5 rounded text-xs transition-colors flex items-center justify-center gap-1 ${
                          appliedSuggestions.has(suggestion.id)
                            ? 'bg-green-100 text-green-800 border border-green-200 cursor-not-allowed'
                            : 'bg-purple-600 text-white hover:bg-purple-700'
                        }`}
                      >
                        <CheckCircle className="w-3 h-3" />
                        {appliedSuggestions.has(suggestion.id) ? 'Applied ✓' : 'Apply Suggestion'}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
        
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 rounded-lg p-3 flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-gray-600" />
              <span className="text-sm text-gray-600">Assistant is thinking...</span>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="p-4 border-t border-gray-200">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
            placeholder="Ask about evaluation design, criteria, test cases..."
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
          />
          <button
            onClick={handleSendMessage}
            disabled={!input.trim() || isLoading}
            className="px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
        
        {/* Dynamic Quick Actions */}
        <div className="flex gap-2 mt-2 flex-wrap">
          {/* Recent Workflow Pills */}
          {recentWorkflows.map((workflow) => (
            <button
              key={workflow.id}
              onClick={() => setInput(generateWorkflowPrompt(workflow))}
              className="px-2 py-1 text-xs bg-gradient-to-r from-blue-50 to-purple-50 text-blue-800 border border-blue-200 rounded hover:from-blue-100 hover:to-purple-100 transition-colors flex items-center gap-1"
              title={`Generate evaluation for: ${workflow.name}`}
            >
              {getCategoryEmoji(workflow.category)}
              <span className="truncate max-w-[80px]">{workflow.name.replace('Workflow', '').trim()}</span>
            </button>
          ))}
          
          {/* Fallback static pills if no recent workflows */}
          {recentWorkflows.length === 0 && (
            <>
              <button
                onClick={() => setInput("Help me create evaluation criteria for a research workflow")}
                className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
              >
                Research Eval
              </button>
              <button
                onClick={() => setInput("Suggest test cases for Q&A evaluation")}
                className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
              >
                Q&A Tests
              </button>
            </>
          )}
          
          {/* Universal quick actions */}
          <button
            onClick={() => setInput("Analyze my workflow and suggest specific evaluation criteria")}
            className="px-2 py-1 text-xs bg-purple-100 text-purple-700 rounded hover:bg-purple-200 transition-colors"
          >
            🔍 Analyze Workflow
          </button>
          <button
            onClick={() => setInput("What could go wrong with this workflow and how should I test for it?")}
            className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
          >
            🛡️ Failure Modes
          </button>
          <button
            onClick={() => setInput("Create evaluation criteria for multi-agent coordination")}
            className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors"
          >
            🤝 Multi-Agent
          </button>
        </div>
      </div>
    </div>
  )
} 