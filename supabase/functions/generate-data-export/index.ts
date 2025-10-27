import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get authenticated user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Autorizzazione richiesta' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Utente non autenticato' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Generating data export for user ${user.id}`);

    // Fetch all user data
    const [
      profileData,
      bookingsData,
      ticketsData,
      preferencesData,
      messagesData,
      reviewsData,
    ] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', user.id).single(),
      supabase.from('bookings').select('*').eq('coworker_id', user.id),
      supabase.from('support_tickets').select('*').eq('user_id', user.id),
      supabase.from('user_preferences').select('*').eq('user_id', user.id),
      supabase.from('messages').select('*').eq('sender_id', user.id),
      supabase.from('reviews').select('*').eq('reviewer_id', user.id),
    ]);

    // Create export data structure
    const exportData = {
      export_date: new Date().toISOString(),
      user_id: user.id,
      profile: profileData.data || null,
      bookings: bookingsData.data || [],
      support_tickets: ticketsData.data || [],
      preferences: preferencesData.data || [],
      messages: messagesData.data || [],
      reviews: reviewsData.data || [],
    };

    // Convert to JSON string
    const jsonString = JSON.stringify(exportData, null, 2);
    const jsonBlob = new TextEncoder().encode(jsonString);

    // Upload to Supabase Storage
    const fileName = `export_${user.id}_${Date.now()}.json`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('exports')
      .upload(fileName, jsonBlob, {
        contentType: 'application/json',
        upsert: false,
      });

    if (uploadError) {
      console.error('Error uploading export:', uploadError);
      return new Response(
        JSON.stringify({ error: 'Errore durante il caricamento dell\'export' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate signed URL (valid for 7 days)
    const { data: urlData } = await supabase.storage
      .from('exports')
      .createSignedUrl(fileName, 7 * 24 * 60 * 60); // 7 days in seconds

    console.log(`Data export generated successfully: ${fileName}`);

    // TODO: Send email with download link via Resend (Phase 4)

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Export dati generato con successo',
        download_url: urlData?.signedUrl,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        file_size: jsonBlob.length,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in generate-data-export:', error);
    return new Response(
      JSON.stringify({ error: 'Errore interno del server' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
