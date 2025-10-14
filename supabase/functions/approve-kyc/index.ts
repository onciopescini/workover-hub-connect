import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    );

    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data } = await supabaseClient.auth.getUser(token);
    const adminUser = data.user;

    if (!adminUser) {
      throw new Error('User not authenticated');
    }

    console.log('[approve-kyc] Processing request from admin:', adminUser.id);

    // Verify admin role
    const { data: adminProfile, error: adminError } = await supabaseClient
      .from('profiles')
      .select('role')
      .eq('id', adminUser.id)
      .single();

    if (adminError || adminProfile?.role !== 'admin') {
      console.error('[approve-kyc] Unauthorized access attempt:', adminUser.id);
      throw new Error('Unauthorized: Admin access required');
    }

    const { host_id, approved, rejection_reason } = await req.json();

    if (!host_id) {
      throw new Error('host_id is required');
    }

    console.log('[approve-kyc] Processing KYC for host:', host_id, 'approved:', approved);

    // Fetch host profile
    const { data: hostProfile, error: hostError } = await supabaseClient
      .from('profiles')
      .select('*')
      .eq('id', host_id)
      .single();

    if (hostError || !hostProfile) {
      console.error('[approve-kyc] Host not found:', hostError);
      throw new Error('Host not found');
    }

    // Update KYC status
    const updateData: any = {
      kyc_verified: approved,
      updated_at: new Date().toISOString(),
    };

    if (!approved && rejection_reason) {
      updateData.kyc_rejection_reason = rejection_reason;
    } else if (approved) {
      updateData.kyc_rejection_reason = null;
    }

    const { error: updateError } = await supabaseClient
      .from('profiles')
      .update(updateData)
      .eq('id', host_id);

    if (updateError) {
      console.error('[approve-kyc] Error updating profile:', updateError);
      throw updateError;
    }

    console.log('[approve-kyc] KYC status updated successfully');

    // Log admin action
    await supabaseClient
      .from('admin_actions_log')
      .insert({
        admin_id: adminUser.id,
        action_type: approved ? 'kyc_approved' : 'kyc_rejected',
        target_type: 'user',
        target_id: host_id,
        description: `KYC ${approved ? 'approved' : 'rejected'} for host ${hostProfile.first_name} ${hostProfile.last_name}`,
        metadata: {
          host_email: hostProfile.email,
          rejection_reason: rejection_reason || null,
        },
      });

    // Send notification to host
    const notificationContent = approved
      ? 'I tuoi dati fiscali sono stati verificati e approvati. Ora puoi pubblicare i tuoi spazi.'
      : `I tuoi dati fiscali necessitano di correzioni: ${rejection_reason || 'Dettagli non specificati'}. Aggiorna i dati e richiedi nuovamente la verifica.`;

    await supabaseClient
      .from('user_notifications')
      .insert({
        user_id: host_id,
        type: 'system',
        title: approved ? 'Verifica KYC Approvata' : 'Verifica KYC Rifiutata',
        content: notificationContent,
        metadata: {
          kyc_status: approved ? 'approved' : 'rejected',
          rejection_reason: rejection_reason || null,
        },
      });

    console.log('[approve-kyc] Notification sent to host');

    return new Response(
      JSON.stringify({
        success: true,
        message: `KYC ${approved ? 'approved' : 'rejected'} successfully`,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error('[approve-kyc] Error:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
