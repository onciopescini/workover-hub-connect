// Get environment - Deno.env.get returns undefined if not set
const DEPLOYMENT_ENV = Deno.env.get('DEPLOYMENT_ENV') || 'development';

// Production frontend domains
const ALLOWED_ORIGINS = [
  'https://workover-hub-connect.lovable.app',
  'https://id-preview--c2ec9501-6094-4703-9d15-50c43aa5d48f.lovable.app'
];

/**
 * Get CORS headers with origin validation.
 * In production: Only allow specific frontend domains.
 * In development: Allow all origins for local testing.
 */
export function getCorsHeaders(requestOrigin?: string | null): Record<string, string> {
  // Development mode: Allow all origins
  if (DEPLOYMENT_ENV === 'development') {
    return {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
      'Access-Control-Max-Age': '86400',
    };
  }

  // Production mode: Validate origin
  const origin = requestOrigin || '';
  const isAllowed = ALLOWED_ORIGINS.some(allowed => 
    origin === allowed || origin.endsWith('.lovable.app')
  );

  return {
    'Access-Control-Allow-Origin': isAllowed ? origin : ALLOWED_ORIGINS[0],
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin',
  };
}

// Legacy export for backward compatibility (deprecated)
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
