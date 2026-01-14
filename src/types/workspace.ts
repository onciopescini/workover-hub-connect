import { Database } from "@/integrations/supabase/types";

// Define the WorkspaceInsert type based on the new schema requirements
export interface WorkspaceInsert {
  id?: string;
  name: string; // Mapped from title
  address: string;
  features: string[]; // Mapped from workspace_features
  price_per_day: number;
  price_per_hour: number;
  max_capacity: number;
  category: Database["public"]["Enums"]["space_category"];
  rules?: string | null;
  cancellation_policy?: Database["public"]["Enums"]["cancellation_policy"] | null;
  availability?: any; // Saved as JSON
  host_id: string;
  description?: string;
  photos?: string[];
  latitude?: number;
  longitude?: number;
  published?: boolean;
  pending_approval?: boolean;
  // Keeping other likely fields that might be in formData, but strictly following the mapping instruction
  amenities?: string[];
  seating_types?: string[];
  work_environment?: Database["public"]["Enums"]["work_environment"];
  ideal_guest_tags?: string[];
  event_friendly_tags?: string[];
  confirmation_type?: Database["public"]["Enums"]["confirmation_type"];
}

export interface WorkspaceUpdate extends Partial<WorkspaceInsert> {}
