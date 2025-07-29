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

interface ProgressUpdate {
  phase: number;
  message: string;
  completed: boolean;
}

const PHASES = [
  { phase: 1, message: "Raccolta dati profilo..." },
  { phase: 2, message: "Raccolta prenotazioni e messaggi..." },
  { phase: 3, message: "Raccolta file allegati..." },
  { phase: 4, message: "Generazione PDF..." },
  { phase: 5, message: "Creazione archivio ZIP..." },
  { phase: 6, message: "Finalizzazione download..." }
];

async function sendProgress(writableStream: WritableStreamDefaultWriter, update: ProgressUpdate) {
  const data = `data: ${JSON.stringify(update)}\n\n`;
  await writableStream.write(new TextEncoder().encode(data));
}

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

async function collectAttachments(userData: any) {
  const attachments: Array<{ name: string; url: string; data?: Uint8Array }> = [];
  
  // Collect message attachments
  for (const message of userData.messages) {
    if (message.attachments && Array.isArray(message.attachments)) {
      for (const attachment of message.attachments) {
        if (attachment.url) {
          try {
            const response = await fetch(attachment.url);
            if (response.ok) {
              const data = new Uint8Array(await response.arrayBuffer());
              attachments.push({
                name: attachment.name || 'attachment',
                url: attachment.url,
                data
              });
            }
          } catch (error) {
            console.error('Failed to fetch attachment:', error);
          }
        }
      }
    }
  }

  // Collect profile photo
  if (userData.profile?.profile_photo_url) {
    try {
      const response = await fetch(userData.profile.profile_photo_url);
      if (response.ok) {
        const data = new Uint8Array(await response.arrayBuffer());
        attachments.push({
          name: 'profile_photo.jpg',
          url: userData.profile.profile_photo_url,
          data
        });
      }
    } catch (error) {
      console.error('Failed to fetch profile photo:', error);
    }
  }

  return attachments;
}

function generatePDF(userData: any): Uint8Array {
  // Simple PDF generation - in production you'd use a proper PDF library
  const content = `
ESPORTAZIONE DATI GDPR
Data: ${new Date().toLocaleDateString('it-IT')}

=== DATI PROFILO ===
Nome: ${userData.profile?.first_name || ''} ${userData.profile?.last_name || ''}
Email: ${userData.profile?.id || ''}
Ruolo: ${userData.profile?.role || ''}
Data registrazione: ${userData.profile?.created_at || ''}
Bio: ${userData.profile?.bio || 'N/A'}
Professione: ${userData.profile?.profession || 'N/A'}
Città: ${userData.profile?.city || 'N/A'}

=== PRENOTAZIONI (${userData.bookings.length}) ===
${userData.bookings.map((booking: any) => `
- ID: ${booking.id}
- Spazio: ${booking.spaces?.title || 'N/A'}
- Data: ${booking.booking_date}
- Stato: ${booking.status}
- Creata: ${booking.created_at}
`).join('')}

=== MESSAGGI INVIATI (${userData.messages.length}) ===
${userData.messages.map((message: any) => `
- Data: ${message.created_at}
- Contenuto: ${message.content}
- Prenotazione: ${message.bookings?.spaces?.title || 'N/A'}
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
`).join('')}

=== SPAZI OSPITATI (${userData.spaces.length}) ===
${userData.spaces.map((space: any) => `
- Nome: ${space.title}
- Indirizzo: ${space.address}
- Pubblicato: ${space.published ? 'Sì' : 'No'}
- Creato: ${space.created_at}
`).join('')}

=== RICHIESTE GDPR (${userData.gdprRequests.length}) ===
${userData.gdprRequests.map((req: any) => `
- Tipo: ${req.request_type}
- Data: ${req.requested_at}
- Stato: ${req.status}
`).join('')}

Questo documento contiene tutti i dati personali associati al tuo account.
Per ulteriori informazioni, contatta privacy@coworkingconnect.it
`;

  return new TextEncoder().encode(content);
}

async function createZipArchive(pdfData: Uint8Array, attachments: Array<{ name: string; data?: Uint8Array }>) {
  // Simple ZIP creation - in production you'd use a proper ZIP library
  // For now, we'll create a simple archive structure
  const files: Array<{ name: string; data: Uint8Array }> = [
    { name: 'dati_utente.pdf', data: pdfData }
  ];

  // Add attachments
  for (const attachment of attachments) {
    if (attachment.data) {
      files.push({
        name: `allegati/${attachment.name}`,
        data: attachment.data
      });
    }
  }

  // Simple concatenation for demo - use proper ZIP library in production
  let totalSize = 0;
  for (const file of files) {
    totalSize += file.data.length;
  }

  const archive = new Uint8Array(totalSize);
  let offset = 0;
  
  for (const file of files) {
    archive.set(file.data, offset);
    offset += file.data.length;
  }

  return archive;
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

    // Set up Server-Sent Events
    const stream = new ReadableStream({
      start(controller) {
        const encoder = new TextEncoder();
        const writer = controller;

        (async () => {
          try {
            // Phase 1: Collect profile data
            await writer.enqueue(encoder.encode(`data: ${JSON.stringify({
              phase: 1,
              message: PHASES[0].message,
              completed: false
            })}\n\n`));

            const userData = await collectUserData(userId);

            // Phase 2: Collect bookings and messages
            await writer.enqueue(encoder.encode(`data: ${JSON.stringify({
              phase: 2,
              message: PHASES[1].message,
              completed: false
            })}\n\n`));

            // Phase 3: Collect attachments
            await writer.enqueue(encoder.encode(`data: ${JSON.stringify({
              phase: 3,
              message: PHASES[2].message,
              completed: false
            })}\n\n`));

            const attachments = await collectAttachments(userData);

            // Phase 4: Generate PDF
            await writer.enqueue(encoder.encode(`data: ${JSON.stringify({
              phase: 4,
              message: PHASES[3].message,
              completed: false
            })}\n\n`));

            const pdfData = generatePDF(userData);

            // Phase 5: Create ZIP
            await writer.enqueue(encoder.encode(`data: ${JSON.stringify({
              phase: 5,
              message: PHASES[4].message,
              completed: false
            })}\n\n`));

            const zipData = await createZipArchive(pdfData, attachments);

            // Phase 6: Upload to storage
            await writer.enqueue(encoder.encode(`data: ${JSON.stringify({
              phase: 6,
              message: PHASES[5].message,
              completed: false
            })}\n\n`));

            const fileName = `${userId}/${downloadToken}/gdpr_export.zip`;
            
            const { error: uploadError } = await supabase.storage
              .from('gdpr-exports')
              .upload(fileName, zipData, {
                contentType: 'application/zip',
                upsert: true
              });

            if (uploadError) {
              throw uploadError;
            }

            // Get signed URL
            const { data: signedUrlData } = await supabase.storage
              .from('gdpr-exports')
              .createSignedUrl(fileName, 24 * 60 * 60); // 24 hours

            // Update request with completion
            await supabase
              .from('gdpr_requests')
              .update({
                processing_status: 'completed',
                status: 'completed',
                export_file_url: signedUrlData?.signedUrl,
                file_size: zipData.length,
                completed_at: new Date().toISOString()
              })
              .eq('id', newRequest.id);

            // Send completion
            await writer.enqueue(encoder.encode(`data: ${JSON.stringify({
              phase: 6,
              message: 'Download pronto!',
              completed: true,
              downloadUrl: signedUrlData?.signedUrl,
              fileSize: zipData.length
            })}\n\n`));

            controller.close();
          } catch (error) {
            console.error('Export error:', error);
            
            // Update request with error
            await supabase
              .from('gdpr_requests')
              .update({
                processing_status: 'failed',
                status: 'rejected',
                notes: `Errore durante l'esportazione: ${error.message}`
              })
              .eq('id', newRequest.id);

            await writer.enqueue(encoder.encode(`data: ${JSON.stringify({
              error: 'Errore durante l\'esportazione dati',
              details: error.message
            })}\n\n`));

            controller.close();
          }
        })();
      }
    });

    return new Response(stream, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error) {
    console.error('Error in generate-gdpr-export:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});