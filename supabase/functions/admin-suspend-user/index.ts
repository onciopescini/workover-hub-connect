import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'
import { 
  suspendUserRequestSchema, 
  userIdParamSchema,
  type SuspendUserRequest 
} from './schemas.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get the authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization header required' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Set up supabase client with user's auth
    const userSupabase = createClient(
      supabaseUrl,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      {
        global: {
          headers: {
            Authorization: authHeader,
          },
        },
      }
    )

    // Get the authenticated user
    const { data: { user }, error: authError } = await userSupabase.auth.getUser()
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Authentication failed' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Check if user is admin
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profileError || profile?.role !== 'admin') {
      return new Response(
        JSON.stringify({ error: 'Admin access required' }),
        { 
          status: 403, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Extract user ID from URL path
    const url = new URL(req.url)
    const pathParts = url.pathname.split('/')
    const userIdIndex = pathParts.findIndex(part => part === 'users') + 1
    const targetUserId = pathParts[userIdIndex]
    
    if (!targetUserId || targetUserId === 'suspend') {
      return new Response(
        JSON.stringify({ 
          error: 'User ID is required',
          code: 'MISSING_USER_ID' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Validate user ID format
    const userIdValidation = userIdParamSchema.safeParse(targetUserId)
    if (!userIdValidation.success) {
      return new Response(
        JSON.stringify({ 
          error: 'Invalid user ID format',
          details: userIdValidation.error.issues[0].message,
          code: 'INVALID_USER_ID'
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Only allow PATCH method
    if (req.method !== 'PATCH') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { 
          status: 405, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Parse and validate request body
    const requestBody = await req.json()
    const bodyValidation = suspendUserRequestSchema.safeParse(requestBody)
    
    if (!bodyValidation.success) {
      return new Response(
        JSON.stringify({ 
          error: 'Invalid request data',
          details: bodyValidation.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join(', '),
          code: 'VALIDATION_ERROR'
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const { suspended_at, reason }: SuspendUserRequest = bodyValidation.data

    // Additional business logic validation
    if (suspended_at && !reason) {
      return new Response(
        JSON.stringify({ 
          error: 'Suspension reason is required when suspending a user',
          code: 'MISSING_REASON'
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }
    
    // Admin updating user suspension

    // Update user suspension status
    const updateData: any = {}
    
    if (suspended_at !== undefined) {
      updateData.suspended_at = suspended_at
    }
    
    if (reason !== undefined) {
      updateData.suspension_reason = reason
    }

    const { data: updatedProfile, error: updateError } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', targetUserId)
      .select()
      .single()

    if (updateError) {
      console.error('❌ Error updating user suspension:', updateError)
      return new Response(
        JSON.stringify({ 
          error: 'Failed to update user suspension', 
          details: updateError.message,
          code: 'DATABASE_ERROR'
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    if (!updatedProfile) {
      return new Response(
        JSON.stringify({ 
          error: 'User not found',
          code: 'USER_NOT_FOUND'
        }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Log the admin action
    try {
      const action = suspended_at ? 'SUSPEND_USER' : 'UNSUSPEND_USER'
      const { error: logError } = await supabase
        .rpc('log_admin_access', {
          p_table_name: 'profiles',
          p_record_id: targetUserId,
          p_action: action,
          p_ip_address: null,
          p_user_agent: null,
          p_metadata: {
            timestamp: new Date().toISOString(),
            reason: reason || null,
            suspended_at: suspended_at,
            admin_id: user.id
          }
        })

      if (logError) {
        console.error('❌ Failed to log admin action:', logError)
      }
    } catch (logErr) {
      console.error('❌ Error logging admin action:', logErr)
    }

    const actionMessage = suspended_at 
      ? `User suspended successfully${reason ? ` for: ${reason}` : ''}`
      : 'User suspension removed successfully'
    // Admin action completed successfully

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: actionMessage,
        profile: updatedProfile,
        suspended: !!suspended_at
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('❌ Unexpected error in admin-suspend-user function:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})