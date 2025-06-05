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

// Accessibility Audit types
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
  nodes?: any[];
}

// Retention Exemption types
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
