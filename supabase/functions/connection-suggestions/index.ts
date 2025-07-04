
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { ErrorHandler } from "../shared/error-handler.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseAdmin = createClient(
  Deno.env.get('NEXT_PUBLIC_SUPABASE_URL')!,
  Deno.env.get('SERVICE_ROLE_KEY')!
);

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    ErrorHandler.logInfo('Starting connection suggestions generation');

    // Call the existing database function for generating suggestions
    const { error: suggestionsError } = await supabaseAdmin
      .rpc('generate_connection_suggestions');

    if (suggestionsError) {
      throw suggestionsError;
    }

    ErrorHandler.logSuccess('Connection suggestions generated successfully');

    // Clean up expired connections
    const { error: cleanupError } = await supabaseAdmin
      .rpc('expire_pending_connections');

    if (cleanupError) {
      ErrorHandler.logWarning('Error cleaning up expired connections', {
        error: cleanupError
      });
    }

    // Get statistics for logging
    const { count: newSuggestionsCount } = await supabaseAdmin
      .from('connection_suggestions')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

    const { count: activeConnectionsCount } = await supabaseAdmin
      .from('connections')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'accepted');

    ErrorHandler.logInfo('Connection suggestions statistics', {
      new_suggestions: newSuggestionsCount,
      active_connections: activeConnectionsCount
    });

    return new Response(JSON.stringify({ 
      success: true,
      message: 'Connection suggestions generated successfully',
      stats: {
        new_suggestions: newSuggestionsCount,
        active_connections: activeConnectionsCount
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error: any) {
    ErrorHandler.logError('Error generating connection suggestions', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});
