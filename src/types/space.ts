
import { Database } from "@/integrations/supabase/types";

// Exteding the auto-generated Space type to include optional fields that might be missing or added via views/migrations
// This helps avoid 'as any' casting for known fields like timezone
export type Space = Database["public"]["Tables"]["spaces"]["Row"] & {
  timezone?: string;
  city?: string;
  country_code?: string;
};

export type SpaceInsert = Database["public"]["Tables"]["spaces"]["Insert"];
export type SpaceUpdate = Database["public"]["Tables"]["spaces"]["Update"];

export const WORKSPACE_FEATURES_OPTIONS = [
  "Dedicated desk",
  "Shared table",
  "Standing desk",
  "Lounge area",
  "Outdoor workspace",
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
