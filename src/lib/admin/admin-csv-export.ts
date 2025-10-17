import { supabase } from "@/integrations/supabase/client";
import { checkAdminRateLimit, formatRateLimitError } from "./admin-rate-limit";
import { toast } from "sonner";

export type ExportType = 'payments' | 'bookings' | 'dac7' | 'users';

interface ExportOptions {
  exportType: ExportType;
  filters?: Record<string, any>;
  page?: number;
  pageSize?: number;
}

export async function exportAdminCSV(options: ExportOptions): Promise<void> {
  const { exportType, filters = {}, page = 1, pageSize = 5000 } = options;

  try {
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('User not authenticated');
    }

    // Check rate limit
    const rateLimitResult = await checkAdminRateLimit(user.id, 'csv_export');
    if (!rateLimitResult.allowed) {
      toast.error('Rate Limit', {
        description: formatRateLimitError(rateLimitResult.resetMs)
      });
      return;
    }

    // Show remaining exports
    if (rateLimitResult.remaining <= 2) {
      toast.warning('Limite Export', {
        description: `Rimangono ${rateLimitResult.remaining} export disponibili nell'ora corrente.`
      });
    }

    // Call edge function
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData?.session?.access_token;

    if (!token) {
      throw new Error('No access token available');
    }

    toast.loading('Generazione CSV in corso...', { id: 'csv-export' });

    const supabaseUrl = import.meta.env['VITE_SUPABASE_URL'] || 
                        'https://khtqwzvrxzsgfhsslwyz.supabase.co';

    const response = await fetch(
      `${supabaseUrl}/functions/v1/export-admin-csv`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          export_type: exportType,
          filters,
          page,
          page_size: pageSize
        })
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Export failed');
    }

    // Download CSV
    const csvBlob = await response.blob();
    const url = window.URL.createObjectURL(csvBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${exportType}_export_page${page}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);

    toast.success('Export Completato', {
      id: 'csv-export',
      description: `File CSV scaricato con successo (pagina ${page})`
    });

  } catch (error: any) {
    console.error('[exportAdminCSV] Error:', error);
    toast.error('Errore Export', {
      id: 'csv-export',
      description: error.message || 'Impossibile completare l\'export'
    });
  }
}

export function getMaxPageForExport(totalRows: number, pageSize: number = 5000): number {
  return Math.ceil(totalRows / pageSize);
}

export function shouldPaginate(totalRows: number, pageSize: number = 5000): boolean {
  return totalRows > pageSize;
}