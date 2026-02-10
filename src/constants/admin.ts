export const ADMIN_ROLES = {
  ADMIN: 'admin',
} as const;

export const ADMIN_ROUTES = {
  ROOT: '/admin',
  DASHBOARD: '/admin/dashboard',
  USERS: '/admin/users',
  BOOKINGS: '/admin/bookings',
  KYC: '/admin/kyc',
  REVENUE: '/admin/revenue',
} as const;

export const ADMIN_TICKET_OPEN_STATUSES = ['open', 'pending'] as const;
export const ADMIN_KYC_FAILED_STATUS = 'rejected';
export const ADMIN_REFUND_REQUESTED_STATUS = 'refund_requested';
