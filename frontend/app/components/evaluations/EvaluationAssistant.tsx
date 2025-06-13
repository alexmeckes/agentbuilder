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
import { addUserHeaders } from '../../utils/userIdentity'
import { WorkflowNamingService } from '../../services/workflowNaming'

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
  const [generatingPrompt, setGeneratingPrompt] = useState<string | null>(null)

  // Load recent workflows on component mount
  useEffect(() => {
    loadRecentWorkflows()
  }, [isOpen])

  const loadRecentWorkflows = async () => {
    try {
      // First try to get workflows from the backend analytics API (which has our new naming)
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000'
      
      try {
        console.log('🔍 Loading recent workflows from backend analytics...')
        const response = await fetch(`${backendUrl}/analytics/workflows`, {
          headers: addUserHeaders()
        })
        const analyticsData = await response.json()
        
        if (analyticsData.recent_executions && analyticsData.recent_executions.length > 0) {
          // Use the intelligent workflow names from backend analytics
          // But we need to fetch the actual workflow structures for proper analysis
          const formattedWorkflows: RecentWorkflow[] = await Promise.all(
            analyticsData.recent_executions
              .filter((exec: any) => exec.status === 'completed')
              .slice(0, 4)
              .map(async (exec: any, index: number) => {
                let workflowStructure = { nodes: [], edges: [] }
                
                // Try to fetch the actual workflow structure from execution trace
                try {
                  console.log(`🔍 Fetching workflow structure for ${exec.execution_id}...`)
                  const traceResponse = await fetch(`${backendUrl}/executions/${exec.execution_id}/trace`, {
                    headers: addUserHeaders()
                  })
                  const traceData = await traceResponse.json()
                  
                  if (traceData.workflow && traceData.workflow.nodes) {
                    workflowStructure = {
                      nodes: traceData.workflow.nodes,
                      edges: traceData.workflow.edges || []
                    }
                    console.log(`✅ Found workflow structure for ${exec.execution_id}: ${workflowStructure.nodes.length} nodes`)
                  }
                } catch (error) {
                  console.log(`⚠️ Could not fetch workflow structure for ${exec.execution_id}:`, error)
                }
                
                return {
                  id: exec.execution_id,
                  name: exec.workflow_name || `Workflow ${index + 1}`,
                  category: exec.workflow_category || 'general', 
                  description: exec.workflow_description,
                  workflow: workflowStructure, // Real workflow structure for analysis
                  input_data: exec.input_data || '',
                  created_at: exec.created_at || Date.now() - (index * 3600000)
                }
              })
          )
          
          console.log('✨ Backend workflows with intelligent names and structures:', formattedWorkflows)
          setRecentWorkflows(formattedWorkflows)
          return // Success! Use backend data
        }
      } catch (backendError) {
        console.log('⚠️ Backend analytics unavailable, falling back to localStorage:', backendError)
      }
      
      // Fallback to localStorage (old approach)
      const recentWorkflowsData = localStorage.getItem('recentWorkflowExecutions')
      console.log('🔍 Loading recent workflows from localStorage:', recentWorkflowsData)
      
      if (recentWorkflowsData) {
        const workflows = JSON.parse(recentWorkflowsData)
        console.log('📊 Parsed workflows:', workflows)
        
        // Enhanced: Try to get intelligent names for localStorage workflows
        const formattedWorkflows: RecentWorkflow[] = await Promise.all(
          workflows
            .slice(0, 4)
            .map(async (w: any, index: number) => {
              let workflowName = w.workflow_name || `Workflow ${index + 1}`
              let workflowCategory = w.workflow_category || 'general'
              let workflowDescription = w.workflow_description
              
              // If the stored name is generic, try to generate a better one
              if (workflowName.startsWith('Workflow ') || workflowName === 'Unknown Workflow') {
                if (w.workflow && w.input_data) {
                  try {
                    console.log(`🎯 Generating intelligent name for stored workflow ${index + 1}...`)
                    const enhancedContext = await generateIntelligentWorkflowContext(w.workflow, w.input_data)
                    if (enhancedContext) {
                      workflowName = enhancedContext.name
                      workflowCategory = enhancedContext.category
                      workflowDescription = enhancedContext.description
                      console.log(`✨ Enhanced workflow ${index + 1}: ${workflowName} (${workflowCategory})`)
                    }
                  } catch (error) {
                    console.log(`⚠️ Failed to enhance workflow ${index + 1} name:`, error)
                  }
                }
              }
              
              return {
                id: w.execution_id || `workflow-${index}`,
                name: workflowName,
                category: workflowCategory,
                description: workflowDescription,
                workflow: w.workflow,
                input_data: w.input_data || '',
                created_at: w.created_at || Date.now() - (index * 3600000)
              }
            })
        )
        
        console.log('✨ Enhanced workflows for pills:', formattedWorkflows)
        setRecentWorkflows(formattedWorkflows)
      } else {
        console.log('📭 No recent workflows found in localStorage')
      }
    } catch (error) {
      console.log('❌ Error loading recent workflows:', error)
    }
  }

  // Helper function to generate intelligent workflow context using our frontend naming service
  const generateIntelligentWorkflowContext = async (workflow: any, inputData: string) => {
    try {
      // Use the WorkflowNamingService which now has polling for completion
      const namingResponse = await WorkflowNamingService.generateWorkflowIdentity({
        nodes: workflow.nodes || [],
        edges: workflow.edges || [],
        user_context: inputData
      })
      
      if (namingResponse.identity) {
        return {
          name: namingResponse.identity.name || 'Custom Workflow',
          category: namingResponse.identity.category || 'general',
          description: namingResponse.identity.description || ''
        }
      }
    } catch (error) {
      console.log('Failed to generate intelligent context:', error)
    }
    return null
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

  // Generate prompts using LLM to create insightful evaluation questions
  const generateWorkflowPrompt = async (workflow: RecentWorkflow): Promise<string> => {
    const workflowName = workflow.name || 'Custom Workflow'
    const workflowCategory = workflow.category || 'general'
    const workflowDescription = workflow.description || ''
    
    try {
      // Call the workflow naming API with a special prompt to generate evaluation criteria prompt
      console.log('🤖 Generating LLM-based evaluation prompt for:', workflowName)
      
      const response = await fetch('/api/llm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          systemPrompt: 'You are an expert at creating evaluation prompts. Write a conversational, specific prompt that someone would use to ask for evaluation criteria. Make it sound natural and include specific details about the workflow.',
          prompt: `Write a conversational prompt asking for evaluation criteria for this workflow:

${workflowName} - ${workflowCategory} workflow
Purpose: ${workflowDescription || 'A ' + workflowCategory + ' workflow'}
Example query: "${workflow.input_data || 'General user query'}"

The prompt should:
- Be conversational and natural
- Reference specific aspects of ${workflowName}
- Ask for edge cases relevant to ${workflowName.includes('Moose') ? 'wildlife viewing' : workflowName.includes('Yellowstone') ? 'location-based queries' : 'this domain'}
- Request both functional tests and quality assessments
- Sound like a human asking for help, not a template

Write the prompt as if you're the user asking for help creating evaluation criteria.`,
          temperature: 0.8,
          model: 'gpt-4o-mini'
        })
      })
      
      if (response.ok) {
        const data = await response.json()
        const llmGeneratedPrompt = data.response // Our new API returns 'response' field
        
        console.log('📝 Raw LLM response:', llmGeneratedPrompt)
        
        if (!llmGeneratedPrompt) {
          console.log('❌ No response from LLM')
          throw new Error('No response from LLM')
        }
        
        // Validate the prompt
        const cleanPrompt = llmGeneratedPrompt.trim()
        
        if (cleanPrompt.length < 50) {
          console.log('❌ Prompt too short:', cleanPrompt.length, 'characters')
          throw new Error('Prompt too short')
        }
        
        console.log('✅ Valid LLM-generated prompt:', cleanPrompt.substring(0, 100) + '...')
        return cleanPrompt
      }
    } catch (error) {
      console.log('Failed to generate LLM prompt, using template:', error)
    }
    
    // Fallback to template if LLM fails
    let prompt = `Generate comprehensive evaluation criteria for my "${workflowName}" workflow.`
    
    if (workflowDescription && workflowDescription !== 'A workflow') {
      prompt += `\n\nContext: ${workflowDescription}`
    }
    
    prompt += `\n\nThis is a ${workflowCategory} workflow.`
    
    if (workflow.input_data) {
      const inputPreview = workflow.input_data.length > 150 
        ? workflow.input_data.substring(0, 150) + '...' 
        : workflow.input_data
      prompt += `\n\nExample user query: "${inputPreview}"`
    }
    
    prompt += `\n\nBased on the workflow's purpose and context, create evaluation criteria that:`
    prompt += `\n• Test the core functionality described in the context`
    prompt += `\n• Include edge cases specific to ${workflowName.split(' - ')[0]} scenarios`
    prompt += `\n• Evaluate the quality and accuracy of the ${workflowCategory} outputs`
    prompt += `\n• Test failure modes relevant to this specific use case`
    prompt += `\n• Measure both correctness and usefulness of results`
    
    return prompt
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
      // Check if we can get workflow context from the current page or user input
      const workflowContext = await getWorkflowContext(userInput)
      
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000'
      let apiEndpoint = `${backendUrl}/api/ai/evaluation-suggestions`
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
        apiEndpoint = `${backendUrl}/ai/workflow-evaluation-suggestions`
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
      
      // Provide intelligent fallback based on workflow context
      const workflowContext = await getWorkflowContext(userInput)
      
      if (workflowContext.hasWorkflow && recentWorkflows.length > 0) {
        // Find the workflow being referenced
        const targetWorkflow = recentWorkflows.find(w => 
          userInput.includes(`"${w.name}"`) || userInput.includes(w.name)
        ) || recentWorkflows[0]
        
        // Generate context-aware fallback suggestions
        const fallbackResponse = generateAIResponse(
          `${targetWorkflow.category} workflow evaluation for ${targetWorkflow.name}`, 
          evaluationCase
        )
        
        const fallbackMessage: Message = {
          id: Date.now().toString(),
          type: 'assistant',
          content: `I'm currently unable to connect to the AI service, but I can still help! Based on your "${targetWorkflow.name}" workflow (${targetWorkflow.category}), here are some evaluation suggestions:`,
          timestamp: new Date(),
          suggestions: fallbackResponse.suggestions
        }
        setMessages(prev => [...prev, fallbackMessage])
      } else {
        // Generic fallback
        const errorMessage: Message = {
          id: Date.now().toString(),
          type: 'assistant',
          content: `I'm having trouble connecting to the AI service right now. Here are some general evaluation tips:\n\n• Focus on measurable criteria\n• Test edge cases and failure modes\n• Evaluate both process and outcomes\n• Consider the specific domain of your workflow\n\nTry asking again in a moment, or describe your workflow type for more specific guidance.`,
          timestamp: new Date()
        }
        setMessages(prev => [...prev, errorMessage])
      }
    } finally {
      setIsLoading(false)
    }
  }

  // Helper function to detect workflow context
  const getWorkflowContext = async (userInput?: string): Promise<{
    hasWorkflow: boolean
    workflow?: any
    sampleInput?: string
  }> => {
    try {
      // First, check if the user input references a specific workflow from our pills
      if (userInput && recentWorkflows.length > 0) {
        for (const workflow of recentWorkflows) {
          if (userInput.includes(`"${workflow.name}"`)) {
            console.log(`🎯 Detected specific workflow context: ${workflow.name}`)
            return {
              hasWorkflow: true,
              workflow: workflow.workflow,
              sampleInput: workflow.input_data || "Sample workflow input"
            }
          }
        }
      }
      
      // Fallback: Try to detect if we're in a workflow context by checking for workflow data
      // Check localStorage for recent workflow data
      const recentWorkflowsData = localStorage.getItem('recentWorkflowExecutions')
      if (recentWorkflowsData) {
        const workflows = JSON.parse(recentWorkflowsData)
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
          {/* Recent Workflow Pills with Smart Context */}
          {recentWorkflows.map((workflow) => (
            <button
              key={workflow.id}
              onClick={async () => {
                setGeneratingPrompt(workflow.id)
                const dynamicPrompt = await generateWorkflowPrompt(workflow)
                setInput(dynamicPrompt)
                setGeneratingPrompt(null)
              }}
              disabled={generatingPrompt === workflow.id}
              className={`px-2 py-1 text-xs border rounded transition-colors flex items-center gap-1 ${
                generatingPrompt === workflow.id 
                  ? 'bg-gray-100 text-gray-500 border-gray-300 cursor-not-allowed' 
                  : 'bg-gradient-to-r from-blue-50 to-purple-50 text-blue-800 border-blue-200 hover:from-blue-100 hover:to-purple-100'
              }`}
              title={`Generate evaluation for: ${workflow.name}${workflow.description ? ' - ' + workflow.description : ''}`}
            >
              {generatingPrompt === workflow.id ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                getCategoryEmoji(workflow.category)
              )}
              <span className="truncate max-w-[100px]">
                {generatingPrompt === workflow.id 
                  ? 'Generating...'
                  : workflow.name === 'Unknown Workflow' 
                  ? workflow.category.charAt(0).toUpperCase() + workflow.category.slice(1)
                  : workflow.name.replace(/^(Multi-Agent |Workflow |The )/i, '').trim()
                }
              </span>
            </button>
          ))}
          
          {/* Smart Context Pills - Show different options based on what workflows exist */}
          {recentWorkflows.length > 0 && (
            <>
              {/* Workflow Analysis - Always useful */}
              <button
                onClick={() => setInput("Analyze my recent workflows and suggest comprehensive evaluation criteria that cover different workflow types and potential failure modes")}
                className="px-2 py-1 text-xs bg-gradient-to-r from-purple-50 to-pink-50 text-purple-700 border border-purple-200 rounded hover:from-purple-100 hover:to-pink-100 transition-colors"
              >
                🔍 Analyze Workflow
              </button>
              
              {/* Failure Modes - Based on workflow complexity */}
              {recentWorkflows.some(w => w.name.includes('Multi-Agent') || w.category === 'research') && (
                <button
                  onClick={() => setInput("Help me identify potential failure modes and edge cases for complex multi-step workflows")}
                  className="px-2 py-1 text-xs bg-gradient-to-r from-orange-50 to-red-50 text-orange-700 border border-orange-200 rounded hover:from-orange-100 hover:to-red-100 transition-colors"
                >
                  ⚠️ Failure Modes
                </button>
              )}
              
              {/* Multi-Agent specific suggestions if any multi-agent workflows exist */}
              {recentWorkflows.some(w => w.name.includes('Multi-Agent')) && (
                <button
                  onClick={() => setInput("Create evaluation criteria specifically for multi-agent workflows, focusing on agent coordination and handoff quality")}
                  className="px-2 py-1 text-xs bg-gradient-to-r from-green-50 to-teal-50 text-green-700 border border-green-200 rounded hover:from-green-100 hover:to-teal-100 transition-colors"
                >
                  🤝 Multi-Agent
                </button>
              )}
            </>
          )}
          
          {/* Fallback enhanced pills if no recent workflows */}
          {recentWorkflows.length === 0 && (
            <>
              <button
                onClick={() => setInput("Help me create comprehensive evaluation criteria for a research and analysis workflow")}
                className="px-2 py-1 text-xs bg-gradient-to-r from-blue-50 to-cyan-50 text-blue-700 border border-blue-200 rounded hover:from-blue-100 hover:to-cyan-100 transition-colors"
              >
                🔍 Research Eval
              </button>
              <button
                onClick={() => setInput("Suggest evaluation criteria and test cases for question-answering workflows")}
                className="px-2 py-1 text-xs bg-gradient-to-r from-green-50 to-emerald-50 text-green-700 border border-green-200 rounded hover:from-green-100 hover:to-emerald-100 transition-colors"
              >
                ❓ Q&A Eval
              </button>
              <button
                onClick={() => setInput("Create evaluation framework for content generation and creative workflows")}
                className="px-2 py-1 text-xs bg-gradient-to-r from-purple-50 to-pink-50 text-purple-700 border border-purple-200 rounded hover:from-purple-100 hover:to-pink-100 transition-colors"
              >
                ✍️ Content Eval
              </button>
              <button
                onClick={() => setInput("Design evaluation criteria for multi-agent coordination and complex workflow patterns")}
                className="px-2 py-1 text-xs bg-gradient-to-r from-orange-50 to-yellow-50 text-orange-700 border border-orange-200 rounded hover:from-orange-100 hover:to-yellow-100 transition-colors"
              >
                🤝 Multi-Agent
              </button>
            </>
          )}
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