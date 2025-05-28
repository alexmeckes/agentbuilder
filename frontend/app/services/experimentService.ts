import { ExperimentConfiguration, ExperimentResult, ExperimentAnalysis } from '../types/experiment'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

// Define the results type based on backend response structure
export interface ExperimentResults {
  experiment_id: string
  status: 'running' | 'completed' | 'failed'
  started_at: string
  completed_at?: string
  executions: BackendExperimentResult[]
  summary?: {
    total_executions: number
    successful_executions: number
    success_rate: number
    total_cost_usd: number
    avg_response_time_ms: number
    variant_metrics: Record<string, any>
    best_performers: {
      fastest: string
      cheapest: string
      highest_quality: string
    }
    recommendations: string[]
  }
  error?: string
}

// Backend execution result structure (different from frontend types)
export interface BackendExperimentResult {
  execution_id: string
  variant_id: string
  variant_name: string
  framework: string
  model_id: string
  test_input_name: string
  status: 'completed' | 'failed'
  output: string
  response_time_ms: number
  cost_usd: number
  quality_score: number
  iteration: number
  completed_at: string
  error?: string
}

export class ExperimentService {
  static async createExperiment(experiment: ExperimentConfiguration): Promise<{ success: boolean; experiment_id: string; experiment: ExperimentConfiguration }> {
    const response = await fetch(`${API_BASE}/experiments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(experiment),
    })

    if (!response.ok) {
      throw new Error(`Failed to create experiment: ${response.statusText}`)
    }

    return response.json()
  }

  static async listExperiments(): Promise<{ success: boolean; experiments: ExperimentConfiguration[] }> {
    const response = await fetch(`${API_BASE}/experiments`)

    if (!response.ok) {
      throw new Error(`Failed to list experiments: ${response.statusText}`)
    }

    return response.json()
  }

  static async getExperiment(experimentId: string): Promise<{ success: boolean; experiment: ExperimentConfiguration }> {
    const response = await fetch(`${API_BASE}/experiments/${experimentId}`)

    if (!response.ok) {
      throw new Error(`Failed to get experiment: ${response.statusText}`)
    }

    return response.json()
  }

  static async runExperiment(experimentId: string): Promise<{ success: boolean; message: string }> {
    const response = await fetch(`${API_BASE}/experiments/${experimentId}/run`, {
      method: 'POST',
    })

    if (!response.ok) {
      throw new Error(`Failed to run experiment: ${response.statusText}`)
    }

    const result = await response.json()
    
    // Start polling for status updates
    this.pollExperimentStatus(experimentId)
    
    return result
  }

  static async getExperimentResults(experimentId: string): Promise<{ success: boolean; experiment: ExperimentConfiguration; results: ExperimentResults }> {
    const response = await fetch(`${API_BASE}/experiments/${experimentId}/results`)

    if (!response.ok) {
      throw new Error(`Failed to get experiment results: ${response.statusText}`)
    }

    return response.json()
  }

  static async deleteExperiment(experimentId: string): Promise<{ success: boolean; message: string }> {
    const response = await fetch(`${API_BASE}/experiments/${experimentId}`, {
      method: 'DELETE',
    })

    if (!response.ok) {
      throw new Error(`Failed to delete experiment: ${response.statusText}`)
    }

    return response.json()
  }

  static async cancelExperiment(experimentId: string): Promise<{ success: boolean; message: string; experiment: ExperimentConfiguration }> {
    const response = await fetch(`${API_BASE}/experiments/${experimentId}/cancel`, {
      method: 'POST',
    })

    if (!response.ok) {
      throw new Error(`Failed to cancel experiment: ${response.statusText}`)
    }

    return response.json()
  }

  static async pollExperimentStatus(experimentId: string, maxAttempts: number = 60): Promise<void> {
    let attempts = 0
    
    const poll = async () => {
      try {
        attempts++
        const experiment = await this.getExperiment(experimentId)
        
        if (experiment.experiment.status === 'completed' || experiment.experiment.status === 'failed') {
          console.log(`✅ Experiment ${experimentId} finished with status: ${experiment.experiment.status}`)
          return
        }
        
        if (attempts >= maxAttempts) {
          console.warn(`⏰ Polling timeout for experiment ${experimentId} after ${maxAttempts} attempts`)
          return
        }
        
        // Continue polling
        setTimeout(poll, 3000) // Poll every 3 seconds
      } catch (error) {
        console.error(`❌ Error polling experiment ${experimentId}:`, error)
      }
    }
    
    poll()
  }
} 