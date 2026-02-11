export const INVOICING_TABLES = {
  PLATFORM_FEE_INVOICES_QUEUE: 'platform_fee_invoices_queue',
  ADMIN_PLATFORM_FEE_INVOICES_QUEUE_VIEW: 'admin_platform_fee_invoices_queue_view',
} as const;

export const INVOICING_RPC = {
  ADMIN_PROCESS_INVOICE_QUEUE: 'admin_process_invoice_queue',
} as const;

export const INVOICING_QUERY_KEYS = {
  ADMIN_PLATFORM_FEE_INVOICES_QUEUE: 'admin_platform_fee_invoices_queue',
} as const;

export const INVOICE_QUEUE_STATUS_LABELS = {
  pending: 'Pending',
  processing: 'Processing',
  completed: 'Completed',
  failed: 'Failed',
} as const;
