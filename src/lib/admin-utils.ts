
// Re-export all admin utilities for backward compatibility
export { isCurrentUserAdmin } from "./admin/admin-auth-utils";
export { getAdminStats } from "./admin/admin-stats-utils";
export { 
  getAllUsers, 
  suspendUser, 
  reactivateUser 
} from "./admin/admin-user-utils";
export { 
  getAllSpaces, 
  moderateSpace 
} from "./admin/admin-space-utils";
export { 
  createWarning, 
  getUserWarnings 
} from "./admin/admin-warning-utils";
export { 
  getAllTags, 
  approveTag 
} from "./admin/admin-tag-utils";
export { getAdminActionsLog } from "./admin/admin-log-utils";
