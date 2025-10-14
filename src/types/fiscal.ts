export interface TaxDetails {
  id: string;
  profile_id: string;
  country_code: string;
  entity_type: 'individual' | 'business';
  tax_id: string;
  vat_number?: string | null;
  address_line1: string;
  address_line2?: string | null;
  city: string;
  province?: string | null;
  postal_code: string;
  iban: string;
  bic_swift?: string | null;
  valid_from: string;
  valid_to?: string | null;
  is_primary: boolean;
  created_at: string;
  updated_at: string;
  created_by?: string | null;
}

export interface TaxDetailsInput {
  country_code: string;
  entity_type: 'individual' | 'business';
  tax_id: string;
  vat_number?: string;
  address_line1: string;
  address_line2?: string;
  city: string;
  province?: string;
  postal_code: string;
  iban: string;
  bic_swift?: string;
}

export interface DAC7Report {
  id: string;
  host_id: string;
  reporting_year: number;
  total_income: number;
  total_transactions: number;
  reporting_threshold_met: boolean;
  report_status: 'draft' | 'final' | 'submitted' | 'error';
  report_json_data?: any;
  report_file_url?: string | null;
  submission_reference?: string | null;
  generated_by?: string | null;
  notification_sent_at?: string | null;
  host_acknowledged_at?: string | null;
  created_at: string;
  updated_at: string;
  error_details?: any;
}

export interface DAC7ReportFilters {
  year?: number;
  status?: DAC7Report['report_status'];
  hostId?: string;
  thresholdMet?: boolean;
}

export interface FiscalStats {
  totalReports: number;
  reportsAboveThreshold: number;
  totalIncome: number;
  averageIncome: number;
  hostCount: number;
}

export interface HostInvoice {
  id: string;
  payment_id: string;
  booking_id: string;
  recipient_id: string;
  invoice_number: string;
  invoice_date: string;
  due_date?: string | null;
  base_amount: number;
  vat_rate: number;
  vat_amount: number;
  total_amount: number;
  pdf_file_url?: string | null;
  xml_file_url?: string | null;
  created_at: string;
}
