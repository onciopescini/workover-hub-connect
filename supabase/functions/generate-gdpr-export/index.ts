import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// SIMPLIFIED VERSION - DEBUG ONLY
console.log('🚀 Starting GDPR Export Function - DEBUG MODE');

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

console.log('🔧 Environment check:', {
  hasUrl: !!supabaseUrl,
  hasKey: !!supabaseServiceKey,
  urlPreview: supabaseUrl?.substring(0, 30) + '...'
});

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// COMPLETE GDPR data collection with DEBUG logging
async function collectUserData(userId: string) {
  console.log('🔵 Starting COMPLETE data collection for user:', userId);
  const startTime = Date.now();
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
    events: [],
    event_reviews_given: [],
    event_reviews_received: [],
    errors: []
  };

  // CHECKPOINT 1: Profile data
  try {
    console.log('📋 CHECKPOINT 1: Fetching profile...');
    const profileStart = Date.now();
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (profileError) {
      console.error('❌ Profile error:', profileError);
      userData.errors.push(`Profile fetch failed: ${profileError.message}`);
    } else {
      userData.profile = profile;
      console.log('✅ Profile fetched in', Date.now() - profileStart, 'ms');
    }
  } catch (error) {
    console.error('🔴 Profile section failed:', error);
    userData.errors.push(`Profile section failed: ${error.message}`);
  }

  // CHECKPOINT 2: Bookings
  try {
    console.log('📋 CHECKPOINT 2: Fetching bookings...');
    const bookingsStart = Date.now();
    const { data: bookings, error: bookingsError } = await supabase
      .from('bookings')
      .select('*')
      .eq('user_id', userId);

    if (bookingsError) {
      console.error('❌ Bookings error:', bookingsError);
      userData.errors.push(`Bookings fetch failed: ${bookingsError.message}`);
    } else {
      userData.bookings = bookings || [];
      console.log(`✅ Bookings fetched: ${bookings?.length || 0} records in ${Date.now() - bookingsStart}ms`);
    }
  } catch (error) {
    console.error('🔴 Bookings section failed:', error);
    userData.errors.push(`Bookings section failed: ${error.message}`);
  }

  // CHECKPOINT 3: Spaces
  try {
    console.log('📋 CHECKPOINT 3: Fetching spaces...');
    const spacesStart = Date.now();
    const { data: spaces, error: spacesError } = await supabase
      .from('spaces')
      .select('*')
      .eq('host_id', userId);

    if (spacesError) {
      console.error('❌ Spaces error:', spacesError);
      userData.errors.push(`Spaces fetch failed: ${spacesError.message}`);
    } else {
      userData.spaces = spaces || [];
      console.log(`✅ Spaces fetched: ${spaces?.length || 0} records in ${Date.now() - spacesStart}ms`);
    }
  } catch (error) {
    console.error('🔴 Spaces section failed:', error);
    userData.errors.push(`Spaces section failed: ${error.message}`);
  }

  // CHECKPOINT 4: Messages
  try {
    console.log('📋 CHECKPOINT 4: Fetching messages...');
    const messagesStart = Date.now();
    const { data: messages, error: messagesError } = await supabase
      .from('messages')
      .select('*')
      .eq('sender_id', userId);

    if (messagesError) {
      console.error('❌ Messages error:', messagesError);
      userData.errors.push(`Messages fetch failed: ${messagesError.message}`);
    } else {
      userData.messages = messages || [];
      console.log(`✅ Messages fetched: ${messages?.length || 0} records in ${Date.now() - messagesStart}ms`);
    }
  } catch (error) {
    console.error('🔴 Messages section failed:', error);
    userData.errors.push(`Messages section failed: ${error.message}`);
  }

  // CHECKPOINT 5: Reviews given
  try {
    console.log('📋 CHECKPOINT 5: Fetching reviews given...');
    const reviewsStart = Date.now();
    const { data: reviewsGiven, error: reviewsGivenError } = await supabase
      .from('booking_reviews')
      .select('*')
      .eq('author_id', userId);

    if (reviewsGivenError) {
      console.error('❌ Reviews given error:', reviewsGivenError);
      userData.errors.push(`Reviews given fetch failed: ${reviewsGivenError.message}`);
    } else {
      userData.reviews_given = reviewsGiven || [];
      console.log(`✅ Reviews given fetched: ${reviewsGiven?.length || 0} records in ${Date.now() - reviewsStart}ms`);
    }
  } catch (error) {
    console.error('🔴 Reviews given section failed:', error);
    userData.errors.push(`Reviews given section failed: ${error.message}`);
  }

  // CHECKPOINT 6: Reviews received
  try {
    console.log('📋 CHECKPOINT 6: Fetching reviews received...');
    const reviewsRecStart = Date.now();
    const { data: reviewsReceived, error: reviewsReceivedError } = await supabase
      .from('booking_reviews')
      .select('*')
      .eq('target_id', userId);

    if (reviewsReceivedError) {
      console.error('❌ Reviews received error:', reviewsReceivedError);
      userData.errors.push(`Reviews received fetch failed: ${reviewsReceivedError.message}`);
    } else {
      userData.reviews_received = reviewsReceived || [];
      console.log(`✅ Reviews received fetched: ${reviewsReceived?.length || 0} records in ${Date.now() - reviewsRecStart}ms`);
    }
  } catch (error) {
    console.error('🔴 Reviews received section failed:', error);
    userData.errors.push(`Reviews received section failed: ${error.message}`);
  }

  // CHECKPOINT 7: Connections
  try {
    console.log('📋 CHECKPOINT 7: Fetching connections...');
    const connectionsStart = Date.now();
    const { data: connections, error: connectionsError } = await supabase
      .from('connections')
      .select('*')
      .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`);

    if (connectionsError) {
      console.error('❌ Connections error:', connectionsError);
      userData.errors.push(`Connections fetch failed: ${connectionsError.message}`);
    } else {
      userData.connections = connections || [];
      console.log(`✅ Connections fetched: ${connections?.length || 0} records in ${Date.now() - connectionsStart}ms`);
    }
  } catch (error) {
    console.error('🔴 Connections section failed:', error);
    userData.errors.push(`Connections section failed: ${error.message}`);
  }

  // CHECKPOINT 8: Payments
  try {
    console.log('📋 CHECKPOINT 8: Fetching payments...');
    const paymentsStart = Date.now();
    const { data: payments, error: paymentsError } = await supabase
      .from('payments')
      .select('*')
      .eq('user_id', userId);

    if (paymentsError) {
      console.error('❌ Payments error:', paymentsError);
      userData.errors.push(`Payments fetch failed: ${paymentsError.message}`);
    } else {
      userData.payments = payments || [];
      console.log(`✅ Payments fetched: ${payments?.length || 0} records in ${Date.now() - paymentsStart}ms`);
    }
  } catch (error) {
    console.error('🔴 Payments section failed:', error);
    userData.errors.push(`Payments section failed: ${error.message}`);
  }

  // CHECKPOINT 9: Notifications
  try {
    console.log('📋 CHECKPOINT 9: Fetching notifications...');
    const notificationsStart = Date.now();
    const { data: notifications, error: notificationsError } = await supabase
      .from('user_notifications')
      .select('*')
      .eq('user_id', userId);

    if (notificationsError) {
      console.error('❌ Notifications error:', notificationsError);
      userData.errors.push(`Notifications fetch failed: ${notificationsError.message}`);
    } else {
      userData.notifications = notifications || [];
      console.log(`✅ Notifications fetched: ${notifications?.length || 0} records in ${Date.now() - notificationsStart}ms`);
    }
  } catch (error) {
    console.error('🔴 Notifications section failed:', error);
    userData.errors.push(`Notifications section failed: ${error.message}`);
  }

  // CHECKPOINT 10: GDPR requests
  try {
    console.log('📋 CHECKPOINT 10: Fetching GDPR requests...');
    const gdprStart = Date.now();
    const { data: gdprRequests, error: gdprError } = await supabase
      .from('gdpr_requests')
      .select('*')
      .eq('user_id', userId);

    if (gdprError) {
      console.error('❌ GDPR requests error:', gdprError);
      userData.errors.push(`GDPR requests fetch failed: ${gdprError.message}`);
    } else {
      userData.gdpr_requests = gdprRequests || [];
      console.log(`✅ GDPR requests fetched: ${gdprRequests?.length || 0} records in ${Date.now() - gdprStart}ms`);
    }
  } catch (error) {
    console.error('🔴 GDPR requests section failed:', error);
    userData.errors.push(`GDPR requests section failed: ${error.message}`);
  }

  const totalTime = Date.now() - startTime;
  console.log(`🎯 Data collection completed in ${totalTime}ms`);
  console.log(`📊 Summary: ${userData.errors.length} errors encountered`);
  
  if (userData.errors.length > 0) {
    console.log('🔍 Errors encountered:', userData.errors);
  }

  return userData;
}

// COMPLETE text export with all data
function generateTextExport(userData: any): Uint8Array {
  console.log('📝 Generating COMPLETE text export...');
  
  const content = `GDPR DATA EXPORT - COMPLETE DEBUG VERSION
==========================================
Date: ${new Date().toLocaleDateString('it-IT')}
Time: ${new Date().toLocaleTimeString('it-IT')}
Generated at: ${new Date().toISOString()}

==========================================
ERRORS ENCOUNTERED DURING COLLECTION
==========================================
${userData.errors.length > 0 ? userData.errors.map((error, i) => `${i + 1}. ${error}`).join('\n') : 'No errors encountered'}

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

  console.log('✅ Complete text content generated, length:', content.length);
  return new TextEncoder().encode(content);
}

serve(async (req) => {
  console.log('🌟 === GDPR Export Request START ===');
  console.log('📥 Method:', req.method);
  console.log('🔗 URL:', req.url);
  console.log('⏰ Timestamp:', new Date().toISOString());
  
  if (req.method === 'OPTIONS') {
    console.log('✅ CORS preflight - responding');
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🔐 Starting authentication...');
    
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      console.error('❌ No auth header');
      return new Response(JSON.stringify({ 
        error: 'No authorization header' 
      }), { 
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('🔑 Validating token...');
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      console.error('❌ Auth failed:', authError?.message);
      return new Response(JSON.stringify({ 
        error: 'Authentication failed',
        details: authError?.message 
      }), { 
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('✅ User authenticated:', user.id);

    // Skip duplicate check for debugging
    console.log('⚡ Skipping duplicate check for debug');

    // Create GDPR request
    console.log('📋 Creating GDPR request...');
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
        notes: 'DEBUG: Simplified export'
      })
      .select()
      .single();

    if (insertError) {
      console.error('❌ Insert error:', insertError);
      throw new Error(`Request creation failed: ${insertError.message}`);
    }

    console.log('✅ Request created:', newRequest.id);

    // Collect data
    console.log('📊 Starting data collection...');
    const userData = await collectUserData(user.id);
    
    // Generate export
    console.log('📄 Generating export...');
    const textData = generateTextExport(userData);
    
    // Upload file
    console.log('📤 Uploading file...');
    const fileName = `debug/${user.id}/${downloadToken}/export.txt`;
    
    const { error: uploadError } = await supabase.storage
      .from('gdpr-exports')
      .upload(fileName, textData, {
        contentType: 'text/plain; charset=utf-8',
        upsert: true
      });

    if (uploadError) {
      console.error('❌ Upload error:', uploadError);
      throw new Error(`Upload failed: ${uploadError.message}`);
    }

    console.log('✅ File uploaded');

    // Get download URL
    console.log('🔗 Creating download URL...');
    const { data: signedUrlData, error: urlError } = await supabase.storage
      .from('gdpr-exports')
      .createSignedUrl(fileName, 24 * 60 * 60);

    if (urlError || !signedUrlData?.signedUrl) {
      console.error('❌ URL error:', urlError);
      throw new Error(`URL generation failed: ${urlError?.message}`);
    }

    console.log('✅ Download URL created');

    // Update request
    console.log('🔄 Updating request status...');
    const { error: updateError } = await supabase
      .from('gdpr_requests')
      .update({
        status: 'completed',
        export_file_url: signedUrlData.signedUrl,
        file_size: textData.length,
        completed_at: new Date().toISOString()
      })
      .eq('id', newRequest.id);

    if (updateError) {
      console.error('⚠️ Update error (non-critical):', updateError);
    } else {
      console.log('✅ Request updated');
    }

    console.log('🎉 Export completed successfully!');
    console.log('📊 Final stats:', {
      requestId: newRequest.id,
      fileSize: textData.length,
      fileName
    });

    return new Response(JSON.stringify({
      success: true,
      downloadUrl: signedUrlData.signedUrl,
      fileSize: textData.length,
      expiresAt: expiresAt.toISOString(),
      message: 'DEBUG: Export completed successfully'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('🔴 FATAL ERROR:', error);
    console.error('🔍 Error details:', {
      name: error.name,
      message: error.message,
      stack: error.stack?.substring(0, 500)
    });
    
    return new Response(JSON.stringify({ 
      error: 'Export failed',
      details: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } finally {
    console.log('🏁 === GDPR Export Request END ===');
  }
});