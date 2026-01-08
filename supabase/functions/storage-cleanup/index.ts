import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CleanupResult {
  bucket: string;
  filesDeleted: number;
  errors: string[];
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('[STORAGE-CLEANUP] Starting storage cleanup job');

    const results: CleanupResult[] = [];

    // 1. Cleanup orphaned KYC documents (rejected/expired older than 90 days)
    const kycResult = await cleanupKYCDocuments(supabase);
    results.push(kycResult);

    // 2. Cleanup photos from deleted spaces
    const spacesResult = await cleanupDeletedSpacePhotos(supabase);
    results.push(spacesResult);

    // 3. Cleanup expired GDPR exports (already handled by cleanup_expired_gdpr_exports function)
    const { error: gdprError } = await supabase.rpc('cleanup_expired_gdpr_exports');
    if (gdprError) {
      console.error('[STORAGE-CLEANUP] GDPR cleanup error:', gdprError);
      results.push({ bucket: 'gdpr-exports', filesDeleted: 0, errors: [gdprError.message] });
    } else {
      results.push({ bucket: 'gdpr-exports', filesDeleted: 0, errors: [] });
    }

    // 4. Cleanup orphaned files (files in storage but no DB reference)
    const orphanedResult = await cleanupOrphanedFiles(supabase);
    results.push(orphanedResult);

    // Log cleanup summary
    const totalDeleted = results.reduce((sum, r) => sum + r.filesDeleted, 0);
    const totalErrors = results.reduce((sum, r) => sum + r.errors.length, 0);

    console.log('[STORAGE-CLEANUP] Cleanup completed:', {
      totalDeleted,
      totalErrors,
      buckets: results.map(r => ({ bucket: r.bucket, deleted: r.filesDeleted })),
    });

    return new Response(
      JSON.stringify({
        success: true,
        totalDeleted,
        totalErrors,
        details: results,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error));
    console.error('[STORAGE-CLEANUP] Fatal error:', err);
    return new Response(
      JSON.stringify({
        success: false,
        error: err.message,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});

async function cleanupKYCDocuments(supabase: any): Promise<CleanupResult> {
  const result: CleanupResult = { bucket: 'kyc-documents', filesDeleted: 0, errors: [] };

  try {
    // Find rejected/expired KYC documents older than 90 days
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const { data: oldDocs, error: queryError } = await supabase
      .from('kyc_documents')
      .select('id, storage_path')
      .or(`verification_status.eq.rejected,expires_at.lt.${ninetyDaysAgo.toISOString()}`)
      .lt('created_at', ninetyDaysAgo.toISOString());

    if (queryError) {
      result.errors.push(`Query error: ${queryError.message}`);
      return result;
    }

    if (!oldDocs || oldDocs.length === 0) {
      console.log('[STORAGE-CLEANUP] No old KYC documents to clean');
      return result;
    }

    console.log(`[STORAGE-CLEANUP] Found ${oldDocs.length} KYC documents to delete`);

    // Delete files from storage
    for (const doc of oldDocs) {
      if (doc.storage_path) {
        const { error: deleteError } = await supabase.storage
          .from('kyc-documents')
          .remove([doc.storage_path]);

        if (deleteError) {
          result.errors.push(`Failed to delete ${doc.storage_path}: ${deleteError.message}`);
        } else {
          result.filesDeleted++;
          
          // Update DB record to mark as cleaned
          await supabase
            .from('kyc_documents')
            .update({ storage_path: null, updated_at: new Date().toISOString() })
            .eq('id', doc.id);
        }
      }
    }
  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error));
    result.errors.push(`Cleanup error: ${err.message}`);
  }

  return result;
}

async function cleanupDeletedSpacePhotos(supabase: any): Promise<CleanupResult> {
  const result: CleanupResult = { bucket: 'space_photos', filesDeleted: 0, errors: [] };

  try {
    // Find spaces deleted more than 30 days ago (soft delete or hard delete)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Check for spaces marked as deleted (via is_suspended or deleted_at field if exists)
    const { data: deletedSpaces, error: queryError } = await supabase
      .from('spaces')
      .select('id, photos')
      .eq('is_suspended', true)
      .lt('suspended_at', thirtyDaysAgo.toISOString())
      .not('photos', 'is', null);

    if (queryError) {
      result.errors.push(`Query error: ${queryError.message}`);
      return result;
    }

    if (!deletedSpaces || deletedSpaces.length === 0) {
      console.log('[STORAGE-CLEANUP] No deleted space photos to clean');
      return result;
    }

    console.log(`[STORAGE-CLEANUP] Found ${deletedSpaces.length} deleted spaces with photos`);

    // Delete photos from storage
    for (const space of deletedSpaces) {
      if (space.photos && Array.isArray(space.photos)) {
        for (const photoUrl of space.photos) {
          // Extract path from URL
          const path = photoUrl.split('/storage/v1/object/public/space_photos/')[1];
          
          if (path) {
            const { error: deleteError } = await supabase.storage
              .from('space_photos')
              .remove([path]);

            if (deleteError) {
              result.errors.push(`Failed to delete ${path}: ${deleteError.message}`);
            } else {
              result.filesDeleted++;
            }
          }
        }

        // Clear photos array in DB
        await supabase
          .from('spaces')
          .update({ photos: [], updated_at: new Date().toISOString() })
          .eq('id', space.id);
      }
    }
  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error));
    result.errors.push(`Cleanup error: ${err.message}`);
  }

  return result;
}

async function cleanupOrphanedFiles(supabase: any): Promise<CleanupResult> {
  const result: CleanupResult = { bucket: 'orphaned-files', filesDeleted: 0, errors: [] };

  try {
    // Check kyc-documents bucket for orphaned files
    const { data: kycFiles, error: listError } = await supabase.storage
      .from('kyc-documents')
      .list('', { limit: 1000 });

    if (listError) {
      result.errors.push(`List error: ${listError.message}`);
      return result;
    }

    if (kycFiles && kycFiles.length > 0) {
      for (const file of kycFiles) {
        // Check if file exists in kyc_documents table
        const { data: docExists, error: checkError } = await supabase
          .from('kyc_documents')
          .select('id')
          .eq('storage_path', file.name)
          .maybeSingle();

        if (checkError) {
          result.errors.push(`Check error for ${file.name}: ${checkError.message}`);
          continue;
        }

        // If no DB reference exists, delete orphaned file
        if (!docExists) {
          console.log(`[STORAGE-CLEANUP] Deleting orphaned file: ${file.name}`);
          
          const { error: deleteError } = await supabase.storage
            .from('kyc-documents')
            .remove([file.name]);

          if (deleteError) {
            result.errors.push(`Failed to delete ${file.name}: ${deleteError.message}`);
          } else {
            result.filesDeleted++;
          }
        }
      }
    }
  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error));
    result.errors.push(`Cleanup error: ${err.message}`);
  }

  return result;
}
