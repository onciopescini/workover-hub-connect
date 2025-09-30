
import { Database } from "@/integrations/supabase/types";

export type Waitlist = Database["public"]["Tables"]["waitlists"]["Row"];
export type WaitlistInsert = Database["public"]["Tables"]["waitlists"]["Insert"];
export type WaitlistUpdate = Database["public"]["Tables"]["waitlists"]["Update"];

export interface WaitlistWithDetails extends Waitlist {
  space_title?: string;
  host_name?: string;
}
