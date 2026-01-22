
import { Database } from "@/integrations/supabase/types";

// Extending the auto-generated Space type to include optional fields that might be missing or added via views/migrations
// This helps avoid unsafe casting for known fields like timezone
export type Space = Omit<Database["public"]["Tables"]["spaces"]["Row"], "workspace_features"> & {
  timezone?: string;
  city?: string;
  country_code?: string;
  is_suspended?: boolean;
  suspension_reason?: string | null;
  suspended_at?: string | null;
  suspended_by?: string | null;
  deleted_at?: string | null;
  approved_at?: string | null;
  approved_by?: string | null;
  pending_approval?: boolean | null;
  rejection_reason?: string | null;
  revision_notes?: string | null;
  revision_requested?: boolean | null;
  approximate_location?: unknown;
  features: string[];
  name?: string;
  distance_km?: number;
  // UI Alias Properties - mapped from database fields for backwards compatibility
  title?: string;        // Alias for 'title'
  capacity?: number;     // Alias for 'max_capacity'
  city_name?: string;    // Alias for 'city'
};

export type SpaceInsert = Omit<Database["public"]["Tables"]["spaces"]["Insert"], "workspace_features"> & {
  features?: string[];
};
export type SpaceUpdate = Omit<Database["public"]["Tables"]["spaces"]["Update"], "workspace_features"> & {
  features?: string[];
};

export const SPACE_FEATURES_OPTIONS = [
  "Dedicated desk",
  "Shared table",
  "Standing desk",
  "Lounge area",
  "Outdoor space",
  "Private office",
  "Meeting room",
  "Phone booth"
];

export const AMENITIES_OPTIONS = [
  "High-speed WiFi",
  "Coffee & Tea",
  "Printer",
  "Kitchen",
  "Refrigerator",
  "Microwave",
  "Parking",
  "Air conditioning",
  "Heating",
  "Elevator",
  "Wheelchair accessible",
  "Restrooms",
  "Shower"
];

export const SEATING_TYPES_OPTIONS = [
  "Ergonomic chair",
  "Standard chair",
  "Stool",
  "Armchair",
  "Sofa",
  "Bean bag",
  "Floor seating",
  "Outdoor seating"
];

export const WORK_ENVIRONMENT_OPTIONS = [
  { value: "silent", label: "Silent", description: "No talking allowed, perfect for deep focus" },
  { value: "controlled", label: "Controlled", description: "Quiet conversations allowed" },
  { value: "dynamic", label: "Dynamic", description: "Open discussions and calls welcome" }
];

export const CATEGORY_OPTIONS = [
  { value: "home", label: "Home", description: "Residential space" },
  { value: "professional", label: "Professional", description: "Office or coworking space" },
  { value: "outdoor", label: "Outdoor", description: "Garden, patio or terrace" }
];

export const CONFIRMATION_TYPE_OPTIONS = [
  { value: "instant", label: "Instant", description: "Bookings are automatically confirmed" },
  { value: "host_approval", label: "Host Approval", description: "You'll need to approve each booking" }
];

export const EVENT_FRIENDLY_OPTIONS = [
  "Meetings",
  "Workshops",
  "Presentations",
  "Social gatherings",
  "Photo shoots",
  "Private events"
];

export const IDEAL_GUEST_OPTIONS = [
  "Freelancers",
  "Remote workers",
  "Students",
  "Creatives",
  "Entrepreneurs",
  "Teams",
  "Digital nomads"
];
