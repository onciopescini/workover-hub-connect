export const ADMIN_ROLES = {
  ADMIN: 'admin',
} as const;

export const ADMIN_ROUTES = {
  ROOT: '/admin',
  DASHBOARD: '/admin/dashboard',
  TICKETS: '/admin/tickets',
  USERS: '/admin/users',
  USER_INSPECTOR: '/admin/users/:id',
  BOOKINGS: '/admin/bookings',
  KYC: '/admin/kyc',
  REVENUE: '/admin/revenue',
} as const;

export const buildAdminUserInspectorRoute = (userId: string): string => `${ADMIN_ROUTES.USERS}/${userId}`;

export const ADMIN_RPC = {
  GET_USER_INSPECTOR_DETAIL: 'admin_get_user_inspector_detail',
  SUSPEND_USER: 'admin_suspend_user',
} as const;

export const ADMIN_TICKET_OPEN_STATUSES = ['open', 'in_progress'] as const;
export const ADMIN_KYC_FAILED_STATUS = 'rejected';
export const ADMIN_REFUND_REQUESTED_STATUS = 'refund_requested';
