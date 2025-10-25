import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * Debug endpoint to check database tables and user settings
 */
export async function GET() {
  try {
    const supabase = await createClient()

    // Check if user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError) {
      return NextResponse.json({
        error: 'Auth error',
        details: authError.message,
      }, { status: 401 })
    }

    if (!user) {
      return NextResponse.json({
        error: 'Not authenticated',
        message: 'Please log in first'
      }, { status: 401 })
    }

    // Check if retailers table exists and has data
    const { data: retailers, error: retailersError } = await supabase
      .from('retailers')
      .select('*')
      .limit(5)

    // Check if user_settings table exists
    const { data: settings, error: settingsError } = await supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', user.id)
      .single()

    // Try to create settings if they don't exist
    let createdSettings = null
    if (settingsError?.code === 'PGRST116') {
      const forwardEmail = `${user.id.slice(0, 8)}@reclaim.ai`
      const { data: newSettings, error: createError } = await supabase
        .from('user_settings')
        .insert({
          user_id: user.id,
          forward_email: forwardEmail,
        })
        .select()
        .single()

      if (createError) {
        return NextResponse.json({
          error: 'Failed to create user settings',
          details: createError,
          user_id: user.id,
          attempted_email: forwardEmail,
        }, { status: 500 })
      }

      createdSettings = newSettings
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
      },
      tables: {
        retailers: {
          exists: !retailersError,
          count: retailers?.length || 0,
          error: retailersError?.message,
        },
        user_settings: {
          exists: !settingsError || settingsError.code === 'PGRST116',
          found: !!settings,
          created: !!createdSettings,
          data: settings || createdSettings,
          error: settingsError?.message,
        },
      },
    })
  } catch (error) {
    return NextResponse.json({
      error: 'Unexpected error',
      details: error instanceof Error ? error.message : String(error),
    }, { status: 500 })
  }
}
