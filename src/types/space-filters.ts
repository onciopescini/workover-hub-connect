// Space Filter Types
export interface SpaceFilters {
  category: string;
  priceRange: [number, number];
  amenities: string[];
  workEnvironment: string;
  location: string;
  coordinates: { lat: number; lng: number } | null;
  capacity: [number, number];
  rating: number;
  verified: boolean;
  superhost: boolean;
  instantBook: boolean;
  startDate: Date | null;
  endDate: Date | null;
  startTime: string | null;
  endTime: string | null;
  guestsCount?: number;
}

export interface BasicSpaceFilters {
  category: string;
  priceRange: [number, number];
  amenities: string[];
  workEnvironment: string;
  location?: string;
  coordinates?: Coordinates;
}

// Space Types - updated to match Supabase schema
export interface Space {
  id: string;
  title: string;
  description: string;
  category: 'home' | 'outdoor' | 'professional';
  work_environment: 'quiet' | 'collaborative' | 'flexible';
  price_per_hour: number;
  max_capacity: number;
  photos: string[];
  amenities: string[];
  features: string[];
  seating_types: string[];
  address: string;
  host_id: string;
  created_at: string;
  updated_at: string;
  published: boolean;
  approved_at?: string | null;
  approved_by?: string | null;
  availability?: Record<string, unknown> | null;
  capacity?: number | null;
  pending_approval?: boolean;
  deleted_at?: string | null;
  suspended_at?: string | null;
  suspended_by?: string | null;
  is_suspended?: boolean;
  revision_requested?: boolean;
  // Optional computed fields
  distance?: number;
  rating?: number;
  verified?: boolean;
  superhost?: boolean;
  instantBook?: boolean;
}

// Form Input Types
export type FormFieldValue = string | number | boolean | string[] | [number, number] | Coordinates | null;

export interface FormInputChangeHandler {
  (field: string, value: FormFieldValue): void;
}

// Event Types
export interface SpaceClickHandler {
  (spaceId: string): void;
}

export interface FilterChangeHandler {
  (filters: SpaceFilters | BasicSpaceFilters): void;
}

// Location Types
export interface Coordinates {
  lat: number;
  lng: number;
}

export interface LocationSelectHandler {
  (location: string, coordinates?: Coordinates): void;
}
