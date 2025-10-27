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

    const { reason } = await req.json();

    // Generate secure token
    const token = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Check for existing pending requests
    const { data: existingRequest } = await supabase
      .from('account_deletion_requests')
      .select('id')
      .eq('user_id', user.id)
      .eq('status', 'pending')
      .single();

    if (existingRequest) {
      return new Response(
        JSON.stringify({ error: 'Hai già una richiesta di cancellazione in attesa' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create deletion request
    const { data: deletionRequest, error: createError } = await supabase
      .from('account_deletion_requests')
      .insert({
        user_id: user.id,
        token,
        status: 'pending',
        reason,
        expires_at: expiresAt.toISOString(),
      })
      .select()
      .single();

    if (createError) {
      console.error('Error creating deletion request:', createError);
      return new Response(
        JSON.stringify({ error: 'Errore durante la creazione della richiesta' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Account deletion request created for user ${user.id} with token ${token}`);

    // TODO: Send confirmation email via Resend (Phase 4)
    // For now, return the token (in production, this would be sent via email)
    const confirmationUrl = `${Deno.env.get('SUPABASE_URL')?.replace('https://', 'https://app.')}/privacy/confirm-deletion/${token}`;

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Richiesta di cancellazione creata. Controlla la tua email per confermare.',
        token, // Remove this in production when email is implemented
        confirmationUrl, // Remove this in production
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in confirm-account-deletion:', error);
    return new Response(
      JSON.stringify({ error: 'Errore interno del server' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
