'use client'

import { useState, useEffect } from 'react'
import { getUserId } from '../utils/userIdentity'

export default function DebugUserMigration() {
  const [debugInfo, setDebugInfo] = useState<any>(null)
  const [currentUserId, setCurrentUserId] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [migrationResult, setMigrationResult] = useState<any>(null)

  useEffect(() => {
    // Get current user ID
    const userId = getUserId()
    setCurrentUserId(userId)
    
    // Fetch debug info
    fetchDebugInfo()
  }, [])

  const fetchDebugInfo = async () => {
    try {
      const response = await fetch('/api/debug/user-executions', {
        headers: {
          'X-User-Id': getUserId()
        }
      })
      const data = await response.json()
      setDebugInfo(data)
    } catch (error) {
      console.error('Failed to fetch debug info:', error)
    }
  }

  const migrateExecutions = async () => {
    setLoading(true)
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000'}/api/debug/migrate-anonymous-executions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          target_user_id: currentUserId
        })
      })
      const result = await response.json()
      setMigrationResult(result)
      
      // Refresh debug info
      await fetchDebugInfo()
    } catch (error) {
      console.error('Migration failed:', error)
    } finally {
      setLoading(false)
    }
  }

  if (!debugInfo) {
    return <div>Loading debug information...</div>
  }

  return (
    <div className="p-6 bg-white rounded-lg shadow-sm border border-slate-200">
      <h2 className="text-xl font-bold mb-4">User Execution Debug Info</h2>
      
      <div className="mb-4 p-4 bg-blue-50 rounded">
        <p className="text-sm font-medium">Your Current User ID:</p>
        <p className="font-mono text-blue-700">{currentUserId}</p>
      </div>

      <div className="mb-4">
        <h3 className="font-semibold mb-2">Users with Executions:</h3>
        {Object.entries(debugInfo.users || {}).map(([userId, info]: [string, any]) => (
          <div key={userId} className="mb-2 p-3 bg-slate-50 rounded">
            <p className="font-mono text-sm">User: {userId}</p>
            <p className="text-sm text-slate-600">Executions: {info.execution_count}</p>
            {info.latest_execution && (
              <p className="text-xs text-slate-500">
                Last execution: {new Date(info.latest_execution * 1000).toLocaleString()}
              </p>
            )}
          </div>
        ))}
      </div>

      {debugInfo.users?.anonymous && (
        <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded">
          <p className="text-sm font-medium mb-2">Anonymous executions found!</p>
          <p className="text-sm text-slate-600 mb-3">
            There are {debugInfo.users.anonymous.execution_count} executions under "anonymous" that you can migrate to your user ID.
          </p>
          <button
            onClick={migrateExecutions}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Migrating...' : 'Migrate Anonymous Executions to My User ID'}
          </button>
        </div>
      )}

      {migrationResult && (
        <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded">
          <p className="text-sm font-medium">{migrationResult.message}</p>
          <p className="text-sm text-slate-600">Total executions for your user: {migrationResult.total_executions_for_user}</p>
        </div>
      )}
    </div>
  )
}