import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@15.0.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
      apiVersion: '2023-10-16',
    });

    // Get failed events with retry count < 3
    const { data: failedEvents, error: fetchError } = await supabaseAdmin
      .from('webhook_events')
      .select('*')
      .eq('status', 'failed')
      .lt('retry_count', 3)
      .order('created_at', { ascending: true })
      .limit(10);

    if (fetchError) {
      console.error('Error fetching failed events:', fetchError);
      throw fetchError;
    }

    if (!failedEvents || failedEvents.length === 0) {
      console.log('No failed events to retry');
      return new Response(
        JSON.stringify({ message: 'No failed events to retry', retried: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let successCount = 0;
    let failCount = 0;

    for (const evt of failedEvents) {
      try {
        console.log(`Retrying event ${evt.event_id} (attempt ${evt.retry_count + 1})`);
        
        // Re-invoke main webhook handler
        const response = await fetch(
          `${Deno.env.get('SUPABASE_URL')}/functions/v1/stripe-webhooks`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`
            },
            body: JSON.stringify(evt.payload)
          }
        );

        if (response.ok) {
          successCount++;
          console.log(`✅ Successfully retried event ${evt.event_id}`);
        } else {
          failCount++;
          const errorText = await response.text();
          console.error(`❌ Retry failed for event ${evt.event_id}:`, errorText);
          
          // Increment retry count
          await supabaseAdmin.rpc('increment_webhook_retry', { 
            event_uuid: evt.id 
          });

          await supabaseAdmin
            .from('webhook_events')
            .update({
              last_error: `Retry failed: ${errorText}`,
              updated_at: new Date().toISOString()
            })
            .eq('id', evt.id);
        }
      } catch (retryError) {
        failCount++;
        console.error(`❌ Exception retrying event ${evt.event_id}:`, retryError);
        
        await supabaseAdmin.rpc('increment_webhook_retry', { 
          event_uuid: evt.id 
        });

        await supabaseAdmin
          .from('webhook_events')
          .update({
            last_error: `Retry exception: ${retryError.message}`,
            updated_at: new Date().toISOString()
          })
          .eq('id', evt.id);
      }
    }

    console.log(`Retry summary: ${successCount} succeeded, ${failCount} failed`);

    return new Response(
      JSON.stringify({
        message: 'Retry completed',
        total: failedEvents.length,
        succeeded: successCount,
        failed: failCount
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in retry-failed-webhooks:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
