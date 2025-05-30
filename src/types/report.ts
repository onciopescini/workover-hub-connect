
import { Database } from "@/integrations/supabase/types";

export type Report = Database["public"]["Tables"]["reports"]["Row"] & {
  reporter?: {
    first_name: string;
    last_name: string;
  };
};
export type ReportInsert = Database["public"]["Tables"]["reports"]["Insert"];
export type ReportUpdate = Database["public"]["Tables"]["reports"]["Update"];

export const REPORT_REASONS = {
  inappropriate_content: "Contenuto inappropriato",
  harassment: "Molestie",
  spam: "Spam",
  fake_profile: "Profilo falso",
  safety_concern: "Problema di sicurezza",
  fraud: "Frode",
  other: "Altro"
} as const;

export const REPORT_STATUS = {
  pending: "In attesa",
  under_review: "In revisione",
  resolved: "Risolto",
  dismissed: "Archiviato"
} as const;

export const REPORT_STATUS_COLORS = {
  pending: "bg-yellow-100 text-yellow-800",
  under_review: "bg-blue-100 text-blue-800",
  resolved: "bg-green-100 text-green-800",
  dismissed: "bg-gray-100 text-gray-800"
} as const;

export const REPORT_TARGET_TYPES = {
  user: "Utente",
  space: "Spazio",
  booking: "Prenotazione",
  event: "Evento",
  message: "Messaggio"
} as const;
