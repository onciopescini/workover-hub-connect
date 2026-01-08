import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { record } = await req.json()
    console.log('Received message payload:', record)

    if (!record?.booking_id || !record?.sender_id) {
      throw new Error('Missing booking_id or sender_id')
    }

    // 1. Fetch booking to get user_id and space_id
    const { data: booking, error: bookingError } = await supabaseAdmin
      .from('bookings')
      .select('user_id, space_id')
      .eq('id', record.booking_id)
      .single()

    if (bookingError || !booking) {
      console.error('Booking fetch error:', bookingError)
      throw new Error('Booking not found')
    }

    // 2. Fetch workspace to get host_id
    const { data: workspace, error: workspaceError } = await supabaseAdmin
      .from('workspaces')
      .select('host_id')
      .eq('id', booking.space_id)
      .single()

    if (workspaceError || !workspace) {
      console.error('Workspace fetch error:', workspaceError)
      throw new Error('Workspace not found')
    }

    // 3. Determine recipient
    let recipientId: string | null = null;
    
    // If sender is Host -> Recipient is Guest (booking.user_id)
    if (record.sender_id === workspace.host_id) {
      recipientId = booking.user_id
    }
    // If sender is Guest -> Recipient is Host (workspace.host_id)
    else if (record.sender_id === booking.user_id) {
      recipientId = workspace.host_id
    } else {
      console.log('Sender is neither host nor guest. Sender:', record.sender_id, 'Host:', workspace.host_id, 'Guest:', booking.user_id)
      return new Response(JSON.stringify({ message: 'Sender not relevant to booking' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    // 4. Get recipient email
    if (!recipientId) {
      console.warn(`No recipient ID for booking ${booking.id}`);
      // Return 200 to acknowledge receipt even if we can't send email
      return new Response(JSON.stringify({ message: 'No recipient identified' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUserById(recipientId)
    
    if (userError || !userData.user) {
       console.error('User fetch error:', userError)
       throw new Error('Recipient user not found')
    }

    const recipientEmail = userData.user.email
    if (!recipientEmail) {
        throw new Error('Recipient has no email')
    }

    // 5. Send Email via Resend
    const resendApiKey = Deno.env.get('RESEND_API_KEY')
    if (!resendApiKey) {
        throw new Error('Missing RESEND_API_KEY')
    }

    const emailRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${resendApiKey}`
      },
      body: JSON.stringify({
        from: 'WorkOver <notifications@workover.app>', // Or a configured sender
        to: [recipientEmail],
        subject: 'Nuovo messaggio su WorkOver',
        html: '<p>Hai ricevuto un nuovo messaggio. Accedi alla dashboard per leggerlo.</p>'
      })
    })

    if (!emailRes.ok) {
        const errorText = await emailRes.text()
        console.error('Resend error:', errorText)
        throw new Error(`Failed to send email: ${errorText}`)
    }

    const emailData = await emailRes.json()
    console.log('Email sent successfully:', emailData)

    return new Response(
      JSON.stringify({ success: true, emailId: emailData.id }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    console.error('Error in message broadcast:', error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 // Return 400 to distinguish from system errors
      }
    )
  }
})
