import { UserPreferences, DEFAULT_USER_PREFERENCES, POPULAR_MODELS, ModelInfo } from '../types/workflow'

const PREFERENCES_STORAGE_KEY = 'workflow-composer-preferences'

export class PreferencesService {
  private static preferences: UserPreferences | null = null

  /**
   * Get current user preferences, loading from localStorage if needed
   */
  static getPreferences(): UserPreferences {
    if (this.preferences) {
      return this.preferences
    }

    // Try to load from localStorage
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(PREFERENCES_STORAGE_KEY)
        if (stored) {
          const parsed = JSON.parse(stored)
          // Merge with defaults to ensure all fields exist
          this.preferences = {
            ...DEFAULT_USER_PREFERENCES,
            ...parsed,
            defaultModels: {
              ...DEFAULT_USER_PREFERENCES.defaultModels,
              ...(parsed.defaultModels || {})
            }
          }
          return this.preferences
        }
      } catch (error) {
        console.warn('Failed to load preferences from localStorage:', error)
      }
    }

    // Return defaults
    this.preferences = { ...DEFAULT_USER_PREFERENCES }
    return this.preferences
  }

  /**
   * Update user preferences and persist to localStorage
   */
  static updatePreferences(updates: Partial<UserPreferences>): void {
    const current = this.getPreferences()
    this.preferences = {
      ...current,
      ...updates,
      defaultModels: {
        ...current.defaultModels,
        ...(updates.defaultModels || {})
      }
    }

    // Persist to localStorage
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(PREFERENCES_STORAGE_KEY, JSON.stringify(this.preferences))
      } catch (error) {
        console.warn('Failed to save preferences to localStorage:', error)
      }
    }
  }

  /**
   * Get the preferred model for a specific service
   */
  static getModelForService(service: 'chatAssistant' | 'workflowNaming' | 'contentExtraction' | 'experimentAnalysis'): string {
    const preferences = this.getPreferences()
    return preferences.defaultModels[service]
  }

  /**
   * Get model information for a given model ID
   */
  static getModelInfo(modelId: string): ModelInfo | null {
    return POPULAR_MODELS.find(model => model.id === modelId) || null
  }

  /**
   * Get recommended models based on user preferences
   */
  static getRecommendedModels(service: 'chat' | 'naming' | 'extraction' | 'analysis'): {
    speed: ModelInfo | null
    cost: ModelInfo | null
    quality: ModelInfo | null
    balanced: ModelInfo | null
  } {
    const preferences = this.getPreferences()
    
    // Define recommendations based on service type and user preferences
    const recommendations = {
      chat: {
        speed: 'gpt-4o-mini',
        cost: 'gpt-3.5-turbo',
        quality: preferences.performance?.preferCost ? 'gpt-4o' : 'gpt-4.1',
        balanced: 'gpt-4o-mini'
      },
      naming: {
        speed: 'gpt-3.5-turbo',
        cost: 'gpt-3.5-turbo',
        quality: 'gpt-4o',
        balanced: 'gpt-4o-mini'
      },
      extraction: {
        speed: 'gpt-3.5-turbo',
        cost: 'gpt-3.5-turbo',
        quality: 'gpt-4o',
        balanced: 'gpt-4o-mini'
      },
      analysis: {
        speed: 'gpt-4o-mini',
        cost: 'gpt-4o-mini',
        quality: preferences.performance?.preferCost ? 'gpt-4.1' : 'o1',
        balanced: 'gpt-4.1'
      }
    }

    const serviceRecs = recommendations[service]
    
    return {
      speed: this.getModelInfo(serviceRecs.speed),
      cost: this.getModelInfo(serviceRecs.cost),
      quality: this.getModelInfo(serviceRecs.quality),
      balanced: this.getModelInfo(serviceRecs.balanced)
    }
  }

  /**
   * Calculate estimated daily cost based on usage patterns
   */
  static estimateDailyCost(usage: {
    chatMessages: number
    workflowExecutions: number
    experiments: number
  }): number {
    const preferences = this.getPreferences()
    
    // Rough estimates based on typical token usage
    const chatTokens = usage.chatMessages * 500 // ~500 tokens per chat message
    const workflowTokens = usage.workflowExecutions * 1000 // ~1000 tokens per workflow
    const experimentTokens = usage.experiments * 2000 // ~2000 tokens per experiment
    
    const chatModel = this.getModelInfo(preferences.defaultModels.chatAssistant)
    const workflowModel = this.getModelInfo(preferences.defaultModels.workflowNaming)
    const experimentModel = this.getModelInfo(preferences.defaultModels.experimentAnalysis)
    
    const chatCost = chatTokens * (chatModel?.cost_per_1k_tokens || 0.0015)
    const workflowCost = workflowTokens * (workflowModel?.cost_per_1k_tokens || 0.0015)
    const experimentCost = experimentTokens * (experimentModel?.cost_per_1k_tokens || 0.002)
    
    return (chatCost + workflowCost + experimentCost) / 1000 // Convert to actual cost
  }

  /**
   * Get smart model suggestions based on user preferences and usage
   */
  static getSmartSuggestions(): {
    suggestion: string
    reason: string
    modelId: string
    service: string
  }[] {
    const preferences = this.getPreferences()
    const suggestions = []

    // Cost optimization suggestions
    if (preferences.performance?.preferCost) {
      const currentChatModel = this.getModelInfo(preferences.defaultModels.chatAssistant)
      if (currentChatModel && currentChatModel.cost_per_1k_tokens > 0.001) {
        suggestions.push({
          suggestion: 'Switch to GPT-3.5 Turbo for chat to reduce costs',
          reason: 'You prefer cost efficiency and GPT-3.5 Turbo is 70% cheaper',
          modelId: 'gpt-3.5-turbo',
          service: 'chatAssistant'
        })
      }
    }

    // Speed optimization suggestions
    if (preferences.performance?.preferSpeed) {
      const currentChatModel = this.getModelInfo(preferences.defaultModels.chatAssistant)
      if (currentChatModel && currentChatModel.id !== 'gpt-4o-mini') {
        suggestions.push({
          suggestion: 'Switch to GPT-4o Mini for faster responses',
          reason: 'You prefer speed and GPT-4o Mini is significantly faster',
          modelId: 'gpt-4o-mini',
          service: 'chatAssistant'
        })
      }
    }

    return suggestions
  }

  /**
   * Reset preferences to defaults
   */
  static resetToDefaults(): void {
    this.preferences = { ...DEFAULT_USER_PREFERENCES }
    
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem(PREFERENCES_STORAGE_KEY)
      } catch (error) {
        console.warn('Failed to clear preferences from localStorage:', error)
      }
    }
  }
} 