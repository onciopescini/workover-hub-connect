// =====================================================
// ONDATA 2: FIX 2.10 - IMPROVED ERROR HANDLING WRAPPER
// =====================================================
// Centralized error handling for Edge Functions with alarm creation

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

export interface ErrorContext {
  functionName: string;
  userId?: string;
  requestId?: string;
  metadata?: Record<string, any>;
}

export interface EdgeFunctionError {
  message: string;
  code?: string;
  statusCode: number;
  context?: ErrorContext;
  stack?: string;
}

/**
 * Centralized error handler for Edge Functions
 * Creates system alarm for critical errors and returns standardized error response
 */
export async function handleEdgeFunctionError(
  error: any,
  context: ErrorContext,
  severity: 'low' | 'medium' | 'high' | 'critical' = 'medium'
): Promise<Response> {
  const statusCode = error.statusCode || 500;
  const errorMessage = error.message || String(error);
  
  console.error(`[${context.functionName}] Error:`, {
    message: errorMessage,
    statusCode,
    userId: context.userId,
    requestId: context.requestId,
    metadata: context.metadata,
    stack: error.stack
  });

  // Create system alarm for high/critical errors
  if (severity === 'high' || severity === 'critical') {
    try {
      const supabaseAdmin = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );

      await supabaseAdmin.rpc('create_system_alarm', {
        p_alarm_type: 'edge_function_failure',
        p_title: `Edge Function Error: ${context.functionName}`,
        p_message: errorMessage,
        p_severity: severity,
        p_source: context.functionName,
        p_error_details: error.stack || null,
        p_metadata: {
          userId: context.userId,
          requestId: context.requestId,
          statusCode,
          ...context.metadata
        }
      });
    } catch (alarmError) {
      console.error('[ERROR-HANDLER] Failed to create system alarm:', alarmError);
    }
  }

  // Return standardized error response
  const errorResponse: EdgeFunctionError = {
    message: errorMessage,
    code: error.code,
    statusCode,
    context: {
      functionName: context.functionName,
      requestId: context.requestId
    }
  };

  return new Response(
    JSON.stringify(errorResponse),
    {
      status: statusCode,
      headers: {
        'Content-Type': 'application/json',
        'X-Request-Id': context.requestId || 'unknown',
        'Access-Control-Allow-Origin': '*'
      }
    }
  );
}

/**
 * Wrapper function for Edge Function handlers with automatic error handling
 */
export function withErrorHandling(
  functionName: string,
  handler: (req: Request) => Promise<Response>,
  options: { severity?: 'low' | 'medium' | 'high' | 'critical' } = {}
): (req: Request) => Promise<Response> {
  return async (req: Request): Promise<Response> => {
    const requestId = crypto.randomUUID();
    
    try {
      return await handler(req);
    } catch (error: any) {
      // Extract user ID from auth header if available
      let userId: string | undefined;
      try {
        const authHeader = req.headers.get('Authorization');
        if (authHeader) {
          const supabase = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_ANON_KEY') ?? ''
          );
          const token = authHeader.replace('Bearer ', '');
          const { data } = await supabase.auth.getUser(token);
          userId = data?.user?.id;
        }
      } catch (authError) {
        console.warn('[ERROR-HANDLER] Failed to extract user ID:', authError);
      }

      return await handleEdgeFunctionError(
        error,
        {
          functionName,
          userId,
          requestId,
          metadata: {
            method: req.method,
            url: req.url
          }
        },
        options.severity || 'medium'
      );
    }
  };
}
