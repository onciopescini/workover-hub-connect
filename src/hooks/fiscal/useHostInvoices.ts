import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { sreLogger } from '@/lib/sre-logger';
import { useState } from 'react';
import type { HostInvoice } from '@/types/fiscal';

export interface InvoiceTotals {
  totalAmount: number;
  totalBase: number;
  totalVat: number;
  count: number;
}

export const useHostInvoices = (hostId?: string) => {
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [statusFilter, setStatusFilter] = useState<string | null>(null);

  const invoicesQuery = useQuery({
    queryKey: ['host-invoices', hostId, selectedYear, statusFilter],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const targetHostId = hostId || user?.id;

      if (!targetHostId) {
        throw new Error('Host ID required');
      }

      let query = supabase
        .from('invoices')
        .select('*')
        .eq('recipient_id', targetHostId)
        .eq('recipient_type', 'host')
        .gte('invoice_date', `${selectedYear}-01-01`)
        .lte('invoice_date', `${selectedYear}-12-31`)
        .order('invoice_date', { ascending: false });

      if (statusFilter) {
        query = query.eq('xml_delivery_status', statusFilter);
      }

      const { data, error } = await query;

      if (error) {
        sreLogger.error('Error fetching host invoices', { 
          error, 
          hostId: targetHostId,
          year: selectedYear,
          status: statusFilter 
        });
        throw error;
      }

      return data as HostInvoice[];
    },
    enabled: !!hostId || !!supabase.auth.getUser()
  });

  const calculateTotals = (invoices: HostInvoice[]): InvoiceTotals => {
    if (!invoices || invoices.length === 0) {
      return { totalAmount: 0, totalBase: 0, totalVat: 0, count: 0 };
    }

    return invoices.reduce(
      (acc, invoice) => ({
        totalAmount: acc.totalAmount + Number(invoice.total_amount),
        totalBase: acc.totalBase + Number(invoice.base_amount),
        totalVat: acc.totalVat + Number(invoice.vat_amount),
        count: acc.count + 1
      }),
      { totalAmount: 0, totalBase: 0, totalVat: 0, count: 0 }
    );
  };

  const downloadInvoice = async (invoice: HostInvoice, type: 'pdf' | 'xml') => {
    const url = type === 'pdf' ? invoice.pdf_file_url : invoice.xml_file_url;
    
    if (!url) {
      sreLogger.warn('Invoice file not available', { invoiceId: invoice.id, type });
      return;
    }

    try {
      const link = document.createElement('a');
      link.href = url;
      link.download = `${invoice.invoice_number.replace(/\//g, '_')}.${type}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      sreLogger.info('Invoice downloaded', { invoiceId: invoice.id, type });
    } catch (error) {
      sreLogger.error('Error downloading invoice', { error, invoiceId: invoice.id, type });
    }
  };

  const availableYears = () => {
    const currentYear = new Date().getFullYear();
    const years: number[] = [];
    for (let year = 2024; year <= currentYear; year++) {
      years.push(year);
    }
    return years.reverse();
  };

  return {
    invoices: invoicesQuery.data || [],
    isLoading: invoicesQuery.isLoading,
    error: invoicesQuery.error,
    totals: calculateTotals(invoicesQuery.data || []),
    selectedYear,
    setSelectedYear,
    statusFilter,
    setStatusFilter,
    downloadInvoice,
    availableYears: availableYears(),
    refetch: invoicesQuery.refetch
  };
};
