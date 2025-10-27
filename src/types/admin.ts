import { Database } from "@/integrations/supabase/types";

// Admin warnings types
export type AdminWarning = Database["public"]["Tables"]["admin_warnings"]["Row"];
export type AdminWarningInsert = Database["public"]["Tables"]["admin_warnings"]["Insert"];

// Global tags types  
export type GlobalTag = Database["public"]["Tables"]["global_tags"]["Row"];
export type GlobalTagInsert = Database["public"]["Tables"]["global_tags"]["Insert"];

// Admin actions log types
export type AdminActionLog = Database["public"]["Tables"]["admin_actions_log"]["Row"];
export type AdminActionLogInsert = Database["public"]["Tables"]["admin_actions_log"]["Insert"];

// Static content types
export type StaticContent = Database["public"]["Tables"]["static_content"]["Row"];
export type StaticContentInsert = Database["public"]["Tables"]["static_content"]["Insert"];

// Extended profile type with admin fields
export type AdminProfile = {
  id: string;
  first_name: string;
  last_name: string;
  role: string;
  created_at: string;
  updated_at: string;
  is_suspended: boolean;
  suspension_reason?: string;
  suspended_at?: string;
  suspended_by?: string;
  stripe_connected: boolean;
  admin_notes?: string;
  profile_photo_url?: string;
  bio?: string;
  linkedin_url?: string;
};

// Extended space type with admin fields
export type AdminSpace = {
  id: string;
  title: string;
  description: string;
  host_id: string;
  published: boolean;
  pending_approval: boolean;
  approved_by?: string;
  approved_at?: string;
  rejection_reason?: string;
  created_at: string;
  updated_at: string;
  address: string;
  photos: string[];
  price_per_hour: number;
  price_per_day: number;
  category: string;
  max_capacity: number;
  is_suspended?: boolean;
  suspension_reason?: string;
  suspended_by?: string;
  suspended_at?: string;
  revision_requested?: boolean;
  revision_notes?: string;
};

// Admin dashboard stats
export type AdminStats = {
  totalUsers: number;
  totalHosts: number;
  totalSpaces: number;
  pendingSpaces: number;
  suspendedUsers: number;
  totalBookings: number;
  activeBookings: number;
  totalRevenue: number;
  openReports: number;
  unresolvedTickets: number;
  pendingGdprRequests: number;
  activeUsers: number;
  userGrowthTrend?: number;
};

export const WARNING_TYPES = {
  behavior: "Comportamento",
  content: "Contenuto",
  payment: "Pagamento", 
  spam: "Spam",
  other: "Altro"
} as const;

export const WARNING_SEVERITY = {
  low: "Bassa",
  medium: "Media",
  high: "Alta",
  critical: "Critica"
} as const;

export const ACTION_TYPES = {
  user_suspend: "Utente sospeso",
  user_reactivate: "Utente riattivato",
  space_approve: "Spazio approvato",
  space_reject: "Spazio rifiutato",
  space_suspend: "Spazio sospeso",
  space_revision_approved: "Revisione spazio approvata",
  space_revision_rejected: "Revisione spazio rifiutata",
  event_cancel: "Evento cancellato",
  tag_approve: "Tag approvato",
  tag_merge: "Tag uniti",
  ticket_update: "Ticket aggiornato",
  warning_issued: "Warning emesso",
  report_review: "Segnalazione rivista",
  admin_panel_access: "Accesso pannello admin",
  admin_panel_view: "Visualizzazione sezione admin"
} as const;
