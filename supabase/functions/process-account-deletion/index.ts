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

    const { token } = await req.json();

    if (!token) {
      return new Response(
        JSON.stringify({ error: 'Token richiesto' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify token and get deletion request
    const { data: deletionRequest, error: fetchError } = await supabase
      .from('account_deletion_requests')
      .select('*')
      .eq('token', token)
      .eq('status', 'pending')
      .single();

    if (fetchError || !deletionRequest) {
      return new Response(
        JSON.stringify({ error: 'Token non valido o scaduto' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if token is expired
    const now = new Date();
    const expiresAt = new Date(deletionRequest.expires_at);
    if (now > expiresAt) {
      await supabase
        .from('account_deletion_requests')
        .update({ status: 'expired' })
        .eq('id', deletionRequest.id);

      return new Response(
        JSON.stringify({ error: 'Token scaduto. Richiedi una nuova cancellazione.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update deletion request status
    await supabase
      .from('account_deletion_requests')
      .update({
        status: 'confirmed',
        confirmed_at: new Date().toISOString(),
      })
      .eq('id', deletionRequest.id);

    // GDPR-compliant account deletion
    // 1. Anonymize personal data in profiles
    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        first_name: 'Utente',
        last_name: 'Cancellato',
        email: `deleted_${deletionRequest.user_id}@workover.it.com`,
        bio: null,
        avatar_url: null,
        linkedin_url: null,
        website_url: null,
        phone_number: null,
        is_suspended: true,
        data_retention_exempt: false,
      })
      .eq('id', deletionRequest.user_id);

    if (profileError) {
      console.error('Error anonymizing profile:', profileError);
    }

    // 2. Delete sensitive user data (messages, preferences, etc.)
    // Keep bookings and reviews for legal/business reasons (anonymized)
    await supabase
      .from('user_preferences')
      .delete()
      .eq('user_id', deletionRequest.user_id);

    // 3. Delete auth user (this will cascade delete related data)
    const { error: deleteAuthError } = await supabase.auth.admin.deleteUser(
      deletionRequest.user_id
    );

    if (deleteAuthError) {
      console.error('Error deleting auth user:', deleteAuthError);
      return new Response(
        JSON.stringify({ error: 'Errore durante la cancellazione dell\\'account' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Account ${deletionRequest.user_id} deleted successfully`);

    // TODO: Send confirmation email via Resend (Phase 4)

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Account cancellato con successo',
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in process-account-deletion:', error);
    return new Response(
      JSON.stringify({ error: 'Errore interno del server' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

