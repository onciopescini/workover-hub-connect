import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders, status: 200 });
  }

  return new Response(
    JSON.stringify({
      error: "Deprecated endpoint: initial profile creation is managed atomically by database trigger handle_new_user.",
    }),
    {
      status: 410,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    },
  );
});
