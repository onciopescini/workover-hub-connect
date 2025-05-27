
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

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
    // Cambiato il nome della variabile per matchare il secret in Supabase
    const mapboxToken = Deno.env.get("NEXT_PUBLIC_MAPBOX_TOKEN");
    
    console.log("Mapbox token check:", mapboxToken ? "Token found" : "Token not found");
    
    if (!mapboxToken) {
      console.error("NEXT_PUBLIC_MAPBOX_TOKEN environment variable not set");
      return new Response(
        JSON.stringify({ error: "Mapbox token not configured" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log("Returning token successfully");
    return new Response(
      JSON.stringify({ token: mapboxToken }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in get-mapbox-token function:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
