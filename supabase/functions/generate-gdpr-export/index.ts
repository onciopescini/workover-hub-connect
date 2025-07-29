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

// SUPER SIMPLIFIED data collection - JUST PROFILE
async function collectUserData(userId: string) {
  console.log('🔵 Starting MINIMAL data collection for user:', userId);
  
  try {
    console.log('🔍 Fetching profile ONLY...');
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, role, created_at, email')
      .eq('id', userId)
      .single();

    if (profileError) {
      console.error('❌ Profile error:', profileError);
      throw new Error(`Profile fetch failed: ${profileError.message}`);
    }

    console.log('✅ Profile data:', profile);
    return { profile };
    
  } catch (error) {
    console.error('🔴 collectUserData failed:', error);
    throw error;
  }
}

// MINIMAL text export
function generateTextExport(userData: any): Uint8Array {
  console.log('📝 Generating minimal text export...');
  
  const content = `DEBUG GDPR EXPORT
=================
Date: ${new Date().toLocaleDateString('it-IT')}
Time: ${new Date().toLocaleTimeString('it-IT')}

PROFILE DATA:
- ID: ${userData.profile?.id || 'Unknown'}
- Name: ${userData.profile?.first_name || ''} ${userData.profile?.last_name || ''}
- Role: ${userData.profile?.role || 'Unknown'}
- Created: ${userData.profile?.created_at || 'Unknown'}

This is a simplified debug export.
Generated at: ${new Date().toISOString()}
=================
`;

  console.log('✅ Text content generated, length:', content.length);
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