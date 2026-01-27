import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { SRELogger } from "../_shared/sre-logger.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Fail fast if required secrets are missing
const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing required environment variables: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// PARALLELIZED GDPR data collection
async function collectUserData(userId: string) {
  SRELogger.setFunctionName('generate-gdpr-export');
  const timer = SRELogger.startTimer('collectUserData');
  
  const userData: any = {
    profile: null,
    bookings: [],
    spaces: [],
    messages: [],
    reviews_given: [],
    reviews_received: [],
    connections: [],
    payments: [],
    notifications: [],
    gdpr_requests: [],
    favorites: [],
    reports: [],
    errors: []
  };

  SRELogger.info('Starting parallel data collection', { userId });

  // Execute all queries in parallel using Promise.allSettled
  const [
    profileResult,
    bookingsResult,
    spacesResult,
    messagesResult,
    reviewsGivenResult,
    reviewsReceivedResult,
    connectionsResult,
    paymentsResult,
    notificationsResult,
    gdprRequestsResult
  ] = await Promise.allSettled([
    supabase.from('profiles').select('*').eq('id', userId).single(),
    supabase.from('bookings').select('*').eq('user_id', userId),
    supabase.from('spaces').select('*').eq('host_id', userId),
    supabase.from('messages').select('*').eq('sender_id', userId),
    supabase.from('booking_reviews').select('*').eq('author_id', userId),
    supabase.from('booking_reviews').select('*').eq('target_id', userId),
    supabase.from('connections').select('*').or(`sender_id.eq.${userId},receiver_id.eq.${userId}`),
    supabase.from('payments').select('*').eq('user_id', userId),
    supabase.from('user_notifications').select('*').eq('user_id', userId),
    supabase.from('gdpr_requests').select('*').eq('user_id', userId)
  ]);

  // Process results with error handling
  const processResult = (result: PromiseSettledResult<any>, key: string, isSingle = false) => {
    if (result.status === 'fulfilled') {
      const { data, error } = result.value;
      if (error) {
        userData.errors.push(`${key} fetch failed: ${error.message}`);
        SRELogger.warn(`${key} query error`, { error: error.message });
      } else {
        userData[key] = isSingle ? data : (data || []);
      }
    } else {
      userData.errors.push(`${key} query rejected: ${result.reason}`);
      SRELogger.error(`${key} query rejected`, { reason: String(result.reason) });
    }
  };

  processResult(profileResult, 'profile', true);
  processResult(bookingsResult, 'bookings');
  processResult(spacesResult, 'spaces');
  processResult(messagesResult, 'messages');
  processResult(reviewsGivenResult, 'reviews_given');
  processResult(reviewsReceivedResult, 'reviews_received');
  processResult(connectionsResult, 'connections');
  processResult(paymentsResult, 'payments');
  processResult(notificationsResult, 'notifications');
  processResult(gdprRequestsResult, 'gdpr_requests');

  timer();
  
  SRELogger.info('Data collection complete', { 
    userId,
    errorCount: userData.errors.length,
    recordCounts: {
      bookings: userData.bookings.length,
      spaces: userData.spaces.length,
      messages: userData.messages.length,
      payments: userData.payments.length
    }
  });

  return userData;
}

// Text export generator
function generateTextExport(userData: any): Uint8Array {
  const content = `GDPR DATA EXPORT
==========================================
Date: ${new Date().toLocaleDateString('it-IT')}
Time: ${new Date().toLocaleTimeString('it-IT')}
Generated at: ${new Date().toISOString()}

==========================================
ERRORS ENCOUNTERED DURING COLLECTION
==========================================
${userData.errors.length > 0 ? userData.errors.map((error: string, i: number) => `${i + 1}. ${error}`).join('\n') : 'No errors encountered'}

==========================================
PROFILE DATA
==========================================
${userData.profile ? JSON.stringify(userData.profile, null, 2) : 'No profile data collected'}

==========================================
BOOKINGS (${userData.bookings?.length || 0} records)
==========================================
${userData.bookings?.length > 0 ? JSON.stringify(userData.bookings, null, 2) : 'No bookings found'}

==========================================
SPACES (${userData.spaces?.length || 0} records)
==========================================
${userData.spaces?.length > 0 ? JSON.stringify(userData.spaces, null, 2) : 'No spaces found'}

==========================================
MESSAGES (${userData.messages?.length || 0} records)
==========================================
${userData.messages?.length > 0 ? JSON.stringify(userData.messages, null, 2) : 'No messages found'}

==========================================
REVIEWS GIVEN (${userData.reviews_given?.length || 0} records)
==========================================
${userData.reviews_given?.length > 0 ? JSON.stringify(userData.reviews_given, null, 2) : 'No reviews given found'}

==========================================
REVIEWS RECEIVED (${userData.reviews_received?.length || 0} records)
==========================================
${userData.reviews_received?.length > 0 ? JSON.stringify(userData.reviews_received, null, 2) : 'No reviews received found'}

==========================================
CONNECTIONS (${userData.connections?.length || 0} records)
==========================================
${userData.connections?.length > 0 ? JSON.stringify(userData.connections, null, 2) : 'No connections found'}

==========================================
PAYMENTS (${userData.payments?.length || 0} records)
==========================================
${userData.payments?.length > 0 ? JSON.stringify(userData.payments, null, 2) : 'No payments found'}

==========================================
NOTIFICATIONS (${userData.notifications?.length || 0} records)
==========================================
${userData.notifications?.length > 0 ? JSON.stringify(userData.notifications, null, 2) : 'No notifications found'}

==========================================
GDPR REQUESTS (${userData.gdpr_requests?.length || 0} records)
==========================================
${userData.gdpr_requests?.length > 0 ? JSON.stringify(userData.gdpr_requests, null, 2) : 'No GDPR requests found'}

==========================================
END OF EXPORT
==========================================
`;

  return new TextEncoder().encode(content);
}

serve(async (req) => {
  const correlationId = crypto.randomUUID();
  SRELogger.setCorrelationId(correlationId);
  SRELogger.setFunctionName('generate-gdpr-export');
  
  SRELogger.info('GDPR Export request received', { method: req.method });
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      SRELogger.warn('No authorization header');
      return new Response(JSON.stringify({ error: 'No authorization header' }), { 
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      SRELogger.warn('Authentication failed', { error: authError?.message });
      return new Response(JSON.stringify({ 
        error: 'Authentication failed',
        details: authError?.message 
      }), { 
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    SRELogger.info('User authenticated', { userId: user.id });

    // Create GDPR request
    const downloadToken = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const { data: newRequest, error: insertError } = await supabase
      .from('gdpr_requests')
      .insert({
        user_id: user.id,
        request_type: 'data_export',
        status: 'processing',
        download_token: downloadToken,
        expires_at: expiresAt.toISOString(),
        notes: 'Parallel query export'
      })
      .select()
      .single();

    if (insertError) {
      SRELogger.error('GDPR request creation failed', { error: insertError.message });
      throw new Error(`Request creation failed: ${insertError.message}`);
    }

    SRELogger.info('GDPR request created', { requestId: newRequest.id });

    // Collect data (now parallelized)
    const userData = await collectUserData(user.id);
    
    // Generate export
    const textData = generateTextExport(userData);
    
    // Upload file
    const fileName = `exports/${user.id}/${downloadToken}/export.txt`;
    
    const { error: uploadError } = await supabase.storage
      .from('gdpr-exports')
      .upload(fileName, textData, {
        contentType: 'text/plain; charset=utf-8',
        upsert: true
      });

    if (uploadError) {
      SRELogger.error('File upload failed', { error: uploadError.message });
      throw new Error(`Upload failed: ${uploadError.message}`);
    }

    // Get download URL
    const { data: signedUrlData, error: urlError } = await supabase.storage
      .from('gdpr-exports')
      .createSignedUrl(fileName, 24 * 60 * 60);

    if (urlError || !signedUrlData?.signedUrl) {
      SRELogger.error('URL generation failed', { error: urlError?.message });
      throw new Error(`URL generation failed: ${urlError?.message}`);
    }

    // Update request status
    await supabase
      .from('gdpr_requests')
      .update({
        status: 'completed',
        export_file_url: signedUrlData.signedUrl,
        file_size: textData.length,
        completed_at: new Date().toISOString()
      })
      .eq('id', newRequest.id);

    SRELogger.info('GDPR export completed successfully', { 
      requestId: newRequest.id,
      fileSize: textData.length 
    });

    return new Response(JSON.stringify({
      success: true,
      requestId: newRequest.id,
      downloadUrl: signedUrlData.signedUrl,
      expiresAt: expiresAt.toISOString(),
      fileSize: textData.length,
      errorsEncountered: userData.errors.length
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    SRELogger.error('GDPR export failed', { 
      error: error.message,
      stack: error.stack 
    });
    
    return new Response(JSON.stringify({ 
      error: 'Export failed', 
      details: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } finally {
    SRELogger.reset();
  }
});
