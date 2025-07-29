import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Initialize Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function collectUserData(userId: string) {
  console.log('Collecting user data for:', userId);
  
  // Get profile data
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  // Get bookings
  const { data: bookings } = await supabase
    .from('bookings')
    .select(`
      *,
      spaces:space_id(id, title, address, host_id),
      payments(*)
    `)
    .eq('user_id', userId);

  // Get messages
  const { data: messages } = await supabase
    .from('messages')
    .select(`
      *,
      bookings:booking_id(
        id,
        spaces:space_id(title)
      )
    `)
    .eq('sender_id', userId);

  // Get reviews given
  const { data: reviewsGiven } = await supabase
    .from('booking_reviews')
    .select(`
      *,
      bookings:booking_id(
        spaces:space_id(title)
      )
    `)
    .eq('author_id', userId);

  // Get reviews received
  const { data: reviewsReceived } = await supabase
    .from('booking_reviews')
    .select(`
      *,
      bookings:booking_id(
        spaces:space_id(title)
      )
    `)
    .eq('target_id', userId);

  // Get connections
  const { data: connections } = await supabase
    .from('connections')
    .select(`
      *,
      sender:sender_id(first_name, last_name),
      receiver:receiver_id(first_name, last_name)
    `)
    .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`);

  // Get GDPR requests
  const { data: gdprRequests } = await supabase
    .from('gdpr_requests')
    .select('*')
    .eq('user_id', userId);

  // Get user spaces if host
  const { data: spaces } = await supabase
    .from('spaces')
    .select('*')
    .eq('host_id', userId);

  return {
    profile,
    bookings: bookings || [],
    messages: messages || [],
    reviewsGiven: reviewsGiven || [],
    reviewsReceived: reviewsReceived || [],
    connections: connections || [],
    gdprRequests: gdprRequests || [],
    spaces: spaces || []
  };
}

function generatePDF(userData: any): Uint8Array {
  // Simple PDF generation - in production you'd use a proper PDF library
  const content = `
ESPORTAZIONE DATI GDPR
Data: ${new Date().toLocaleDateString('it-IT')}
==============================================

=== DATI PROFILO ===
Nome: ${userData.profile?.first_name || ''} ${userData.profile?.last_name || ''}
Email: ${userData.profile?.id || ''}
Ruolo: ${userData.profile?.role || ''}
Data registrazione: ${userData.profile?.created_at || ''}
Bio: ${userData.profile?.bio || 'N/A'}
Professione: ${userData.profile?.profession || 'N/A'}
Città: ${userData.profile?.city || 'N/A'}
Networking abilitato: ${userData.profile?.networking_enabled ? 'Sì' : 'No'}

=== PRENOTAZIONI (${userData.bookings.length}) ===
${userData.bookings.map((booking: any) => `
- ID: ${booking.id}
- Spazio: ${booking.spaces?.title || 'N/A'}
- Data: ${booking.booking_date}
- Stato: ${booking.status}
- Creata: ${booking.created_at}
- Importo: ${booking.payments?.[0]?.amount || 'N/A'}
`).join('')}

=== MESSAGGI INVIATI (${userData.messages.length}) ===
${userData.messages.map((message: any) => `
- Data: ${message.created_at}
- Contenuto: ${message.content}
- Prenotazione: ${message.bookings?.spaces?.title || 'N/A'}
- Allegati: ${message.attachments ? JSON.stringify(message.attachments) : 'Nessuno'}
`).join('')}

=== RECENSIONI DATE (${userData.reviewsGiven.length}) ===
${userData.reviewsGiven.map((review: any) => `
- Data: ${review.created_at}
- Valutazione: ${review.rating}/5
- Contenuto: ${review.content || 'N/A'}
- Spazio: ${review.bookings?.spaces?.title || 'N/A'}
`).join('')}

=== RECENSIONI RICEVUTE (${userData.reviewsReceived.length}) ===
${userData.reviewsReceived.map((review: any) => `
- Data: ${review.created_at}
- Valutazione: ${review.rating}/5
- Contenuto: ${review.content || 'N/A'}
- Spazio: ${review.bookings?.spaces?.title || 'N/A'}
`).join('')}

=== CONNESSIONI (${userData.connections.length}) ===
${userData.connections.map((conn: any) => `
- Data: ${conn.created_at}
- Stato: ${conn.status}
- Tipo: ${conn.sender_id === userData.profile?.id ? 'Inviata' : 'Ricevuta'}
- Partner: ${conn.sender_id === userData.profile?.id ? 
  `${conn.receiver?.first_name} ${conn.receiver?.last_name}` : 
  `${conn.sender?.first_name} ${conn.sender?.last_name}`}
`).join('')}

=== SPAZI OSPITATI (${userData.spaces.length}) ===
${userData.spaces.map((space: any) => `
- Nome: ${space.title}
- Indirizzo: ${space.address}
- Pubblicato: ${space.published ? 'Sì' : 'No'}
- Prezzo: €${space.price_per_day}/giorno
- Creato: ${space.created_at}
- Capacità: ${space.capacity} persone
`).join('')}

=== RICHIESTE GDPR (${userData.gdprRequests.length}) ===
${userData.gdprRequests.map((req: any) => `
- Tipo: ${req.request_type}
- Data: ${req.requested_at}
- Stato: ${req.status}
- Note: ${req.notes || 'N/A'}
`).join('')}

==============================================
Questo documento contiene tutti i dati personali 
associati al tuo account su CoWorkingConnect.

Per ulteriori informazioni sulla protezione dei dati:
- Email: privacy@coworkingconnect.it
- Sito web: https://coworkingconnect.it/privacy

Data esportazione: ${new Date().toISOString()}
==============================================
`;

  return new TextEncoder().encode(content);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response('Unauthorized', { status: 401 });
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      return new Response('Unauthorized', { status: 401 });
    }

    const userId = user.id;

    // Check for existing active request
    const { data: existingRequest } = await supabase
      .from('gdpr_requests')
      .select('*')
      .eq('user_id', userId)
      .eq('request_type', 'data_export')
      .eq('processing_status', 'processing')
      .gte('expires_at', new Date().toISOString())
      .maybeSingle();

    if (existingRequest) {
      return new Response(JSON.stringify({ 
        error: 'Una richiesta di esportazione è già in corso' 
      }), { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Cancel previous requests
    await supabase
      .from('gdpr_requests')
      .update({ processing_status: 'cancelled' })
      .eq('user_id', userId)
      .eq('request_type', 'data_export')
      .neq('processing_status', 'completed');

    // Create new request
    const downloadToken = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    const { data: newRequest } = await supabase
      .from('gdpr_requests')
      .insert({
        user_id: userId,
        request_type: 'data_export',
        processing_status: 'processing',
        download_token: downloadToken,
        expires_at: expiresAt.toISOString(),
        notes: 'Esportazione dati istantanea'
      })
      .select()
      .single();

    console.log('Starting data collection...');
    
    // Collect user data
    const userData = await collectUserData(userId);
    console.log('Data collected, generating PDF...');

    // Generate PDF
    const pdfData = generatePDF(userData);
    console.log('PDF generated, size:', pdfData.length);

    // For now, we'll just upload the PDF. In production, you'd create a proper ZIP
    const fileName = `${userId}/${downloadToken}/gdpr_export.pdf`;
    
    const { error: uploadError } = await supabase.storage
      .from('gdpr-exports')
      .upload(fileName, pdfData, {
        contentType: 'application/pdf',
        upsert: true
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      throw uploadError;
    }

    // Get signed URL
    const { data: signedUrlData } = await supabase.storage
      .from('gdpr-exports')
      .createSignedUrl(fileName, 24 * 60 * 60); // 24 hours

    if (!signedUrlData?.signedUrl) {
      throw new Error('Failed to generate download URL');
    }

    // Update request with completion
    await supabase
      .from('gdpr_requests')
      .update({
        processing_status: 'completed',
        status: 'completed',
        export_file_url: signedUrlData.signedUrl,
        file_size: pdfData.length,
        completed_at: new Date().toISOString()
      })
      .eq('id', newRequest.id);

    console.log('Export completed successfully');

    return new Response(JSON.stringify({
      success: true,
      downloadUrl: signedUrlData.signedUrl,
      fileSize: pdfData.length,
      expiresAt: expiresAt.toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in generate-gdpr-export:', error);
    return new Response(JSON.stringify({ 
      error: 'Errore durante l\'esportazione dati',
      details: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});