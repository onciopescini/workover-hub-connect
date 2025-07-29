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
  
  try {
    // Get profile data
    console.log('Fetching profile data...');
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (profileError) {
      console.error('Error fetching profile:', profileError);
      // Don't fail completely, just log and continue
    }

    // Get bookings
    console.log('Fetching bookings...');
    const { data: bookings, error: bookingsError } = await supabase
      .from('bookings')
      .select(`
        *,
        spaces:space_id(id, title, address, host_id),
        payments(*)
      `)
      .eq('user_id', userId);

    if (bookingsError) {
      console.error('Error fetching bookings:', bookingsError);
    }

    // Get messages
    console.log('Fetching messages...');
    const { data: messages, error: messagesError } = await supabase
      .from('messages')
      .select(`
        *,
        bookings:booking_id(
          id,
          spaces:space_id(title)
        )
      `)
      .eq('sender_id', userId);

    if (messagesError) {
      console.error('Error fetching messages:', messagesError);
    }

    // Get reviews given
    console.log('Fetching reviews given...');
    const { data: reviewsGiven, error: reviewsGivenError } = await supabase
      .from('booking_reviews')
      .select(`
        *,
        bookings:booking_id(
          spaces:space_id(title)
        )
      `)
      .eq('author_id', userId);

    if (reviewsGivenError) {
      console.error('Error fetching reviews given:', reviewsGivenError);
    }

    // Get reviews received
    console.log('Fetching reviews received...');
    const { data: reviewsReceived, error: reviewsReceivedError } = await supabase
      .from('booking_reviews')
      .select(`
        *,
        bookings:booking_id(
          spaces:space_id(title)
        )
      `)
      .eq('target_id', userId);

    if (reviewsReceivedError) {
      console.error('Error fetching reviews received:', reviewsReceivedError);
    }

    // Get connections
    console.log('Fetching connections...');
    const { data: connections, error: connectionsError } = await supabase
      .from('connections')
      .select(`
        *,
        sender:sender_id(first_name, last_name),
        receiver:receiver_id(first_name, last_name)
      `)
      .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`);

    if (connectionsError) {
      console.error('Error fetching connections:', connectionsError);
    }

    // Get GDPR requests
    console.log('Fetching GDPR requests...');
    const { data: gdprRequests, error: gdprError } = await supabase
      .from('gdpr_requests')
      .select('*')
      .eq('user_id', userId);

    if (gdprError) {
      console.error('Error fetching GDPR requests:', gdprError);
    }

    // Get user spaces if host
    console.log('Fetching spaces...');
    const { data: spaces, error: spacesError } = await supabase
      .from('spaces')
      .select('*')
      .eq('host_id', userId);

    if (spacesError) {
      console.error('Error fetching spaces:', spacesError);
    }

    console.log('Data collection completed. Counts:', {
      profile: profile ? 1 : 0,
      bookings: bookings?.length || 0,
      messages: messages?.length || 0,
      reviewsGiven: reviewsGiven?.length || 0,
      reviewsReceived: reviewsReceived?.length || 0,
      connections: connections?.length || 0,
      gdprRequests: gdprRequests?.length || 0,
      spaces: spaces?.length || 0
    });

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
  } catch (error) {
    console.error('Error in collectUserData:', error);
    throw error;
  }
}

function generateTextExport(userData: any): Uint8Array {
  const content = `ESPORTAZIONE DATI GDPR
Data: ${new Date().toLocaleDateString('it-IT')}
ID Utente: ${userData.profile?.id || 'Sconosciuto'}
==============================================

=== DATI PROFILO ===
Nome: ${userData.profile?.first_name || ''} ${userData.profile?.last_name || ''}
Ruolo: ${userData.profile?.role || ''}
Data registrazione: ${userData.profile?.created_at || ''}
Ultimo accesso: ${userData.profile?.last_login_at || 'Mai'}
Bio: ${userData.profile?.bio || 'N/A'}
Professione: ${userData.profile?.profession || 'N/A'}
Città: ${userData.profile?.city || 'N/A'}
Telefono: ${userData.profile?.phone || 'N/A'}
Sito web: ${userData.profile?.website || 'N/A'}
Networking abilitato: ${userData.profile?.networking_enabled ? 'Sì' : 'No'}
Account età confermata: ${userData.profile?.age_confirmed ? 'Sì' : 'No'}
Onboarding completato: ${userData.profile?.onboarding_completed ? 'Sì' : 'No'}

=== PRENOTAZIONI (${userData.bookings?.length || 0}) ===
${userData.bookings?.map((booking: any, index: number) => `
${index + 1}. ID: ${booking.id}
   Spazio: ${booking.spaces?.title || 'N/A'}
   Data: ${booking.booking_date}
   Orario: ${booking.start_time || 'N/A'} - ${booking.end_time || 'N/A'}
   Stato: ${booking.status}
   Creata: ${booking.created_at}
   ${booking.cancelled_at ? `Cancellata: ${booking.cancelled_at}` : ''}
   ${booking.cancellation_reason ? `Motivo: ${booking.cancellation_reason}` : ''}
   Importo: ${booking.payments?.[0]?.amount ? '€' + booking.payments[0].amount : 'N/A'}
`).join('') || 'Nessuna prenotazione trovata.'}

=== MESSAGGI INVIATI (${userData.messages?.length || 0}) ===
${userData.messages?.map((message: any, index: number) => `
${index + 1}. Data: ${message.created_at}
   Contenuto: ${message.content?.substring(0, 200)}${message.content?.length > 200 ? '...' : ''}
   Prenotazione: ${message.bookings?.spaces?.title || 'N/A'}
   Letto: ${message.is_read ? 'Sì' : 'No'}
   Allegati: ${message.attachments?.length || 0} file
`).join('') || 'Nessun messaggio trovato.'}

=== RECENSIONI DATE (${userData.reviewsGiven?.length || 0}) ===
${userData.reviewsGiven?.map((review: any, index: number) => `
${index + 1}. Data: ${review.created_at}
   Valutazione: ${review.rating}/5
   Contenuto: ${review.content?.substring(0, 300) || 'N/A'}${review.content?.length > 300 ? '...' : ''}
   Spazio: ${review.bookings?.spaces?.title || 'N/A'}
   Visibile: ${review.is_visible ? 'Sì' : 'No'}
`).join('') || 'Nessuna recensione data.'}

=== RECENSIONI RICEVUTE (${userData.reviewsReceived?.length || 0}) ===
${userData.reviewsReceived?.map((review: any, index: number) => `
${index + 1}. Data: ${review.created_at}
   Valutazione: ${review.rating}/5
   Contenuto: ${review.content?.substring(0, 300) || 'N/A'}${review.content?.length > 300 ? '...' : ''}
   Spazio: ${review.bookings?.spaces?.title || 'N/A'}
   Visibile: ${review.is_visible ? 'Sì' : 'No'}
`).join('') || 'Nessuna recensione ricevuta.'}

=== CONNESSIONI (${userData.connections?.length || 0}) ===
${userData.connections?.map((conn: any, index: number) => `
${index + 1}. Data: ${conn.created_at}
   Stato: ${conn.status}
   Scade: ${conn.expires_at || 'Mai'}
   Tipo: ${conn.sender_id === userData.profile?.id ? 'Inviata' : 'Ricevuta'}
   Partner: ${conn.sender_id === userData.profile?.id ? 
     `${conn.receiver?.first_name || ''} ${conn.receiver?.last_name || ''}` : 
     `${conn.sender?.first_name || ''} ${conn.sender?.last_name || ''}`}
`).join('') || 'Nessuna connessione trovata.'}

=== SPAZI OSPITATI (${userData.spaces?.length || 0}) ===
${userData.spaces?.map((space: any, index: number) => `
${index + 1}. Nome: ${space.title}
   Descrizione: ${space.description?.substring(0, 200)}${space.description?.length > 200 ? '...' : ''}
   Indirizzo: ${space.address}
   Pubblicato: ${space.published ? 'Sì' : 'No'}
   Prezzo: €${space.price_per_day}/giorno
   Creato: ${space.created_at}
   Capacità: ${space.capacity} persone
   Servizi: ${space.amenities?.join(', ') || 'Nessuno'}
   ${space.is_suspended ? 'SOSPESO' : ''}
`).join('') || 'Nessuno spazio ospitato.'}

=== RICHIESTE GDPR (${userData.gdprRequests?.length || 0}) ===
${userData.gdprRequests?.map((req: any, index: number) => `
${index + 1}. Tipo: ${req.request_type}
   Data richiesta: ${req.requested_at}
   Stato: ${req.status}
   Stato elaborazione: ${req.processing_status || 'N/A'}
   ${req.completed_at ? `Completata: ${req.completed_at}` : ''}
   Note: ${req.notes || 'N/A'}
`).join('') || 'Nessuna richiesta GDPR precedente.'}

==============================================
RIEPILOGO DATI:
- Profilo: ${userData.profile ? '1 record' : '0 record'}
- Prenotazioni: ${userData.bookings?.length || 0} record
- Messaggi: ${userData.messages?.length || 0} record  
- Recensioni date: ${userData.reviewsGiven?.length || 0} record
- Recensioni ricevute: ${userData.reviewsReceived?.length || 0} record
- Connessioni: ${userData.connections?.length || 0} record
- Spazi ospitati: ${userData.spaces?.length || 0} record
- Richieste GDPR: ${userData.gdprRequests?.length || 0} record

Questo documento contiene tutti i dati personali 
associati al tuo account su CoWorkingConnect.

Per ulteriori informazioni sulla protezione dei dati:
- Email: privacy@coworkingconnect.it
- Sito web: https://coworkingconnect.it/privacy

Data esportazione: ${new Date().toISOString()}
Dimensione file: ${new Blob([content]).size} bytes
==============================================
`;

  return new TextEncoder().encode(content);
}

serve(async (req) => {
  console.log('=== GDPR Export Function Called ===');
  console.log('Method:', req.method);
  console.log('URL:', req.url);
  
  if (req.method === 'OPTIONS') {
    console.log('Handling CORS preflight request');
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Processing GDPR export request...');
    
    const authHeader = req.headers.get('authorization');
    console.log('Auth header present:', !!authHeader);
    
    if (!authHeader) {
      console.error('No authorization header found');
      return new Response(JSON.stringify({ 
        error: 'Unauthorized - No auth header' 
      }), { 
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('Validating user token...');
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError) {
      console.error('Auth error:', authError);
      return new Response(JSON.stringify({ 
        error: 'Authentication failed',
        details: authError.message 
      }), { 
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (!user) {
      console.error('No user found from token');
      return new Response(JSON.stringify({ 
        error: 'No user found' 
      }), { 
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('User authenticated:', user.id);
    const userId = user.id;

    // Check for existing active request
    console.log('Checking for existing requests...');
    const { data: existingRequest, error: checkError } = await supabase
      .from('gdpr_requests')
      .select('*')
      .eq('user_id', userId)
      .eq('request_type', 'data_export')
      .eq('processing_status', 'processing')
      .gte('expires_at', new Date().toISOString())
      .maybeSingle();

    if (checkError) {
      console.error('Error checking existing requests:', checkError);
      return new Response(JSON.stringify({ 
        error: 'Errore nel controllo richieste esistenti',
        details: checkError.message 
      }), { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (existingRequest) {
      console.log('Found existing request:', existingRequest.id);
      return new Response(JSON.stringify({ 
        error: 'Una richiesta di esportazione è già in corso' 
      }), { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Cancel previous requests
    console.log('Cancelling previous requests...');
    const { error: cancelError } = await supabase
      .from('gdpr_requests')
      .update({ processing_status: 'cancelled' })
      .eq('user_id', userId)
      .eq('request_type', 'data_export')
      .neq('processing_status', 'completed');

    if (cancelError) {
      console.error('Error cancelling previous requests:', cancelError);
      // Continue anyway, not critical
    }

    // Create new request
    console.log('Creating new GDPR request...');
    const downloadToken = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    const { data: newRequest, error: insertError } = await supabase
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

    if (insertError || !newRequest) {
      console.error('Error creating GDPR request:', insertError);
      return new Response(JSON.stringify({ 
        error: 'Errore nella creazione della richiesta',
        details: insertError?.message || 'Nessun dato restituito'
      }), { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('GDPR request created:', newRequest.id);

    console.log('Starting data collection...');
    
    // Collect user data
    const userData = await collectUserData(userId);
    console.log('Data collected, generating text export...');

    // Generate text export
    const textData = generateTextExport(userData);
    console.log('Text export generated, size:', textData.length);

    // Upload as text file
    const fileName = `${userId}/${downloadToken}/gdpr_export.txt`;
    
    const { error: uploadError } = await supabase.storage
      .from('gdpr-exports')
      .upload(fileName, textData, {
        contentType: 'text/plain; charset=utf-8',
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
        file_size: textData.length,
        completed_at: new Date().toISOString()
      })
      .eq('id', newRequest.id);

    console.log('Export completed successfully');

    return new Response(JSON.stringify({
      success: true,
      downloadUrl: signedUrlData.signedUrl,
      fileSize: textData.length,
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