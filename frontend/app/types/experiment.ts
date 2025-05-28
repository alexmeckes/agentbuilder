import { AgentFramework, ModelInfo, WorkflowDefinition } from './workflow'

// Experiment Configuration Types
export interface ExperimentConfiguration {
  id: string
  name: string
  description: string
  workflow: WorkflowDefinition
  variants: ExperimentVariant[]
  testInputs: TestInput[]
  settings: ExperimentSettings
  created_at: string
  status: 'draft' | 'running' | 'completed' | 'paused' | 'failed'
}

export interface ExperimentVariant {
  id: string
  name: string
  description: string
  framework: AgentFramework
  model_id: string
  model_parameters: {
    temperature?: number
    max_tokens?: number
    top_p?: number
    top_k?: number
  }
  color: string // For UI visualization
}

export interface TestInput {
  id: string
  name: string
  input_data: string
  expected_output?: string
  weight: number // For weighted scoring
}

export interface ExperimentSettings {
  iterations_per_variant: number
  parallel_execution: boolean
  timeout_seconds: number
  cost_limit_usd?: number
  success_criteria: SuccessCriteria[]
}

export interface SuccessCriteria {
  metric: 'response_time' | 'cost' | 'accuracy' | 'output_quality'
  operator: 'less_than' | 'greater_than' | 'equals'
  value: number
  weight: number
}

// Experiment Execution Types
export interface ExperimentExecution {
  id: string
  experiment_id: string
  variant_id: string
  test_input_id: string
  iteration: number
  status: 'pending' | 'running' | 'completed' | 'failed'
  started_at?: string
  completed_at?: string
  result?: ExperimentResult
}

export interface ExperimentResult {
  execution_id: string
  output: string
  response_time_ms: number
  cost_usd: number
  token_usage: {
    input_tokens: number
    output_tokens: number
    total_tokens: number
  }
  success: boolean
  error?: string
  quality_score?: number // AI-generated quality assessment
  trace?: any
}

// Analysis Types
export interface ExperimentAnalysis {
  experiment_id: string
  overall_summary: ExperimentSummary
  variant_comparisons: VariantComparison[]
  statistical_significance: StatisticalTest[]
  recommendations: string[]
  generated_at: string
}

export interface ExperimentSummary {
  total_executions: number
  successful_executions: number
  total_cost: number
  average_response_time: number
  best_performing_variant: string
  cost_efficiency_leader: string
}

export interface VariantComparison {
  variant_id: string
  variant_name: string
  metrics: VariantMetrics
  sample_outputs: SampleOutput[]
  ranking: number
}

export interface VariantMetrics {
  success_rate: number
  average_response_time: number
  average_cost: number
  total_cost: number
  average_quality_score: number
  consistency_score: number // How consistent outputs are
  executions_count: number
}

export interface SampleOutput {
  test_input_name: string
  output: string
  response_time_ms: number
  cost_usd: number
  quality_score?: number
}

export interface StatisticalTest {
  test_name: string
  metric: string
  p_value: number
  confidence_level: number
  significant: boolean
  interpretation: string
}

// UI State Types
export interface ExperimentUIState {
  currentStep: 'setup' | 'variants' | 'inputs' | 'settings' | 'review'
  selectedWorkflow?: WorkflowDefinition
  isCreating: boolean
  isRunning: boolean
  errors: Record<string, string>
}

// Predefined experiment templates
export interface ExperimentTemplate {
  id: string
  name: string
  description: string
  category: 'performance' | 'cost' | 'quality' | 'comprehensive'
  variants: Partial<ExperimentVariant>[]
  settings: Partial<ExperimentSettings>
  test_inputs: Partial<TestInput>[]
}

export const EXPERIMENT_TEMPLATES: ExperimentTemplate[] = [
  {
    id: 'speed-test',
    name: 'Speed Comparison',
    description: 'Compare response times across different models',
    category: 'performance',
    variants: [
      { name: 'GPT-4.1 Nano', framework: AgentFramework.OPENAI, model_id: 'gpt-4.1-nano', color: '#10B981' },
      { name: 'GPT-4o Mini', framework: AgentFramework.OPENAI, model_id: 'gpt-4o-mini', color: '#3B82F6' },
      { name: 'GPT-4o', framework: AgentFramework.OPENAI, model_id: 'gpt-4o', color: '#8B5CF6' }
    ],
    settings: {
      iterations_per_variant: 5,
      parallel_execution: true,
      timeout_seconds: 60,
      success_criteria: [
        { metric: 'response_time', operator: 'less_than', value: 10000, weight: 1.0 }
      ]
    },
    test_inputs: [
      { name: 'Simple Query', input_data: 'What is the capital of France?', weight: 1.0 },
      { name: 'Complex Analysis', input_data: 'Analyze the economic implications of renewable energy adoption', weight: 1.5 }
    ]
  },
  {
    id: 'cost-efficiency',
    name: 'Cost Efficiency Test',
    description: 'Find the most cost-effective model for your use case',
    category: 'cost',
    variants: [
      { name: 'GPT-4.1 Nano', framework: AgentFramework.OPENAI, model_id: 'gpt-4.1-nano', color: '#10B981' },
      { name: 'GPT-4o Mini', framework: AgentFramework.OPENAI, model_id: 'gpt-4o-mini', color: '#3B82F6' },
      { name: 'GPT-3.5 Turbo', framework: AgentFramework.OPENAI, model_id: 'gpt-3.5-turbo', color: '#F59E0B' }
    ],
    settings: {
      iterations_per_variant: 10,
      parallel_execution: false,
      timeout_seconds: 30,
      cost_limit_usd: 1.0,
      success_criteria: [
        { metric: 'cost', operator: 'less_than', value: 0.01, weight: 1.0 }
      ]
    },
    test_inputs: []
  },
  {
    id: 'reasoning-comparison',
    name: 'Reasoning Models Test',
    description: 'Compare reasoning capabilities across o-series and standard models',
    category: 'quality',
    variants: [
      { name: 'o4-mini', framework: AgentFramework.OPENAI, model_id: 'o4-mini', color: '#10B981' },
      { name: 'o1-mini', framework: AgentFramework.OPENAI, model_id: 'o1-mini', color: '#3B82F6' },
      { name: 'GPT-4.1', framework: AgentFramework.OPENAI, model_id: 'gpt-4.1', color: '#8B5CF6' }
    ],
    settings: {
      iterations_per_variant: 3,
      parallel_execution: true,
      timeout_seconds: 120,
      success_criteria: [
        { metric: 'output_quality', operator: 'greater_than', value: 0.8, weight: 0.6 },
        { metric: 'response_time', operator: 'less_than', value: 60000, weight: 0.4 }
      ]
    },
    test_inputs: [
      { name: 'Math Problem', input_data: 'Solve this step by step: If a train travels 120 km in 2 hours, and then 180 km in 3 hours, what is its average speed for the entire journey?', weight: 1.0 },
      { name: 'Logic Puzzle', input_data: 'Three friends have different colored shirts: red, blue, and green. Alice is not wearing red. Bob is not wearing blue. Charlie is not wearing green. What color is each person wearing?', weight: 1.5 }
    ]
  },
  {
    id: 'latest-models-showdown',
    name: 'Latest Models Showdown',
    description: 'Compare the newest GPT-4.1 series models',
    category: 'comprehensive',
    variants: [
      { name: 'GPT-4.1', framework: AgentFramework.OPENAI, model_id: 'gpt-4.1', color: '#10B981' },
      { name: 'GPT-4.1 Mini', framework: AgentFramework.OPENAI, model_id: 'gpt-4.1-mini', color: '#3B82F6' },
      { name: 'GPT-4.1 Nano', framework: AgentFramework.OPENAI, model_id: 'gpt-4.1-nano', color: '#8B5CF6' }
    ],
    settings: {
      iterations_per_variant: 3,
      parallel_execution: true,
      timeout_seconds: 45,
      success_criteria: [
        { metric: 'response_time', operator: 'less_than', value: 15000, weight: 0.3 },
        { metric: 'cost', operator: 'less_than', value: 0.005, weight: 0.3 },
        { metric: 'output_quality', operator: 'greater_than', value: 0.8, weight: 0.4 }
      ]
    },
    test_inputs: []
  },
  {
    id: 'framework-comparison',
    name: 'Framework Showdown',
    description: 'Compare the same model across different frameworks',
    category: 'comprehensive',
    variants: [
      { name: 'OpenAI SDK', framework: AgentFramework.OPENAI, model_id: 'gpt-4o-mini', color: '#10B981' },
      { name: 'LangChain', framework: AgentFramework.LANGCHAIN, model_id: 'gpt-4o-mini', color: '#3B82F6' },
      { name: 'Agno', framework: AgentFramework.AGNO, model_id: 'gpt-4o-mini', color: '#8B5CF6' }
    ],
    settings: {
      iterations_per_variant: 3,
      parallel_execution: true,
      timeout_seconds: 45,
      success_criteria: [
        { metric: 'response_time', operator: 'less_than', value: 15000, weight: 0.3 },
        { metric: 'cost', operator: 'less_than', value: 0.005, weight: 0.3 },
        { metric: 'output_quality', operator: 'greater_than', value: 0.8, weight: 0.4 }
      ]
    },
    test_inputs: []
  }
]

// Utility functions
export function getVariantColor(index: number): string {
  const colors = [
    '#10B981', // Green
    '#3B82F6', // Blue  
    '#8B5CF6', // Purple
    '#F59E0B', // Amber
    '#EF4444', // Red
    '#06B6D4', // Cyan
    '#84CC16', // Lime
    '#F97316'  // Orange
  ]
  return colors[index % colors.length]
}

export function calculateExperimentCost(experiment: ExperimentConfiguration): number {
  // Rough cost estimation based on variants and iterations
  const totalExecutions = experiment.variants.length * 
                          experiment.testInputs.length * 
                          experiment.settings.iterations_per_variant
  
  // Average cost per execution (rough estimate)
  const avgCostPerExecution = 0.002
  
  return totalExecutions * avgCostPerExecution
}

export function getExperimentDuration(experiment: ExperimentConfiguration): number {
  // Estimate duration in minutes
  const totalExecutions = experiment.variants.length * 
                          experiment.testInputs.length * 
                          experiment.settings.iterations_per_variant
  
  const avgTimePerExecution = experiment.settings.parallel_execution ? 30 : 60 // seconds
  const parallelFactor = experiment.settings.parallel_execution ? experiment.variants.length : 1
  
  return Math.ceil((totalExecutions * avgTimePerExecution) / (parallelFactor * 60))
} 