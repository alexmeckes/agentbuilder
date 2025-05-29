export interface EvaluationResult {
  passed: boolean
  reason: string
  criteria: string
  points: number
}

export interface CheckpointCriteria {
  points: number
  criteria: string
}

export interface GroundTruthAnswer {
  name: string
  value: string | number
  points?: number
}

export interface EvaluationCase {
  id?: string
  name?: string
  llm_judge: string
  checkpoints: CheckpointCriteria[]
  ground_truth: GroundTruthAnswer[]
  final_output_criteria: CheckpointCriteria[]
  created_at?: string
}

export interface TraceEvaluationResult {
  trace: any // AgentTrace type would go here
  hypothesis_answer: string | null
  checkpoint_results: EvaluationResult[]
  ground_truth_results: EvaluationResult[]
  final_output_results: EvaluationResult[]
  score: number
  passed?: boolean
  total_points?: number
  earned_points?: number
  summary?: string
}

export interface EvaluationRun {
  id: string
  name: string
  evaluation_case: EvaluationCase
  trace_id: string
  result: TraceEvaluationResult
  created_at: string
  status: 'running' | 'completed' | 'failed'
  duration_ms?: number
}

export interface EvaluationSuite {
  id: string
  name: string
  description: string
  evaluation_cases: EvaluationCase[]
  runs: EvaluationRun[]
  created_at: string
  updated_at: string
}

export interface EvaluationMetrics {
  total_runs: number
  average_score: number
  pass_rate: number
  total_points: number
  earned_points: number
  by_criteria: {
    [criteria: string]: {
      pass_rate: number
      average_points: number
      total_attempts: number
    }
  }
}

export const EVALUATION_TEMPLATES = {
  'basic-qa': {
    name: 'Basic Q&A Evaluation',
    description: 'Evaluate question-answering workflows',
    template: {
      llm_judge: 'openai/gpt-4o',
      checkpoints: [
        {
          points: 1,
          criteria: 'Agent provided a clear and direct answer to the question'
        },
        {
          points: 1,
          criteria: 'Agent used appropriate tools or reasoning to find the answer'
        }
      ],
      ground_truth: [],
      final_output_criteria: []
    }
  },
  'research-workflow': {
    name: 'Research Workflow Evaluation',
    description: 'Evaluate research and information gathering workflows',
    template: {
      llm_judge: 'openai/gpt-4o',
      checkpoints: [
        {
          points: 2,
          criteria: 'Agent performed comprehensive web search for relevant information'
        },
        {
          points: 2,
          criteria: 'Agent analyzed and synthesized information from multiple sources'
        },
        {
          points: 1,
          criteria: 'Agent provided citations or references for key claims'
        }
      ],
      ground_truth: [],
      final_output_criteria: []
    }
  },
  'data-analysis': {
    name: 'Data Analysis Evaluation',
    description: 'Evaluate data processing and analysis workflows',
    template: {
      llm_judge: 'openai/gpt-4o',
      checkpoints: [
        {
          points: 2,
          criteria: 'Agent correctly processed and cleaned the input data'
        },
        {
          points: 3,
          criteria: 'Agent applied appropriate analytical methods'
        },
        {
          points: 2,
          criteria: 'Agent provided clear insights and conclusions'
        }
      ],
      ground_truth: [],
      final_output_criteria: []
    }
  }
} as const

export type EvaluationTemplateKey = keyof typeof EVALUATION_TEMPLATES 