export interface CookieConsent {
  necessary: boolean;
  analytics: boolean;
  marketing: boolean;
  preferences: boolean;
  timestamp: number;
  version: string;
}

export interface ConsentSettings {
  bannerDismissed: boolean;
  consent: CookieConsent;
  lastUpdated: number;
}

export type ConsentAction = 'accept-all' | 'reject-all' | 'customize' | 'save-preferences';

export interface CookieCategory {
  id: keyof Omit<CookieConsent, 'timestamp' | 'version'>;
  name: string;
  description: string;
  required: boolean;
  cookies: string[];
}

// Data Breach types
export interface DataBreach {
  id: string;
  breach_date: string;
  detected_at: string;
  nature_of_breach: string;
  affected_users_count: number;
  affected_data_types: string[];
  status: 'open' | 'investigating' | 'contained' | 'closed';
  severity: 'low' | 'medium' | 'high' | 'critical';
  authority_notified_at?: string;
  authority_notification_required: boolean;
  containment_measures?: string;
  impact_assessment?: string;
  reported_by?: string;
  resolved_by?: string;
  resolved_at?: string;
  created_at: string;
  updated_at: string;
}

// Cookie Consent Log types
export interface CookieConsentLog {
  id: string;
  user_id?: string;
  session_id?: string;
  consent_version: string;
  necessary_consent: boolean;
  analytics_consent: boolean;
  marketing_consent: boolean;
  preferences_consent: boolean;
  consent_method: 'banner' | 'settings' | 'withdrawal';
  ip_address?: string;
  user_agent?: string;
  consent_given_at: string;
  withdrawn_at?: string;
  is_active: boolean;
}

// Data Minimization Audit types
export interface DataMinimizationAudit {
  id: string;
  audit_date: string;
  table_name: string;
  column_name?: string;
  data_type: string;
  record_count: number;
  last_accessed_date?: string;
  usage_frequency: 'never' | 'rare' | 'occasional' | 'frequent' | 'constant';
  retention_recommendation: 'keep' | 'anonymize' | 'delete' | 'archive';
  business_justification?: string;
  legal_basis?: string;
  audit_notes?: string;
  created_by?: string;
  created_at: string;
}

// Accessibility Audit types (keeping existing ones)
export type AccessibilityAuditType = "automated" | "manual";

export interface AccessibilityAudit {
  id: string;
  page_url: string;
  audit_type: AccessibilityAuditType;
  score: number;
  violations: AccessibilityViolation[];
  created_by: string;
  created_at: string;
}

export interface AccessibilityViolation {
  id: string;
  description: string;
  impact: "minor" | "moderate" | "serious" | "critical";
  help: string;
  helpUrl?: string;
  nodes?: Array<Record<string, unknown>>;
}

// Retention Exemption types (keeping existing ones)
export interface ProfileWithExemption {
  id: string;
  first_name: string;
  last_name: string;
  role: string;
  data_retention_exempt: boolean;
  created_at: string;
  last_login_at: string | null;
  is_suspended: boolean;
}

export interface RetentionExemptionAction {
  profile_id: string;
  granted: boolean;
  reason?: string;
  admin_id: string;
}
