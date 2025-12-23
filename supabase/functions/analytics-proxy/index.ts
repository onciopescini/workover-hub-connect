import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

serve(async (req) => {
  try {
    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // Allow POST only
    if (req.method !== 'POST') {
      // Return 200 even for wrong method to avoid client errors if client is confused
      return new Response('Method not allowed (handled gracefully)', {
        status: 200,
        headers: corsHeaders
      });
    }

    const contentType = req.headers.get('content-type') || 'application/x-www-form-urlencoded';
    const userAgent = req.headers.get('user-agent') || '';
    const referer = req.headers.get('referer') || '';
    const forwardedFor = req.headers.get('x-forwarded-for') || 'unknown';

    let bodyText = '';
    try {
      bodyText = await req.text();
    } catch (e) {
      console.warn('Failed to read body', e);
      // Fail silent
      return new Response('Invalid Body', { status: 200, headers: corsHeaders });
    }

    // Forward to Plausible
    try {
      const response = await fetch('https://plausible.io/api/event', {
        method: 'POST',
        headers: {
          'Content-Type': contentType,
          'User-Agent': userAgent,
          'Referer': referer,
          'X-Forwarded-For': forwardedFor
        },
        body: bodyText
      });

      if (!response.ok) {
        console.warn('Plausible API error:', response.status);
        // Fail silent to client
        return new Response('Analytics accepted (Upstream Error)', {
          status: 200,
          headers: corsHeaders
        });
      }

      return new Response('OK', { status: 200, headers: corsHeaders });

    } catch (fetchError) {
      console.error('Analytics upstream connection failed:', fetchError);
      return new Response('Analytics accepted (Network Error)', {
        status: 200,
        headers: corsHeaders
      });
    }

  } catch (error) {
    console.error('Analytics proxy critical error:', error);
    return new Response('Analytics accepted (Internal Error)', {
      status: 200,
      headers: corsHeaders
    });
  }
});
