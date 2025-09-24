import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { 
      status: 405, 
      headers: corsHeaders 
    });
  }

  try {
    const body = await req.text();
    const contentType = req.headers.get('content-type') || 'application/x-www-form-urlencoded';
    const userAgent = req.headers.get('user-agent') || '';
    const referer = req.headers.get('referer') || '';

    // Forward to Plausible with rate limiting
    const response = await fetch('https://plausible.io/api/event', {
      method: 'POST',
      headers: {
        'Content-Type': contentType,
        'User-Agent': userAgent,
        'Referer': referer,
        'X-Forwarded-For': req.headers.get('x-forwarded-for') || 'unknown'
      },
      body: body
    });

    // Log for debugging
    console.log('Analytics proxy request:', {
      status: response.status,
      referer,
      userAgent: userAgent.substring(0, 50) + '...'
    });

    if (!response.ok) {
      console.warn('Plausible API error:', response.status, await response.text());
      return new Response('Analytics service temporarily unavailable', {
        status: 503,
        headers: corsHeaders
      });
    }

    return new Response('OK', { 
      status: 200, 
      headers: corsHeaders 
    });

  } catch (error) {
    console.error('Analytics proxy error:', error);
    return new Response('Internal server error', {
      status: 500,
      headers: corsHeaders
    });
  }
});