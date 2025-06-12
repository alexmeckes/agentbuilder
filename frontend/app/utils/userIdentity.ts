/**
 * User identity management for multi-tenant isolation
 */

/**
 * Get or create a persistent user ID for the current browser
 */
export function getUserId(): string {
  const STORAGE_KEY = 'any-agent-user-id'
  
  // Try to get existing user ID from localStorage
  let userId = localStorage.getItem(STORAGE_KEY)
  
  if (!userId) {
    // Generate a new user ID
    userId = `user_${crypto.randomUUID()}`
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
  
  // Add to user_context if it exists, otherwise create it
  if (request.user_context) {
    request.user_context.user_id = userId
  } else if (request.userContext) {
    request.userContext.userId = userId
  } else {
    // Create minimal user context
    request.user_context = {
      user_id: userId
    }
  }
  
  return request
}