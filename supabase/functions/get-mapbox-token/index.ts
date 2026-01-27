
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { ErrorHandler } from "../_shared/error-handler.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const mapboxToken = Deno.env.get("MAPBOX_ACCESS_TOKEN");
    
    ErrorHandler.logInfo('Mapbox token retrieval attempt', { 
      hasToken: !!mapboxToken,
      tokenLength: mapboxToken?.length || 0 
    });
    
    // Validate token exists
    if (!mapboxToken) {
      ErrorHandler.logError('MAPBOX_ACCESS_TOKEN environment variable not set', null);
      return new Response(
        JSON.stringify({ 
          error: "Mapbox token not configured",
          details: "MAPBOX_ACCESS_TOKEN secret not found in environment"
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Validate token format (basic check)
    if (typeof mapboxToken !== 'string' || mapboxToken.length < 10) {
      ErrorHandler.logError('Invalid Mapbox token format', null, {
        tokenType: typeof mapboxToken,
        tokenLength: mapboxToken.length
      });
      return new Response(
        JSON.stringify({ 
          error: "Invalid token format",
          details: "Token does not match expected format"
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Additional validation: check if token starts with 'pk.' (public token) or 'sk.' (secret token)
    if (!mapboxToken.startsWith('pk.') && !mapboxToken.startsWith('sk.')) {
      ErrorHandler.logError('Mapbox token does not match expected prefix', null, {
        prefix: mapboxToken.substring(0, 3)
      });
      return new Response(
        JSON.stringify({ 
          error: "Invalid token prefix",
          details: "Token should start with 'pk.' or 'sk.'"
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    ErrorHandler.logSuccess('Mapbox token validated and returned successfully', {
      tokenPrefix: mapboxToken.substring(0, 3),
      tokenLength: mapboxToken.length
    });
    
    return new Response(
      JSON.stringify({ token: mapboxToken }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    ErrorHandler.logError('Unexpected error in get-mapbox-token function', error, {
      errorMessage: error instanceof Error ? error.message : String(error),
      errorType: error instanceof Error ? error.constructor.name : typeof error,
      stack: error instanceof Error ? error.stack : undefined
    });
    
    return new Response(
      JSON.stringify({ 
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error occurred"
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
