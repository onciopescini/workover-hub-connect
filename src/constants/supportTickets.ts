export const SUPPORT_TICKET_STATUSES = ['open', 'in_progress', 'resolved', 'closed'] as const;

export type SupportTicketStatus = (typeof SUPPORT_TICKET_STATUSES)[number];

export const SUPPORT_TICKET_STATUS_LABELS: Record<SupportTicketStatus, string> = {
  open: 'Open',
  in_progress: 'In Progress',
  resolved: 'Resolved',
  closed: 'Closed',
};

export const SUPPORT_TICKET_PRIORITY_BADGE_CLASS: Record<string, string> = {
  low: 'bg-slate-100 text-slate-800',
  normal: 'bg-blue-100 text-blue-800',
  high: 'bg-amber-100 text-amber-800',
  critical: 'bg-red-100 text-red-800',
};

export const ADMIN_TICKETS_FILTERS = {
  OPEN: 'open',
  MY: 'my',
  CLOSED: 'closed',
} as const;

export type AdminTicketsFilter = (typeof ADMIN_TICKETS_FILTERS)[keyof typeof ADMIN_TICKETS_FILTERS];
