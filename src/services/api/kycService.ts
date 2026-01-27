/**
 * KYC Service Layer
 * 
 * Handles KYC (Know Your Customer) document management with proper
 * error handling and type safety. Follows the Result Pattern.
 */

import { supabase } from '@/integrations/supabase/client';
import { sreLogger } from '@/lib/sre-logger';

// ============= TYPES =============

export type DocumentType = 'id_card' | 'passport' | 'drivers_license' | 'business_registration' | 'tax_id';
export type VerificationStatus = 'pending' | 'approved' | 'rejected' | 'expired';

export interface KYCDocument {
  id: string;
  user_id: string;
  document_type: string;
  file_name: string;
  file_url: string;
  verification_status: string;
  rejection_reason: string | null;
  verified_at: string | null;
  verified_by: string | null;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface UploadDocumentParams {
  userId: string;
  documentType: DocumentType;
  fileName: string;
  fileUrl: string;
  expiresAt?: string;
}

export interface UploadDocumentResult {
  success: boolean;
  documentId?: string;
  error?: string;
}

export interface GetDocumentsResult {
  success: boolean;
  documents?: KYCDocument[];
  error?: string;
}

export interface KYCStatus {
  isVerified: boolean;
  pendingDocuments: number;
  approvedDocuments: number;
  rejectedDocuments: number;
  requiredDocuments: DocumentType[];
}

export interface GetKYCStatusResult {
  success: boolean;
  status?: KYCStatus;
  error?: string;
}

// ============= METHODS =============

/**
 * Upload a new KYC document.
 */
export async function uploadDocument(params: UploadDocumentParams): Promise<UploadDocumentResult> {
  const { userId, documentType, fileName, fileUrl, expiresAt } = params;

  if (!userId || !documentType || !fileName || !fileUrl) {
    return { success: false, error: 'Missing required fields' };
  }

  sreLogger.info('Uploading KYC document', { 
    component: 'kycService', 
    userId, 
    documentType 
  });

  try {
    const { data, error } = await supabase
      .from('kyc_documents')
      .insert({
        user_id: userId,
        document_type: documentType,
        file_name: fileName,
        file_url: fileUrl,
        verification_status: 'pending',
        expires_at: expiresAt || null
      })
      .select('id')
      .single();

    if (error) {
      sreLogger.error('Error uploading KYC document', { component: 'kycService' }, error);
      return { success: false, error: error.message };
    }

    sreLogger.info('KYC document uploaded successfully', { 
      component: 'kycService', 
      documentId: data.id 
    });

    return { success: true, documentId: data.id };
  } catch (err) {
    sreLogger.error('Exception uploading KYC document', { component: 'kycService' }, err as Error);
    return { success: false, error: 'Failed to upload document' };
  }
}

/**
 * Get all KYC documents for a user.
 */
export async function getDocuments(userId: string): Promise<GetDocumentsResult> {
  if (!userId) {
    return { success: false, error: 'User ID is required' };
  }

  sreLogger.info('Fetching KYC documents', { component: 'kycService', userId });

  try {
    const { data, error } = await supabase
      .from('kyc_documents')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      sreLogger.error('Error fetching KYC documents', { component: 'kycService' }, error);
      return { success: false, error: error.message };
    }

    return { success: true, documents: data as KYCDocument[] };
  } catch (err) {
    sreLogger.error('Exception fetching KYC documents', { component: 'kycService' }, err as Error);
    return { success: false, error: 'Failed to fetch documents' };
  }
}

/**
 * Get KYC verification status for a user.
 */
export async function getKYCStatus(userId: string): Promise<GetKYCStatusResult> {
  if (!userId) {
    return { success: false, error: 'User ID is required' };
  }

  sreLogger.info('Fetching KYC status', { component: 'kycService', userId });

  try {
    const { data: documents, error } = await supabase
      .from('kyc_documents')
      .select('document_type, verification_status')
      .eq('user_id', userId);

    if (error) {
      sreLogger.error('Error fetching KYC status', { component: 'kycService' }, error);
      return { success: false, error: error.message };
    }

    const docs = documents || [];
    const pendingDocuments = docs.filter(d => d.verification_status === 'pending').length;
    const approvedDocuments = docs.filter(d => d.verification_status === 'approved').length;
    const rejectedDocuments = docs.filter(d => d.verification_status === 'rejected').length;

    // Define required documents based on business rules
    const requiredDocuments: DocumentType[] = ['id_card'];
    const hasRequiredDocuments = requiredDocuments.every(
      reqDoc => docs.some(d => d.document_type === reqDoc && d.verification_status === 'approved')
    );

    const status: KYCStatus = {
      isVerified: hasRequiredDocuments,
      pendingDocuments,
      approvedDocuments,
      rejectedDocuments,
      requiredDocuments
    };

    return { success: true, status };
  } catch (err) {
    sreLogger.error('Exception fetching KYC status', { component: 'kycService' }, err as Error);
    return { success: false, error: 'Failed to fetch KYC status' };
  }
}

/**
 * Delete a KYC document.
 */
export async function deleteDocument(
  documentId: string, 
  userId: string
): Promise<{ success: boolean; error?: string }> {
  if (!documentId || !userId) {
    return { success: false, error: 'Document ID and User ID are required' };
  }

  try {
    const { error } = await supabase
      .from('kyc_documents')
      .delete()
      .eq('id', documentId)
      .eq('user_id', userId);

    if (error) {
      sreLogger.error('Error deleting KYC document', { component: 'kycService' }, error);
      return { success: false, error: error.message };
    }

    sreLogger.info('KYC document deleted', { component: 'kycService', documentId });
    return { success: true };
  } catch (err) {
    sreLogger.error('Exception deleting KYC document', { component: 'kycService' }, err as Error);
    return { success: false, error: 'Failed to delete document' };
  }
}
