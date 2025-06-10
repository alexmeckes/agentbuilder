/**
 * Enhanced Composio Error Handling System
 * Provides smart error recovery, user-friendly messages, and actionable solutions
 */

export interface ComposioError {
  type: 'auth' | 'rate_limit' | 'network' | 'tool_not_found' | 'permission' | 'server_error' | 'validation'
  message: string
  suggestedAction: string
  retryable: boolean
  errorCode?: string
  statusCode?: number
  details?: Record<string, any>
  timestamp: Date
}

export interface RetryConfig {
  maxRetries: number
  baseDelay: number
  maxDelay: number
  backoffMultiplier: number
}

export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelay: 1000, // 1 second
  maxDelay: 30000, // 30 seconds
  backoffMultiplier: 2
}

/**
 * Smart error classification and handling
 */
export class ComposioErrorHandler {
  private static errorHandlers: Record<number, (error: any) => ComposioError> = {
    400: (error) => ({
      type: 'validation',
      message: 'Invalid request parameters',
      suggestedAction: 'Check your input parameters and try again',
      retryable: false,
      statusCode: 400,
      details: error,
      timestamp: new Date()
    }),
    
    401: (error) => ({
      type: 'auth',
      message: 'Invalid API key or authentication failed',
      suggestedAction: 'Please verify your Composio API key in user settings',
      retryable: false,
      statusCode: 401,
      details: error,
      timestamp: new Date()
    }),
    
    403: (error) => ({
      type: 'permission',
      message: 'Insufficient permissions or app not connected',
      suggestedAction: 'Reconnect the app in your Composio dashboard with full permissions (read + write)',
      retryable: false,
      statusCode: 403,
      details: error,
      timestamp: new Date()
    }),
    
    404: (error) => ({
      type: 'tool_not_found',
      message: 'Tool or endpoint not found',
      suggestedAction: 'Ensure the tool is available and properly connected in your Composio account',
      retryable: false,
      statusCode: 404,
      details: error,
      timestamp: new Date()
    }),
    
    429: (error) => ({
      type: 'rate_limit',
      message: 'API rate limit exceeded',
      suggestedAction: 'Please wait a moment before trying again. Consider upgrading your Composio plan for higher limits.',
      retryable: true,
      statusCode: 429,
      details: error,
      timestamp: new Date()
    }),
    
    500: (error) => ({
      type: 'server_error',
      message: 'Composio server error',
      suggestedAction: 'This appears to be a temporary server issue. Please try again in a few moments.',
      retryable: true,
      statusCode: 500,
      details: error,
      timestamp: new Date()
    }),
    
    502: (error) => ({
      type: 'server_error',
      message: 'Service temporarily unavailable',
      suggestedAction: 'The Composio service is temporarily down. Please try again later.',
      retryable: true,
      statusCode: 502,
      details: error,
      timestamp: new Date()
    }),
    
    503: (error) => ({
      type: 'server_error',
      message: 'Service temporarily unavailable',
      suggestedAction: 'The Composio service is temporarily down. Please try again later.',
      retryable: true,
      statusCode: 503,
      details: error,
      timestamp: new Date()
    })
  }

  /**
   * Classify and enhance error with actionable information
   */
  static classifyError(error: any): ComposioError {
    // Handle fetch/network errors
    if (error.name === 'TypeError' && error.message?.includes('fetch')) {
      return {
        type: 'network',
        message: 'Network connection failed',
        suggestedAction: 'Check your internet connection and try again',
        retryable: true,
        details: { originalError: error.message },
        timestamp: new Date()
      }
    }

    // Handle timeout errors
    if (error.name === 'AbortError' || error.message?.includes('timeout')) {
      return {
        type: 'network',
        message: 'Request timed out',
        suggestedAction: 'The request took too long. Please try again.',
        retryable: true,
        details: { originalError: error.message },
        timestamp: new Date()
      }
    }

    // Handle HTTP response errors
    if (error.status || error.statusCode) {
      const statusCode = error.status || error.statusCode
      const handler = this.errorHandlers[statusCode]
      
      if (handler) {
        return handler(error)
      }
    }

    // Handle API-specific errors
    if (error.error) {
      // Composio API error format
      if (error.error.code) {
        return this.handleComposioApiError(error.error)
      }
    }

    // Default error handling
    return {
      type: 'server_error',
      message: error.message || 'An unexpected error occurred',
      suggestedAction: 'Please try again. If the problem persists, contact support.',
      retryable: true,
      details: { originalError: error },
      timestamp: new Date()
    }
  }

  /**
   * Handle Composio-specific API error formats
   */
  private static handleComposioApiError(error: any): ComposioError {
    const errorCode = error.code || error.type
    const message = error.message || error.detail || 'Unknown API error'

    switch (errorCode) {
      case 'INVALID_API_KEY':
        return {
          type: 'auth',
          message: 'Invalid API key',
          suggestedAction: 'Please verify your Composio API key in user settings',
          retryable: false,
          errorCode,
          timestamp: new Date()
        }

      case 'APP_NOT_CONNECTED':
        return {
          type: 'permission',
          message: 'App not connected to your Composio account',
          suggestedAction: 'Connect the required app in your Composio dashboard',
          retryable: false,
          errorCode,
          timestamp: new Date()
        }

      case 'INSUFFICIENT_PERMISSIONS':
        return {
          type: 'permission',
          message: 'Insufficient app permissions',
          suggestedAction: 'Reconnect the app with full permissions (read + write access)',
          retryable: false,
          errorCode,
          timestamp: new Date()
        }

      case 'TOOL_NOT_FOUND':
        return {
          type: 'tool_not_found',
          message: 'Tool not available',
          suggestedAction: 'Ensure the tool exists and is available for your connected apps',
          retryable: false,
          errorCode,
          timestamp: new Date()
        }

      default:
        return {
          type: 'server_error',
          message: message,
          suggestedAction: 'Please try again. If the problem persists, contact support.',
          retryable: true,
          errorCode,
          timestamp: new Date()
        }
    }
  }

  /**
   * Check if an error is retryable
   */
  static isRetryable(error: ComposioError): boolean {
    return error.retryable && ['rate_limit', 'network', 'server_error'].includes(error.type)
  }
}

/**
 * Retry utility with exponential backoff
 */
export class RetryManager {
  static async executeWithRetry<T>(
    operation: () => Promise<T>,
    config: RetryConfig = DEFAULT_RETRY_CONFIG
  ): Promise<T> {
    let lastError: any

    for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
      try {
        return await operation()
      } catch (error) {
        lastError = error
        const composioError = ComposioErrorHandler.classifyError(error)
        
        // Don't retry if error is not retryable or this is the last attempt
        if (!ComposioErrorHandler.isRetryable(composioError) || attempt === config.maxRetries) {
          throw composioError
        }

        // Calculate delay with exponential backoff
        const delay = Math.min(
          config.baseDelay * Math.pow(config.backoffMultiplier, attempt),
          config.maxDelay
        )

        console.log(`🔄 Retrying Composio operation (attempt ${attempt + 1}/${config.maxRetries + 1}) after ${delay}ms delay`)
        
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }

    // This should never be reached, but just in case
    throw ComposioErrorHandler.classifyError(lastError)
  }
}

/**
 * Connection health checker
 */
export class ComposioHealthChecker {
  private static healthEndpoints = [
    'https://backend.composio.dev/api/v1/connectedAccounts',
    'https://backend.composio.dev/api/v2/connectedAccounts',
    'https://backend.composio.dev/api/v1/apps'
  ]

  /**
   * Check Composio API health
   */
  static async checkHealth(apiKey: string): Promise<{healthy: boolean, details: any}> {
    const results = await Promise.allSettled(
      this.healthEndpoints.map(async (endpoint) => {
        const response = await fetch(endpoint, {
          method: 'GET',
          headers: {
            'x-api-key': apiKey,
            'Content-Type': 'application/json'
          },
          signal: AbortSignal.timeout(5000) // 5 second timeout
        })
        
        return {
          endpoint,
          status: response.status,
          ok: response.ok,
          responseTime: Date.now() // Simplified - in real implementation track actual response time
        }
      })
    )

    const successful = results.filter(r => r.status === 'fulfilled' && (r.value as any).ok).length
    const total = results.length

    return {
      healthy: successful > 0,
      details: {
        successRate: successful / total,
        results: results.map(r => 
          r.status === 'fulfilled' ? r.value : { error: r.reason }
        )
      }
    }
  }
}

/**
 * User-friendly error messages for different error types
 */
export const ERROR_MESSAGES = {
  auth: {
    title: '🔑 Authentication Error',
    description: 'There\'s an issue with your Composio API key',
    actions: [
      'Verify your API key in User Settings',
      'Generate a new API key from Composio dashboard',
      'Ensure you\'re using the correct API key format'
    ]
  },
  
  permission: {
    title: '🚫 Permission Error', 
    description: 'The app needs additional permissions or isn\'t connected',
    actions: [
      'Open your Composio dashboard',
      'Reconnect the app with full permissions',
      'Ensure you grant both read AND write access',
      'Refresh your tool connections in settings'
    ]
  },
  
  rate_limit: {
    title: '⏱️ Rate Limit Reached',
    description: 'You\'ve exceeded the API rate limit',
    actions: [
      'Wait a few minutes before trying again',
      'Consider upgrading your Composio plan',
      'Optimize your workflow to use fewer API calls'
    ]
  },
  
  network: {
    title: '🌐 Connection Error',
    description: 'Unable to connect to Composio services',
    actions: [
      'Check your internet connection',
      'Try again in a few moments',
      'Check if Composio services are operational'
    ]
  },
  
  server_error: {
    title: '⚠️ Server Error',
    description: 'Composio services are experiencing issues',
    actions: [
      'This is usually temporary - try again in a few minutes',
      'Check Composio status page for known issues',
      'Contact support if the issue persists'
    ]
  },
  
  tool_not_found: {
    title: '🔍 Tool Not Found',
    description: 'The requested tool is not available',
    actions: [
      'Ensure the app is connected in Composio',
      'Verify the tool name is correct',
      'Refresh your available tools in settings'
    ]
  },
  
  validation: {
    title: '📝 Input Error',
    description: 'There\'s an issue with the provided parameters',
    actions: [
      'Check all required parameters are provided',
      'Verify parameter formats and types',
      'Review the tool documentation'
    ]
  }
}

/**
 * React hook for handling Composio errors
 */
export const useComposioErrorHandler = () => {
  const handleError = (error: any) => {
    const composioError = ComposioErrorHandler.classifyError(error)
    const errorInfo = ERROR_MESSAGES[composioError.type]
    
    return {
      error: composioError,
      errorInfo,
      retry: composioError.retryable
    }
  }

  const executeWithErrorHandling = async <T>(
    operation: () => Promise<T>,
    retryConfig?: RetryConfig
  ): Promise<T> => {
    try {
      return await RetryManager.executeWithRetry(operation, retryConfig)
    } catch (error) {
      const handled = handleError(error)
      throw handled.error
    }
  }

  return {
    handleError,
    executeWithErrorHandling,
    classifyError: ComposioErrorHandler.classifyError,
    isRetryable: ComposioErrorHandler.isRetryable
  }
} 