import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface AdminViewMessageRequest {
  messageId: string;
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
      console.log('❌ No authorization header provided')
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
      console.log('❌ Authentication failed:', authError)
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
      console.log('❌ User is not admin:', { userId: user.id, role: profile?.role })
      return new Response(
        JSON.stringify({ error: 'Admin access required' }),
        { 
          status: 403, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Extract message ID from URL path
    const url = new URL(req.url)
    const pathParts = url.pathname.split('/')
    const messageId = pathParts[pathParts.length - 1]
    
    if (!messageId || messageId === 'admin-view-message') {
      return new Response(
        JSON.stringify({ error: 'Message ID is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log('🔍 Admin viewing message:', messageId)

    // Get client IP and User-Agent for audit log
    const clientIP = req.headers.get('x-forwarded-for') || 
                     req.headers.get('x-real-ip') || 
                     'unknown'
    const userAgent = req.headers.get('user-agent') || 'unknown'

    // First, log the admin access attempt
    try {
      const { data: logResult, error: logError } = await supabase
        .rpc('log_admin_access', {
          p_table_name: 'messages',
          p_record_id: messageId,
          p_action: 'VIEW_MESSAGE',
          p_ip_address: clientIP,
          p_user_agent: userAgent,
          p_metadata: {
            timestamp: new Date().toISOString(),
            method: req.method,
            endpoint: url.pathname
          }
        })

      if (logError) {
        console.error('❌ Failed to log admin access:', logError)
        // Continue anyway, but log the error
      } else {
        console.log('✅ Admin access logged:', logResult)
      }
    } catch (logErr) {
      console.error('❌ Error logging admin access:', logErr)
      // Continue anyway
    }

    // Retrieve the message (bypass RLS with service role)
    const { data: message, error: messageError } = await supabase
      .from('messages')
      .select(`
        *,
        sender:profiles!messages_sender_id_fkey(id, first_name, last_name, profile_photo_url),
        booking:bookings!messages_booking_id_fkey(
          id, 
          booking_date, 
          start_time, 
          end_time,
          user:profiles!bookings_user_id_fkey(id, first_name, last_name),
          space:spaces!bookings_space_id_fkey(id, title, address)
        )
      `)
      .eq('id', messageId)
      .single()

    if (messageError || !message) {
      console.error('❌ Error retrieving message:', messageError)
      return new Response(
        JSON.stringify({ error: 'Message not found or access denied' }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log('✅ Message retrieved successfully by admin')

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: message,
        audit: {
          accessed_by: user.id,
          accessed_at: new Date().toISOString(),
          ip_address: clientIP
        }
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('❌ Unexpected error in admin-view-message function:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})