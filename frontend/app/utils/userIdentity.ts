/**
 * User identity management for multi-tenant isolation
 */

/**
 * Get or create a persistent user ID for the current browser
 */
export function getUserId(): string {
  const STORAGE_KEY = 'any-agent-user-id'
  
  // Check if we're in the browser
  if (typeof window === 'undefined') {
    // Server-side: return anonymous
    return 'anonymous'
  }
  
  // Try to get existing user ID from localStorage
  let userId = localStorage.getItem(STORAGE_KEY)
  
  if (!userId) {
    // Generate a new user ID
    // Use crypto.randomUUID if available, otherwise fallback
    const uuid = typeof crypto !== 'undefined' && crypto.randomUUID 
      ? crypto.randomUUID() 
      : `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    userId = `user_${uuid}`
    localStorage.setItem(STORAGE_KEY, userId)
    console.log('🆔 Generated new user ID:', userId)
  }
  
  return userId
}

/**
 * Add user ID to request headers
 */
export function addUserHeaders(headers: HeadersInit = {}): HeadersInit {
  return {
    ...headers,
    'X-User-Id': getUserId()
  }
}

/**
 * Add user context to execution requests
 */
export function addUserContext(request: any): any {
  const userId = getUserId()
  
  // Always ensure we have user_context (snake_case) for backend compatibility
  if (!request.user_context) {
    request.user_context = {}
  }
  
  // Set the user_id in the expected format
  request.user_context.user_id = userId
  
  // If there's a camelCase userContext, merge its data
  if (request.userContext) {
    // Don't override user_id if it was already set correctly
    const { userId: camelCaseUserId, ...otherContext } = request.userContext
    request.user_context = {
      ...request.user_context,
      ...otherContext
    }
  }
  
  return request
}