/**
 * Fiscal Service Layer
 * 
 * Gestisce report DAC7, fatturazione e compliance fiscale per host.
 */

import { supabase } from '@/integrations/supabase/client';
import { sreLogger } from '@/lib/sre-logger';
import { DAC7Report, DAC7ReportFilters, FiscalStats, HostInvoice } from '@/types/fiscal';

// ============= TYPES =============

export interface DAC7ThresholdResult {
  total_income: number;
  total_transactions: number;
  threshold_met: boolean;
}

export interface GenerateInvoiceParams {
  paymentId: string;
  bookingId: string;
  hostId: string;
  breakdown: {
    host_fee: number;
    host_vat: number;
    total: number;
  };
}

export interface GenerateInvoiceResult {
  success: boolean;
  invoiceId?: string;
  pdfUrl?: string;
  error?: string;
}

// Re-export types for convenience
export type { DAC7Report, DAC7ReportFilters, FiscalStats, HostInvoice };

// ============= DAC7 METHODS =============

/**
 * Get DAC7 reports with optional filters.
 */
export async function getDAC7Reports(filters?: DAC7ReportFilters): Promise<DAC7Report[]> {
  let query = supabase
    .from('dac7_reports')
    .select('*')
    .order('reporting_year', { ascending: false });

  if (filters?.year) {
    query = query.eq('reporting_year', filters.year);
  }

  if (filters?.status) {
    query = query.eq('report_status', filters.status);
  }

  if (filters?.hostId) {
    query = query.eq('host_id', filters.hostId);
  }

  if (filters?.thresholdMet !== undefined) {
    query = query.eq('reporting_threshold_met', filters.thresholdMet);
  }

  const { data, error } = await query;

  if (error) {
    sreLogger.error('Error fetching DAC7 reports', { component: 'fiscalService', filters }, error as Error);
    throw error;
  }

  return data as DAC7Report[];
}

/**
 * Get a single DAC7 report by ID.
 */
export async function getDAC7ReportById(reportId: string): Promise<DAC7Report> {
  const { data, error } = await supabase
    .from('dac7_reports')
    .select('*')
    .eq('id', reportId)
    .single();

  if (error) {
    sreLogger.error('Error fetching DAC7 report', { component: 'fiscalService', reportId }, error as Error);
    throw error;
  }

  return data as DAC7Report;
}

/**
 * Calculate DAC7 thresholds for a host.
 */
export async function calculateDAC7Thresholds(hostId: string, year: number): Promise<DAC7ThresholdResult> {
  const { data, error } = await supabase.rpc('calculate_dac7_thresholds', {
    host_id_param: hostId,
    year_param: year
  });

  if (error) {
    sreLogger.error('Error calculating DAC7 thresholds', { component: 'fiscalService', hostId, year }, error as Error);
    throw error;
  }

  return data as unknown as DAC7ThresholdResult;
}

/**
 * Acknowledge a DAC7 report (mark as reviewed by host).
 */
export async function acknowledgeDAC7Report(reportId: string): Promise<DAC7Report> {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('User not authenticated');
  }

  const { data, error } = await supabase
    .from('dac7_reports')
    .update({ host_acknowledged_at: new Date().toISOString() })
    .eq('id', reportId)
    .eq('host_id', user.id)
    .select()
    .single();

  if (error) {
    sreLogger.error('Error acknowledging DAC7 report', { component: 'fiscalService', reportId }, error as Error);
    throw error;
  }

  return data as DAC7Report;
}

// ============= STATS METHODS =============

/**
 * Get fiscal stats for admin dashboard.
 */
export async function getFiscalStats(year?: number): Promise<FiscalStats> {
  const targetYear = year || new Date().getFullYear();

  const { data: reports, error } = await supabase
    .from('dac7_reports')
    .select('*')
    .eq('reporting_year', targetYear);

  if (error) {
    sreLogger.error('Error fetching fiscal stats', { component: 'fiscalService', year: targetYear }, error as Error);
    throw error;
  }

  return {
    totalReports: reports.length,
    reportsAboveThreshold: reports.filter(r => r.reporting_threshold_met).length,
    totalIncome: reports.reduce((sum, r) => sum + (r.total_income || 0), 0),
    averageIncome: reports.length > 0 
      ? reports.reduce((sum, r) => sum + (r.total_income || 0), 0) / reports.length 
      : 0,
    hostCount: new Set(reports.map(r => r.host_id)).size
  };
}

// ============= INVOICE METHODS =============

/**
 * Generate host invoice via Edge Function.
 */
export async function generateHostInvoice(params: GenerateInvoiceParams): Promise<GenerateInvoiceResult> {
  const { data, error } = await supabase.functions.invoke('generate-host-invoice', {
    body: {
      payment_id: params.paymentId,
      booking_id: params.bookingId,
      host_id: params.hostId,
      breakdown: params.breakdown
    }
  });

  if (error) {
    sreLogger.error('Error generating host invoice', { component: 'fiscalService', params }, error as Error);
    return { success: false, error: error.message };
  }

  return {
    success: true,
    invoiceId: data?.invoice_id,
    pdfUrl: data?.pdf_url
  };
}

/**
 * Get host invoice history.
 */
export async function getHostInvoices(hostId: string): Promise<HostInvoice[]> {
  const { data, error } = await supabase
    .from('invoices')
    .select('*')
    .eq('recipient_id', hostId)
    .eq('recipient_type', 'host')
    .order('invoice_date', { ascending: false });

  if (error) {
    sreLogger.error('Error fetching host invoices', { component: 'fiscalService', hostId }, error as Error);
    throw error;
  }

  return data as HostInvoice[];
}

/**
 * Get current user's invoice history (auto-detects hostId from session).
 */
export async function getCurrentUserInvoices(): Promise<HostInvoice[]> {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('User not authenticated');
  }

  return getHostInvoices(user.id);
}
