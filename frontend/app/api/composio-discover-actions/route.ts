import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { apiKey, appNames } = await request.json()
    
    if (!apiKey) {
      return NextResponse.json({ 
        success: false, 
        message: 'API key is required' 
      }, { status: 400 })
    }

    console.log(`🔍 Discovering actions for apps: ${appNames?.join(', ') || 'all connected apps'}`)
    
    // First, get connected accounts if no specific apps provided
    let appsToQuery = appNames
    
    if (!appNames || appNames.length === 0) {
      try {
        const accountsResponse = await fetch('https://backend.composio.dev/api/v1/connectedAccounts', {
          method: 'GET',
          headers: {
            'x-api-key': apiKey,
            'Content-Type': 'application/json'
          },
          signal: AbortSignal.timeout(15000) // 15 second timeout
        })
        
        if (accountsResponse.ok) {
          const accountsData = await accountsResponse.json()
          if (accountsData.items && Array.isArray(accountsData.items)) {
            appsToQuery = accountsData.items.map((item: any) => 
              item.appName || item.name || item.slug
            ).filter(Boolean)
            console.log(`📱 Found connected apps: ${appsToQuery.join(', ')}`)
          }
        }
      } catch (error) {
        console.log(`⚠️ Could not fetch connected accounts: ${error}`)
        // Continue with common apps as fallback
        appsToQuery = ['googledocs', 'github', 'gmail', 'slack', 'notion']
      }
    }
    
    if (!appsToQuery || appsToQuery.length === 0) {
      return NextResponse.json({ 
        success: false, 
        message: 'No connected apps found' 
      }, { status: 404 })
    }

    // Fetch actions for each app
    const appActions: Record<string, any[]> = {}
    
    for (const appName of appsToQuery.slice(0, 10)) { // Limit to 10 apps max
      try {
        console.log(`🔍 Fetching actions for: ${appName}`)
        
        const actionsResponse = await fetch(`https://backend.composio.dev/api/v2/actions?appNames=${appName}&limit=20`, {
          method: 'GET',
          headers: {
            'x-api-key': apiKey,
            'Content-Type': 'application/json'
          },
          signal: AbortSignal.timeout(10000) // 10 second timeout per app
        })
        
        if (actionsResponse.ok) {
          const actionsData = await actionsResponse.json()
          if (actionsData.items && Array.isArray(actionsData.items)) {
            const actions = actionsData.items.map((action: any) => ({
              name: action.name,
              displayName: action.displayName || action.name,
              description: action.description,
              parameters: action.parameters,
              appName: action.appName,
              tags: action.tags || []
            }))
            
            appActions[appName] = actions
            console.log(`✅ Found ${actions.length} actions for ${appName}`)
          }
        } else {
          console.log(`❌ Failed to fetch actions for ${appName}: ${actionsResponse.status}`)
        }
      } catch (error) {
        console.log(`❌ Error fetching actions for ${appName}: ${error}`)
      }
    }
    
    // Calculate total actions found
    const totalActions = Object.values(appActions).reduce((sum, actions) => sum + actions.length, 0)
    
    if (totalActions === 0) {
      return NextResponse.json({ 
        success: false, 
        message: 'No actions found for connected apps' 
      }, { status: 404 })
    }

    console.log(`🎉 Successfully discovered ${totalActions} actions across ${Object.keys(appActions).length} apps`)
    
    return NextResponse.json({ 
      success: true, 
      message: `Found ${totalActions} actions across ${Object.keys(appActions).length} apps`,
      appActions: appActions,
      totalActions: totalActions,
      appsWithActions: Object.keys(appActions),
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error('Error discovering Composio actions:', error)
    return NextResponse.json({ 
      success: false, 
      message: 'Failed to discover actions. Please try again.' 
    }, { status: 500 })
  }
} 