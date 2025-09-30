// Common form types
export interface FormErrors {
  [field: string]: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: FormErrors;
}

// Generic form field change handler
export interface GenericFormHandler<T = any> {
  (field: string, value: T): void;
}

// Component input change handlers
export interface ComponentInputChangeHandler {
  (field: string, value: string | number | boolean | string[] | null): void;
}

// Space form specific types
export interface SpaceFormData {
  title: string;
  description: string;
  category: string;
  work_environment: string;
  price_per_hour: number;
  max_capacity: number;
  address: string;
  amenities: string[];
  workspace_features: string[];
  seating_types: string[];
  photos: string[];
  availability: Record<string, unknown>;
}

// Search and filter types
export interface SearchFilters {
  query: string;
  category?: string;
  location?: string;
  priceRange?: [number, number];
  [key: string]: any;
}

// Networking types
export interface NetworkingUser {
  id: string;
  first_name: string;
  last_name: string;
  profile_photo_url?: string;
  bio?: string;
  job_title?: string;
  skills?: string;
  interests?: string;
  location?: string;
  linkedin_url?: string;
}

export interface ConnectionRequest {
  id: string;
  sender_id: string;
  receiver_id: string;
  status: 'pending' | 'accepted' | 'rejected';
  created_at: string;
  updated_at: string;
  expires_at?: string;
}


// Report types
export interface ReportData {
  id: string;
  target_type: string;
  target_id: string;
  reason: string;
  description?: string;
  status: 'open' | 'under_review' | 'resolved' | 'closed';
  reporter_id: string;
  reviewed_by?: string;
  reviewed_at?: string;
  admin_notes?: string;
  created_at: string;
  updated_at: string;
}