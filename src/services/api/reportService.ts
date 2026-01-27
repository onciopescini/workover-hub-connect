/**
 * Report Service Layer
 * 
 * Handles user reports and flags with proper error handling
 * and type safety. Follows the Result Pattern.
 */

import { supabase } from '@/integrations/supabase/client';
import { sreLogger } from '@/lib/sre-logger';

// ============= TYPES =============

export type ReportTargetType = 'user' | 'review' | 'space' | 'message';

export interface CreateReportParams {
  reporterId: string;
  targetId: string;
  targetType: ReportTargetType;
  reason: string;
  description?: string | null;
}

export interface CreateReportResult {
  success: boolean;
  reportId?: string;
  error?: string;
}

export interface Report {
  id: string;
  reporter_id: string;
  target_id: string;
  target_type: string;
  reason: string;
  description: string | null;
  status: string | null;
  admin_notes: string | null;
  reviewed_at: string | null;
  reviewed_by: string | null;
  created_at: string | null;
  updated_at: string;
}

export interface GetReportsResult {
  success: boolean;
  reports?: Report[];
  error?: string;
}

// ============= METHODS =============

/**
 * Create a new report.
 */
export async function createReport(params: CreateReportParams): Promise<CreateReportResult> {
  const { reporterId, targetId, targetType, reason, description } = params;

  if (!reporterId || !targetId || !targetType || !reason) {
    return { success: false, error: 'Missing required fields' };
  }

  sreLogger.info('Creating report', { 
    component: 'reportService', 
    reporterId, 
    targetId, 
    targetType 
  });

  try {
    const { data, error } = await supabase
      .from('reports')
      .insert({
        reporter_id: reporterId,
        target_id: targetId,
        target_type: targetType,
        reason,
        description: description || null,
        status: 'pending'
      })
      .select('id')
      .single();

    if (error) {
      sreLogger.error('Error creating report', { component: 'reportService' }, error);
      return { success: false, error: error.message };
    }

    sreLogger.info('Report created successfully', { 
      component: 'reportService', 
      reportId: data.id 
    });

    return { success: true, reportId: data.id };
  } catch (err) {
    sreLogger.error('Exception creating report', { component: 'reportService' }, err as Error);
    return { success: false, error: 'Failed to submit report' };
  }
}

/**
 * Get reports filed by a user.
 */
export async function getReportsByReporter(reporterId: string): Promise<GetReportsResult> {
  if (!reporterId) {
    return { success: false, error: 'Reporter ID is required' };
  }

  try {
    const { data, error } = await supabase
      .from('reports')
      .select('*')
      .eq('reporter_id', reporterId)
      .order('created_at', { ascending: false });

    if (error) {
      sreLogger.error('Error fetching reports', { component: 'reportService' }, error);
      return { success: false, error: error.message };
    }

    return { success: true, reports: data as Report[] };
  } catch (err) {
    sreLogger.error('Exception fetching reports', { component: 'reportService' }, err as Error);
    return { success: false, error: 'Failed to fetch reports' };
  }
}

/**
 * Check if user has already reported a target.
 */
export async function hasReported(
  reporterId: string, 
  targetId: string,
  targetType: ReportTargetType
): Promise<{ success: boolean; hasReported?: boolean; error?: string }> {
  if (!reporterId || !targetId || !targetType) {
    return { success: false, error: 'Reporter ID, Target ID, and Target Type are required' };
  }

  try {
    const { data, error } = await supabase
      .from('reports')
      .select('id')
      .eq('reporter_id', reporterId)
      .eq('target_id', targetId)
      .eq('target_type', targetType)
      .maybeSingle();

    if (error) {
      sreLogger.error('Error checking report status', { component: 'reportService' }, error);
      return { success: false, error: error.message };
    }

    return { success: true, hasReported: !!data };
  } catch (err) {
    sreLogger.error('Exception checking report status', { component: 'reportService' }, err as Error);
    return { success: false, error: 'Failed to check report status' };
  }
}

/**
 * Create a report for a user (convenience method).
 */
export async function reportUser(
  reporterId: string,
  reportedUserId: string,
  reason: string,
  description?: string | null
): Promise<CreateReportResult> {
  return createReport({
    reporterId,
    targetId: reportedUserId,
    targetType: 'user',
    reason,
    description: description ?? null
  });
}

/**
 * Create a report for a review (convenience method).
 */
export async function reportReview(
  reporterId: string,
  reviewId: string,
  reason: string,
  description?: string | null
): Promise<CreateReportResult> {
  return createReport({
    reporterId,
    targetId: reviewId,
    targetType: 'review',
    reason,
    description: description ?? null
  });
}
