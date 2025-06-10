/**
 * Intelligent Caching System for Composio Integration
 * Reduces API calls, improves performance, and provides offline capabilities
 */

interface CacheEntry<T> {
  data: T
  timestamp: number
  ttl: number
  userId: string
  etag?: string
}

interface CacheStats {
  hits: number
  misses: number
  totalRequests: number
  cacheSize: number
  lastCleanup: number
}

/**
 * Advanced cache manager with TTL, user isolation, and intelligent cleanup
 */
export class ComposioCacheManager {
  private cache = new Map<string, CacheEntry<any>>()
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    totalRequests: 0,
    cacheSize: 0,
    lastCleanup: Date.now()
  }
  
  // Cache TTL settings (in milliseconds)
  private static readonly TTL_SETTINGS = {
    userProfile: 15 * 60 * 1000,        // 15 minutes
    connectedApps: 10 * 60 * 1000,      // 10 minutes
    availableActions: 30 * 60 * 1000,   // 30 minutes
    toolMetadata: 60 * 60 * 1000,       // 1 hour
    healthCheck: 5 * 60 * 1000,         // 5 minutes
    default: 10 * 60 * 1000             // 10 minutes default
  }

  /**
   * Get or fetch data with automatic caching
   */
  async getOrFetch<T>(
    key: string,
    fetcher: () => Promise<T>,
    options: {
      ttl?: number
      userId?: string
      forceRefresh?: boolean
      etag?: string
    } = {}
  ): Promise<T> {
    const {
      ttl = ComposioCacheManager.TTL_SETTINGS.default,
      userId = 'anonymous',
      forceRefresh = false,
      etag
    } = options

    this.stats.totalRequests++
    const cacheKey = this.buildCacheKey(key, userId)

    // Check if we should force refresh
    if (!forceRefresh) {
      const entry = this.cache.get(cacheKey)
      
      if (entry && this.isValidEntry(entry)) {
        // ETag validation for freshness
        if (etag && entry.etag && entry.etag === etag) {
          this.stats.hits++
          console.log(`📦 Cache hit: ${key} (ETag match)`)
          return entry.data
        }
        
        // TTL validation
        if (Date.now() - entry.timestamp < entry.ttl) {
          this.stats.hits++
          console.log(`📦 Cache hit: ${key} (TTL valid)`)
          return entry.data
        }
      }
    }

    // Cache miss - fetch data
    this.stats.misses++
    console.log(`🔄 Cache miss: ${key} - fetching fresh data`)
    
    try {
      const data = await fetcher()
      
      // Store in cache
      this.cache.set(cacheKey, {
        data,
        timestamp: Date.now(),
        ttl,
        userId,
        etag
      })
      
      this.updateCacheStats()
      this.scheduleCleanup()
      
      return data
    } catch (error) {
      // If fetch fails and we have stale data, return it with warning
      const entry = this.cache.get(cacheKey)
      if (entry) {
        console.warn(`⚠️ Fetch failed for ${key}, returning stale data`)
        return entry.data
      }
      throw error
    }
  }

  /**
   * Specialized method for user's connected apps
   */
  async getConnectedApps(
    userId: string,
    apiKey: string,
    forceRefresh: boolean = false
  ): Promise<string[]> {
    return this.getOrFetch(
      'connected-apps',
      async () => {
        const response = await fetch('https://backend.composio.dev/api/v1/connectedAccounts', {
          method: 'GET',
          headers: {
            'x-api-key': apiKey,
            'Content-Type': 'application/json'
          },
          signal: AbortSignal.timeout(10000)
        })

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`)
        }

        const data = await response.json()
        return data.items?.map((item: any) => item.appName || item.name || item.slug).filter(Boolean) || []
      },
      {
        ttl: ComposioCacheManager.TTL_SETTINGS.connectedApps,
        userId,
        forceRefresh
      }
    )
  }

  /**
   * Specialized method for app actions
   */
  async getAppActions(
    appName: string,
    userId: string,
    apiKey: string,
    forceRefresh: boolean = false
  ): Promise<any[]> {
    return this.getOrFetch(
      `app-actions-${appName}`,
      async () => {
        const response = await fetch(`https://backend.composio.dev/api/v2/actions?appNames=${appName}&limit=50`, {
          method: 'GET',
          headers: {
            'x-api-key': apiKey,
            'Content-Type': 'application/json'
          },
          signal: AbortSignal.timeout(15000)
        })

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`)
        }

        const data = await response.json()
        return data.items?.map((action: any) => ({
          name: action.name,
          displayName: action.displayName || action.name,
          description: action.description,
          parameters: action.parameters,
          appName: action.appName,
          tags: action.tags || []
        })) || []
      },
      {
        ttl: ComposioCacheManager.TTL_SETTINGS.availableActions,
        userId,
        forceRefresh
      }
    )
  }

  /**
   * Batch fetch app actions for multiple apps
   */
  async getBatchAppActions(
    appNames: string[],
    userId: string,
    apiKey: string,
    forceRefresh: boolean = false
  ): Promise<Record<string, any[]>> {
    const results: Record<string, any[]> = {}
    
    // Use Promise.allSettled to handle partial failures gracefully
    const promises = appNames.map(async (appName) => {
      try {
        const actions = await this.getAppActions(appName, userId, apiKey, forceRefresh)
        results[appName] = actions
      } catch (error) {
        console.warn(`Failed to fetch actions for ${appName}:`, error)
        results[appName] = []
      }
    })

    await Promise.allSettled(promises)
    return results
  }

  /**
   * Health check with caching
   */
  async checkHealth(
    apiKey: string,
    userId: string,
    forceRefresh: boolean = false
  ): Promise<{healthy: boolean, details: any}> {
    return this.getOrFetch(
      'health-check',
      async () => {
        const endpoints = [
          'https://backend.composio.dev/api/v1/connectedAccounts',
          'https://backend.composio.dev/api/v2/connectedAccounts'
        ]

        const results = await Promise.allSettled(
          endpoints.map(async (endpoint) => {
            const response = await fetch(endpoint, {
              method: 'GET',
              headers: {
                'x-api-key': apiKey,
                'Content-Type': 'application/json'
              },
              signal: AbortSignal.timeout(5000)
            })
            
            return {
              endpoint,
              status: response.status,
              ok: response.ok,
              responseTime: Date.now() // Simplified
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
      },
      {
        ttl: ComposioCacheManager.TTL_SETTINGS.healthCheck,
        userId,
        forceRefresh
      }
    )
  }

  /**
   * Invalidate cache entries for a specific user
   */
  invalidateUser(userId: string): void {
    const keysToDelete: string[] = []
    
    for (const [key, entry] of this.cache.entries()) {
      if (entry.userId === userId) {
        keysToDelete.push(key)
      }
    }
    
    keysToDelete.forEach(key => this.cache.delete(key))
    console.log(`🗑️ Invalidated ${keysToDelete.length} cache entries for user: ${userId}`)
    this.updateCacheStats()
  }

  /**
   * Invalidate specific cache key pattern
   */
  invalidatePattern(pattern: string, userId?: string): void {
    const regex = new RegExp(pattern.replace(/\*/g, '.*'))
    const keysToDelete: string[] = []
    
    for (const [key, entry] of this.cache.entries()) {
      if (regex.test(key) && (!userId || entry.userId === userId)) {
        keysToDelete.push(key)
      }
    }
    
    keysToDelete.forEach(key => this.cache.delete(key))
    console.log(`🗑️ Invalidated ${keysToDelete.length} cache entries matching pattern: ${pattern}`)
    this.updateCacheStats()
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats & { hitRate: number } {
    const hitRate = this.stats.totalRequests > 0 
      ? (this.stats.hits / this.stats.totalRequests) * 100 
      : 0

    return {
      ...this.stats,
      hitRate: Math.round(hitRate * 100) / 100
    }
  }

  /**
   * Preload common data to improve performance
   */
  async preloadUserData(userId: string, apiKey: string): Promise<void> {
    console.log(`🚀 Preloading data for user: ${userId}`)
    
    try {
      // Preload connected apps
      const connectedApps = await this.getConnectedApps(userId, apiKey)
      
      // Preload actions for each connected app (in background)
      if (connectedApps.length > 0) {
        // Don't await this - let it run in background
        this.getBatchAppActions(connectedApps.slice(0, 5), userId, apiKey) // Limit to first 5 apps
          .then(() => console.log(`✅ Background preload completed for ${connectedApps.length} apps`))
          .catch(error => console.warn('Background preload failed:', error))
      }
      
      // Preload health check
      this.checkHealth(apiKey, userId)
        .catch(error => console.warn('Health check preload failed:', error))
        
    } catch (error) {
      console.warn('Preload failed:', error)
    }
  }

  /**
   * Clear all cache data
   */
  clear(): void {
    this.cache.clear()
    this.stats = {
      hits: 0,
      misses: 0,
      totalRequests: 0,
      cacheSize: 0,
      lastCleanup: Date.now()
    }
    console.log('🗑️ Cache cleared')
  }

  // Private helper methods
  private buildCacheKey(key: string, userId: string): string {
    return `${userId}:${key}`
  }

  private isValidEntry(entry: CacheEntry<any>): boolean {
    return Date.now() - entry.timestamp < entry.ttl
  }

  private updateCacheStats(): void {
    this.stats.cacheSize = this.cache.size
  }

  private scheduleCleanup(): void {
    // Run cleanup every 5 minutes
    const cleanupInterval = 5 * 60 * 1000
    
    if (Date.now() - this.stats.lastCleanup > cleanupInterval) {
      this.cleanup()
    }
  }

  private cleanup(): void {
    const before = this.cache.size
    const now = Date.now()
    
    // Remove expired entries
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key)
      }
    }
    
    this.stats.lastCleanup = now
    this.updateCacheStats()
    
    const cleaned = before - this.cache.size
    if (cleaned > 0) {
      console.log(`🧹 Cleaned up ${cleaned} expired cache entries`)
    }
  }
}

// Singleton instance for global use
export const composioCacheManager = new ComposioCacheManager()

/**
 * React hook for Composio caching
 */
export const useComposioCache = () => {
  return {
    getOrFetch: composioCacheManager.getOrFetch.bind(composioCacheManager),
    getConnectedApps: composioCacheManager.getConnectedApps.bind(composioCacheManager),
    getAppActions: composioCacheManager.getAppActions.bind(composioCacheManager),
    getBatchAppActions: composioCacheManager.getBatchAppActions.bind(composioCacheManager),
    checkHealth: composioCacheManager.checkHealth.bind(composioCacheManager),
    invalidateUser: composioCacheManager.invalidateUser.bind(composioCacheManager),
    invalidatePattern: composioCacheManager.invalidatePattern.bind(composioCacheManager),
    preloadUserData: composioCacheManager.preloadUserData.bind(composioCacheManager),
    getStats: composioCacheManager.getStats.bind(composioCacheManager),
    clear: composioCacheManager.clear.bind(composioCacheManager)
  }
} 