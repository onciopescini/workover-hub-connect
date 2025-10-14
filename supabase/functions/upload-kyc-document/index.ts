import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    { auth: { persistSession: false } }
  );

  try {
    console.log('[KYC-UPLOAD] Starting KYC document upload');

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('No authorization header');

    const token = authHeader.replace('Bearer ', '');
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw userError;
    
    const user = userData.user;
    if (!user) throw new Error('User not authenticated');

    console.log('[KYC-UPLOAD] User authenticated:', user.id);

    const formData = await req.formData();
    const file = formData.get('file') as File;
    const documentType = formData.get('documentType') as string;
    const expiresAt = formData.get('expiresAt') as string | null;

    if (!file) throw new Error('No file provided');
    if (!documentType) throw new Error('Document type not specified');

    // Validate file type
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
    if (!allowedTypes.includes(file.type)) {
      throw new Error('Invalid file type. Only PDF, JPEG, and PNG are allowed');
    }

    // Validate file size (10MB max)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      throw new Error('File size exceeds 10MB limit');
    }

    console.log('[KYC-UPLOAD] File validated:', {
      name: file.name,
      type: file.type,
      size: file.size,
      documentType
    });

    // Generate file path: {user_id}/{document_type}_{timestamp}.{ext}
    const timestamp = Date.now();
    const ext = file.name.split('.').pop();
    const filePath = `${user.id}/${documentType}_${timestamp}.${ext}`;

    console.log('[KYC-UPLOAD] Uploading to storage:', filePath);

    // Upload to Supabase Storage
    const fileBuffer = await file.arrayBuffer();
    const { data: uploadData, error: uploadError } = await supabaseClient.storage
      .from('kyc-documents')
      .upload(filePath, fileBuffer, {
        contentType: file.type,
        upsert: false
      });

    if (uploadError) {
      console.error('[KYC-UPLOAD] Upload error:', uploadError);
      throw uploadError;
    }

    console.log('[KYC-UPLOAD] File uploaded successfully');

    // Get public URL (even though bucket is private, we store the path)
    const { data: { publicUrl } } = supabaseClient.storage
      .from('kyc-documents')
      .getPublicUrl(filePath);

    // Insert KYC document record
    const { data: docData, error: docError } = await supabaseClient
      .from('kyc_documents')
      .insert({
        user_id: user.id,
        document_type: documentType,
        file_url: publicUrl,
        file_name: file.name,
        file_size: file.size,
        verification_status: 'pending',
        expires_at: expiresAt || null,
        metadata: {
          original_filename: file.name,
          mime_type: file.type,
          uploaded_at: new Date().toISOString()
        }
      })
      .select()
      .single();

    if (docError) {
      console.error('[KYC-UPLOAD] Database error:', docError);
      // Cleanup uploaded file
      await supabaseClient.storage.from('kyc-documents').remove([filePath]);
      throw docError;
    }

    console.log('[KYC-UPLOAD] Document record created:', docData.id);

    // Notify admins of new KYC document
    const { data: admins } = await supabaseClient
      .from('profiles')
      .select('id')
      .eq('role', 'admin');

    if (admins && admins.length > 0) {
      const notifications = admins.map(admin => ({
        user_id: admin.id,
        type: 'kyc_verification',
        title: '📄 Nuovo Documento KYC',
        content: `Un nuovo documento ${documentType} è stato caricato e richiede verifica.`,
        metadata: {
          document_id: docData.id,
          user_id: user.id,
          document_type: documentType
        }
      }));

      await supabaseClient.from('user_notifications').insert(notifications);
      console.log('[KYC-UPLOAD] Admin notifications sent');
    }

    return new Response(JSON.stringify({
      success: true,
      document: docData
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    });

  } catch (error: any) {
    console.error('[KYC-UPLOAD] Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    });
  }
});
