export interface WorkflowIdentity {
  id: string                    // Unique workflow ID (UUID)
  name: string                  // AI-generated smart name
  description: string           // AI-generated description
  category: string              // e.g., "research", "analysis", "content", "automation"
  version: number               // Version tracking
  created_at: string           // ISO timestamp
  last_modified: string        // ISO timestamp
  structure_hash: string       // Hash of nodes/edges for change detection
  execution_count: number      // Number of times this workflow has been executed
  last_executed: string | null // Last execution timestamp
}

// Map directly to any-agent's AgentFramework enum
export enum AgentFramework {
  GOOGLE = "google",
  LANGCHAIN = "langchain", 
  LLAMA_INDEX = "llama_index",
  OPENAI = "openai",
  AGNO = "agno",
  SMOLAGENTS = "smolagents",
  TINYAGENT = "tinyagent"
}

// Map directly to any-agent's AgentConfig structure
export interface AgentConfig {
  model_id: string
  api_base?: string
  api_key?: string
  description?: string
  name?: string
  instructions?: string
  tools?: string[]
  agent_args?: Record<string, any>
  model_args?: Record<string, any>
}

// Enhanced node data that includes any-agent configuration
export interface EnhancedNodeData {
  // Existing fields
  label: string
  type: 'agent' | 'tool' | 'input' | 'output'
  name?: string
  description?: string
  
  // Legacy fields for backward compatibility
  model_id?: string
  instructions?: string
  tool_type?: string
  zIndex?: number
  
  // New any-agent integration
  framework?: AgentFramework
  agentConfig?: AgentConfig
  
  // Model configuration options (now available for all node types)
  modelOptions?: {
    temperature?: number
    max_tokens?: number
    top_p?: number
    top_k?: number
  }
  
  // AI-enhanced capabilities for different node types
  aiEnhanced?: {
    enabled: boolean
    purpose: 'processing' | 'validation' | 'formatting' | 'summarization' | 'extraction'
    model_id?: string
    instructions?: string
  }
  
  // Tool-specific AI enhancements
  toolAI?: {
    preProcessing?: {
      enabled: boolean
      model_id?: string
      instructions?: string
    }
    postProcessing?: {
      enabled: boolean
      model_id?: string
      instructions?: string
    }
  }
  
  // Input-specific AI enhancements
  inputAI?: {
    validation?: {
      enabled: boolean
      model_id?: string
      instructions?: string
    }
    extraction?: {
      enabled: boolean
      model_id?: string
      instructions?: string
    }
  }
  
  // Output-specific AI enhancements
  outputAI?: {
    formatting?: {
      enabled: boolean
      model_id?: string
      instructions?: string
    }
    summarization?: {
      enabled: boolean
      model_id?: string
      instructions?: string
    }
  }
}

// Model information for UI display
export interface ModelInfo {
  id: string
  name: string
  provider: string
  description: string
  cost_per_1k_tokens: number
  max_tokens: number
  supports_tools: boolean
  supports_vision: boolean
  frameworks: AgentFramework[]
}

// Predefined model configurations
export const POPULAR_MODELS: ModelInfo[] = [
  // Latest GPT-4.1 series (2025)
  {
    id: "gpt-4.1",
    name: "GPT-4.1",
    provider: "OpenAI",
    description: "Latest GPT model with enhanced coding and instruction following",
    cost_per_1k_tokens: 0.002, // $2.00 per 1M tokens input
    max_tokens: 1047576, // Up to 1M context window
    supports_tools: true,
    supports_vision: true,
    frameworks: [AgentFramework.OPENAI, AgentFramework.LANGCHAIN, AgentFramework.AGNO]
  },
  {
    id: "gpt-4.1-mini",
    name: "GPT-4.1 Mini",
    provider: "OpenAI",
    description: "Efficient GPT-4.1 variant for cost-effective applications",
    cost_per_1k_tokens: 0.0004, // $0.40 per 1M tokens input
    max_tokens: 1047576,
    supports_tools: true,
    supports_vision: true,
    frameworks: [AgentFramework.OPENAI, AgentFramework.LANGCHAIN, AgentFramework.AGNO]
  },
  {
    id: "gpt-4.1-nano",
    name: "GPT-4.1 Nano",
    provider: "OpenAI",
    description: "Ultra-efficient GPT-4.1 for mobile and edge applications",
    cost_per_1k_tokens: 0.0001, // $0.10 per 1M tokens input
    max_tokens: 1047576,
    supports_tools: true,
    supports_vision: true,
    frameworks: [AgentFramework.OPENAI, AgentFramework.LANGCHAIN, AgentFramework.AGNO]
  },
  // Latest o-series reasoning models
  {
    id: "o4-mini",
    name: "o4-mini",
    provider: "OpenAI",
    description: "Latest reasoning model with enhanced problem-solving capabilities",
    cost_per_1k_tokens: 0.003, // Estimated pricing for reasoning models
    max_tokens: 200000,
    supports_tools: true,
    supports_vision: true,
    frameworks: [AgentFramework.OPENAI, AgentFramework.LANGCHAIN, AgentFramework.AGNO]
  },
  {
    id: "o3",
    name: "o3",
    provider: "OpenAI",
    description: "Advanced reasoning model for complex problem-solving tasks",
    cost_per_1k_tokens: 0.004, // Estimated pricing for reasoning models
    max_tokens: 200000,
    supports_tools: true,
    supports_vision: true,
    frameworks: [AgentFramework.OPENAI, AgentFramework.LANGCHAIN, AgentFramework.AGNO]
  },
  {
    id: "o3-mini",
    name: "o3-mini",
    provider: "OpenAI",
    description: "Efficient reasoning model for mathematical and logical tasks",
    cost_per_1k_tokens: 0.002,
    max_tokens: 200000,
    supports_tools: true,
    supports_vision: false,
    frameworks: [AgentFramework.OPENAI, AgentFramework.LANGCHAIN, AgentFramework.AGNO]
  },
  {
    id: "o1",
    name: "o1",
    provider: "OpenAI",
    description: "Reasoning model with enhanced problem-solving for science and math",
    cost_per_1k_tokens: 0.015, // $15 per 1M input tokens
    max_tokens: 200000,
    supports_tools: true,
    supports_vision: true,
    frameworks: [AgentFramework.OPENAI, AgentFramework.LANGCHAIN, AgentFramework.AGNO]
  },
  {
    id: "o1-mini",
    name: "o1-mini",
    provider: "OpenAI",
    description: "Faster, cost-efficient reasoning model ideal for coding tasks",
    cost_per_1k_tokens: 0.003, // $3 per 1M input tokens
    max_tokens: 128000,
    supports_tools: true,
    supports_vision: false,
    frameworks: [AgentFramework.OPENAI, AgentFramework.LANGCHAIN, AgentFramework.AGNO]
  },
  {
    id: "o1-preview",
    name: "o1-preview",
    provider: "OpenAI",
    description: "Preview version of o1 reasoning model",
    cost_per_1k_tokens: 0.015,
    max_tokens: 128000,
    supports_tools: true,
    supports_vision: false,
    frameworks: [AgentFramework.OPENAI, AgentFramework.LANGCHAIN, AgentFramework.AGNO]
  },
  // Updated GPT-4o models
  {
    id: "gpt-4o-2024-11-20",
    name: "GPT-4o (Nov 2024)",
    provider: "OpenAI",
    description: "Latest GPT-4o with enhanced creative writing and accuracy",
    cost_per_1k_tokens: 0.0025, // $2.50 per 1M input tokens
    max_tokens: 128000,
    supports_tools: true,
    supports_vision: true,
    frameworks: [AgentFramework.OPENAI, AgentFramework.LANGCHAIN, AgentFramework.AGNO]
  },
  {
    id: "gpt-4o-2024-08-06",
    name: "GPT-4o (Aug 2024)",
    provider: "OpenAI",
    description: "GPT-4o with structured outputs and enhanced capabilities",
    cost_per_1k_tokens: 0.0025,
    max_tokens: 128000,
    supports_tools: true,
    supports_vision: true,
    frameworks: [AgentFramework.OPENAI, AgentFramework.LANGCHAIN, AgentFramework.AGNO]
  },
  {
    id: "gpt-4o",
    name: "GPT-4o",
    provider: "OpenAI",
    description: "Most capable model, great for complex reasoning",
    cost_per_1k_tokens: 0.005,
    max_tokens: 128000,
    supports_tools: true,
    supports_vision: true,
    frameworks: [AgentFramework.OPENAI, AgentFramework.LANGCHAIN, AgentFramework.AGNO]
  },
  {
    id: "gpt-4o-mini",
    name: "GPT-4o Mini",
    provider: "OpenAI", 
    description: "Fast and cost-effective for most tasks",
    cost_per_1k_tokens: 0.00015,
    max_tokens: 128000,
    supports_tools: true,
    supports_vision: true,
    frameworks: [AgentFramework.OPENAI, AgentFramework.LANGCHAIN, AgentFramework.AGNO]
  },
  // GPT-4 Turbo
  {
    id: "gpt-4-turbo",
    name: "GPT-4 Turbo",
    provider: "OpenAI",
    description: "High performance model with large context window",
    cost_per_1k_tokens: 0.01, // $10 per 1M input tokens
    max_tokens: 128000,
    supports_tools: true,
    supports_vision: true,
    frameworks: [AgentFramework.OPENAI, AgentFramework.LANGCHAIN, AgentFramework.AGNO]
  },
  // GPT-3.5 Turbo (still widely used)
  {
    id: "gpt-3.5-turbo",
    name: "GPT-3.5 Turbo",
    provider: "OpenAI",
    description: "Fast and cost-effective for simple to moderate tasks",
    cost_per_1k_tokens: 0.0005, // $0.50 per 1M input tokens
    max_tokens: 16385,
    supports_tools: true,
    supports_vision: false,
    frameworks: [AgentFramework.OPENAI, AgentFramework.LANGCHAIN, AgentFramework.AGNO]
  },
  // Non-OpenAI models
  {
    id: "claude-3-5-sonnet-20241022",
    name: "Claude 3.5 Sonnet",
    provider: "Anthropic",
    description: "Excellent for analysis and creative tasks",
    cost_per_1k_tokens: 0.003,
    max_tokens: 200000,
    supports_tools: true,
    supports_vision: true,
    frameworks: [AgentFramework.LANGCHAIN, AgentFramework.AGNO]
  },
  {
    id: "gemini-1.5-pro",
    name: "Gemini 1.5 Pro",
    provider: "Google",
    description: "Great for multimodal tasks and long context",
    cost_per_1k_tokens: 0.00125,
    max_tokens: 2000000,
    supports_tools: true,
    supports_vision: true,
    frameworks: [AgentFramework.GOOGLE, AgentFramework.LANGCHAIN, AgentFramework.AGNO]
  },
  {
    id: "llama-3.1-70b-instruct",
    name: "Llama 3.1 70B",
    provider: "Meta",
    description: "Open source model, good for general tasks",
    cost_per_1k_tokens: 0.0009,
    max_tokens: 128000,
    supports_tools: true,
    supports_vision: false,
    frameworks: [AgentFramework.LANGCHAIN, AgentFramework.AGNO, AgentFramework.SMOLAGENTS]
  }
]

// Framework compatibility and features
export interface FrameworkInfo {
  id: AgentFramework
  name: string
  description: string
  features: string[]
  documentation_url: string
  supports_handoffs: boolean
  supports_mcp: boolean
}

export const FRAMEWORK_INFO: Record<AgentFramework, FrameworkInfo> = {
  [AgentFramework.OPENAI]: {
    id: AgentFramework.OPENAI,
    name: "OpenAI Agents SDK",
    description: "Official OpenAI agents framework with handoffs and tool calling",
    features: ["Handoffs", "Tool Calling", "Structured Output", "Vision"],
    documentation_url: "https://github.com/openai/openai-agents-python",
    supports_handoffs: true,
    supports_mcp: true
  },
  [AgentFramework.LANGCHAIN]: {
    id: AgentFramework.LANGCHAIN,
    name: "LangChain",
    description: "Popular framework with extensive ecosystem and tools",
    features: ["ReAct Agents", "Tool Calling", "Memory", "Chains"],
    documentation_url: "https://python.langchain.com/",
    supports_handoffs: true,
    supports_mcp: true
  },
  [AgentFramework.AGNO]: {
    id: AgentFramework.AGNO,
    name: "Agno",
    description: "Modern Python framework for building AI agents",
    features: ["Teams", "Tool Calling", "Workflows", "Memory"],
    documentation_url: "https://docs.agno.com/",
    supports_handoffs: false,
    supports_mcp: true
  },
  [AgentFramework.GOOGLE]: {
    id: AgentFramework.GOOGLE,
    name: "Google ADK",
    description: "Google's Agent Development Kit for building AI agents",
    features: ["LLM Agents", "Tool Calling", "Multimodal"],
    documentation_url: "https://google.github.io/adk-docs/",
    supports_handoffs: true,
    supports_mcp: true
  },
  [AgentFramework.SMOLAGENTS]: {
    id: AgentFramework.SMOLAGENTS,
    name: "SmolaAgents",
    description: "HuggingFace's lightweight agent framework",
    features: ["Code Agents", "Tool Calling", "Local Models"],
    documentation_url: "https://huggingface.co/docs/smolagents/",
    supports_handoffs: false,
    supports_mcp: true
  },
  [AgentFramework.LLAMA_INDEX]: {
    id: AgentFramework.LLAMA_INDEX,
    name: "LlamaIndex",
    description: "Framework focused on data-aware applications",
    features: ["ReAct Agents", "RAG", "Data Connectors"],
    documentation_url: "https://docs.llamaindex.ai/",
    supports_handoffs: false,
    supports_mcp: true
  },
  [AgentFramework.TINYAGENT]: {
    id: AgentFramework.TINYAGENT,
    name: "TinyAgent",
    description: "Lightweight agent framework for simple use cases",
    features: ["Minimal Setup", "Local Models", "Fast"],
    documentation_url: "",
    supports_handoffs: false,
    supports_mcp: true
  }
}

// Utility functions for model/framework compatibility
export function getCompatibleFrameworks(modelId: string): AgentFramework[] {
  const model = POPULAR_MODELS.find(m => m.id === modelId)
  return model?.frameworks || []
}

export function getCompatibleModels(framework: AgentFramework): ModelInfo[] {
  return POPULAR_MODELS.filter(model => model.frameworks.includes(framework))
}

export function isModelFrameworkCompatible(modelId: string, framework: AgentFramework): boolean {
  return getCompatibleFrameworks(modelId).includes(framework)
}

export interface WorkflowDefinition {
  identity: WorkflowIdentity
  nodes: any[]                 // ReactFlow nodes
  edges: any[]                 // ReactFlow edges
  metadata: {
    node_count: number
    edge_count: number
    agent_count: number
    tool_count: number
    input_count: number
    output_count: number
    complexity_score: number   // 1-10 based on structure
    estimated_cost: number     // Estimated execution cost
  }
}

export interface WorkflowAnalysis {
  structure_pattern: 'linear' | 'branching' | 'parallel' | 'complex'
  primary_purpose: string      // Detected main purpose
  tool_types: string[]         // List of tools used
  agent_roles: string[]        // Detected agent roles/purposes
  complexity_factors: string[] // What makes it complex
  suggested_name: string       // AI-generated name
  suggested_description: string // AI-generated description
  suggested_category: string   // AI-suggested category
}

export interface WorkflowNamingRequest {
  nodes: any[]
  edges: any[]
  existing_name?: string       // If updating existing workflow
  user_context?: string        // Additional context from user
}

export interface WorkflowNamingResponse {
  analysis: WorkflowAnalysis
  identity: Partial<WorkflowIdentity>
  confidence_score: number     // 0-1 how confident the AI is
  alternative_names: string[]  // Other name suggestions
}

// Workflow execution with identity context
export interface IdentifiedExecutionRequest {
  workflow_identity: WorkflowIdentity
  workflow_definition: WorkflowDefinition
  input_data: string
  framework: string
  execution_context?: {
    user_id?: string
    session_id?: string
    tags?: string[]
  }
}

export interface IdentifiedExecutionResponse {
  execution_id: string
  workflow_id: string          // Links back to workflow identity
  workflow_name: string        // For easy reference
  status: 'running' | 'completed' | 'failed'
  result?: string
  trace?: any
  error?: string
  started_at: string
  completed_at?: string
}

// Analytics types with workflow context
export interface WorkflowExecutionSummary {
  workflow_id: string
  workflow_name: string
  workflow_category: string
  total_executions: number
  successful_executions: number
  failed_executions: number
  average_duration_ms: number
  average_cost: number
  total_cost: number
  last_executed: string
  performance_trend: 'improving' | 'stable' | 'degrading'
}

export interface WorkflowAnalyticsSummary {
  total_workflows: number
  total_executions: number
  most_used_workflows: WorkflowExecutionSummary[]
  recent_executions: IdentifiedExecutionResponse[]
  category_breakdown: Record<string, number>
  performance_overview: {
    total_cost: number
    total_duration_ms: number
    average_cost_per_execution: number
    average_duration_per_execution: number
  }
}

// User preferences for system-wide model configuration
export interface UserPreferences {
  defaultModels: {
    chatAssistant: string        // Model for main chat assistant
    workflowNaming: string       // Model for workflow naming service
    contentExtraction: string    // Model for content extraction
    experimentAnalysis: string   // Model for experiment analysis
  }
  defaultFramework: AgentFramework
  costBudget?: {
    dailyLimit?: number         // Daily cost limit in USD
    warningThreshold?: number   // Warning at % of limit
  }
  performance?: {
    preferSpeed: boolean        // Prefer faster models over quality
    preferCost: boolean         // Prefer cheaper models over quality
  }
}

// Default user preferences
export const DEFAULT_USER_PREFERENCES: UserPreferences = {
  defaultModels: {
    chatAssistant: 'gpt-4o-mini',        // Cost-effective for most chat
    workflowNaming: 'gpt-4o-mini',       // Simple naming tasks
    contentExtraction: 'gpt-4o-mini',    // Simple extraction
    experimentAnalysis: 'gpt-4.1'        // More complex analysis
  },
  defaultFramework: AgentFramework.OPENAI,
  performance: {
    preferSpeed: false,
    preferCost: true
  }
}

// System model configuration with smart defaults
export interface SystemModelConfig {
  service: 'chat' | 'naming' | 'extraction' | 'analysis'
  currentModel: string
  recommendedModels: {
    speed: string      // Fastest option
    cost: string       // Cheapest option  
    quality: string    // Best quality option
    balanced: string   // Best balance
  }
  description: string
}

export const SYSTEM_MODEL_CONFIGS: SystemModelConfig[] = [
  {
    service: 'chat',
    currentModel: 'gpt-4o-mini',
    recommendedModels: {
      speed: 'gpt-4o-mini',
      cost: 'gpt-3.5-turbo', 
      quality: 'gpt-4.1',
      balanced: 'gpt-4o-mini'
    },
    description: 'Main chat assistant for workflow building and general questions'
  },
  {
    service: 'naming',
    currentModel: 'gpt-4o-mini',
    recommendedModels: {
      speed: 'gpt-3.5-turbo',
      cost: 'gpt-3.5-turbo',
      quality: 'gpt-4o',
      balanced: 'gpt-4o-mini'
    },
    description: 'AI service for generating workflow names and descriptions'
  },
  {
    service: 'extraction',
    currentModel: 'gpt-4o-mini',
    recommendedModels: {
      speed: 'gpt-3.5-turbo',
      cost: 'gpt-3.5-turbo',
      quality: 'gpt-4o',
      balanced: 'gpt-4o-mini'
    },
    description: 'Content extraction and structured data parsing'
  },
  {
    service: 'analysis',
    currentModel: 'gpt-4.1',
    recommendedModels: {
      speed: 'gpt-4o-mini',
      cost: 'gpt-4o-mini',
      quality: 'o1',
      balanced: 'gpt-4.1'
    },
    description: 'Complex analysis tasks like experiment evaluation'
  }
]

// Add execution status types for progress visualization
export type NodeExecutionStatus = 'idle' | 'pending' | 'running' | 'completed' | 'failed' | 'waiting' | 'waiting_for_input'

export interface NodeExecutionState {
  status: NodeExecutionStatus
  startTime?: number
  endTime?: number
  progress?: number // 0-100
  cost?: number
  output?: any
  error?: string
}

export interface WorkflowExecutionState {
  id: string
  status: 'idle' | 'running' | 'completed' | 'failed' | 'waiting_for_input'
  nodes: Map<string, NodeExecutionState>
  startTime: number
  totalCost: number
  progress: number // Overall completion percentage
  currentActivity?: string // Current execution activity description
  pendingInput?: boolean // Whether workflow is waiting for user input
  inputRequest?: {
    question: string
    timestamp: number
  }
}

export interface ExecutionProgressMessage {
  executionId: string
  nodeId?: string
  status: NodeExecutionStatus
  progress?: number
  startTime?: number
  endTime?: number
  cost?: number
  output?: any
  error?: string
  type: 'node_update' | 'workflow_update' | 'progress_update' | 'input_request' | 'input_received'
  inputRequest?: {
    question: string
    timestamp: number
  }
  userInput?: string
} 