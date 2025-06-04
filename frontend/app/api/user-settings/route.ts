import { NextRequest, NextResponse } from 'next/server'

interface UserSettings {
  userId: string
  composioApiKey?: string
  enabledTools: string[]
  preferences: {
    defaultFramework: string
    autoSaveWorkflows: boolean
  }
}

// In-memory storage (in production, use a database)
const userSettingsStore = new Map<string, UserSettings>()

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    
    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 })
    }

    const settings = userSettingsStore.get(userId)
    if (!settings) {
      return NextResponse.json({ error: 'User settings not found' }, { status: 404 })
    }

    // Return settings without exposing the API key
    const { composioApiKey, ...safeSettings } = settings
    return NextResponse.json({
      ...safeSettings,
      hasComposioKey: !!composioApiKey
    })
  } catch (error) {
    console.error('Error getting user settings:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const settings: UserSettings = await request.json()
    
    if (!settings.userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 })
    }

    // Store the settings (encrypt API key in production)
    userSettingsStore.set(settings.userId, settings)
    
    console.log(`📝 Saved settings for user: ${settings.userId}`)
    console.log(`🔑 Composio key provided: ${!!settings.composioApiKey}`)
    console.log(`🛠️  Enabled tools: ${settings.enabledTools.join(', ')}`)

    return NextResponse.json({ 
      success: true, 
      message: 'Settings saved successfully',
      hasComposioKey: !!settings.composioApiKey
    })
  } catch (error) {
    console.error('Error saving user settings:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 