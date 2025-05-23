
import { Database } from "@/integrations/supabase/types";

export type SupportTicket = Database["public"]["Tables"]["support_tickets"]["Row"];
export type SupportTicketInsert = Database["public"]["Tables"]["support_tickets"]["Insert"];
export type SupportTicketUpdate = Database["public"]["Tables"]["support_tickets"]["Update"];

export const SUPPORT_STATUS_COLORS = {
  open: "bg-blue-100 text-blue-800",
  in_progress: "bg-yellow-100 text-yellow-800",
  resolved: "bg-green-100 text-green-800",
  closed: "bg-gray-100 text-gray-800",
};

export const SUPPORT_STATUS_LABELS = {
  open: "Open",
  in_progress: "In Progress",
  resolved: "Resolved", 
  closed: "Closed",
};
