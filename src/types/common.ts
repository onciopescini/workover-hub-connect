
export interface CommonProps {
  className?: string;
  children?: React.ReactNode;
}

export interface BaseEntity {
  id: string;
  created_at: string;
  updated_at?: string;
}

export type StatusType = 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'failed' | 'active' | 'inactive';

export interface StatusConfig {
  label: string;
  variant: 'default' | 'secondary' | 'destructive' | 'outline';
  color: string;
  icon?: React.ComponentType<{ className?: string }>;
}

export interface FormSubmissionState {
  isSubmitting: boolean;
  errors: Record<string, string>;
  touched: Record<string, boolean>;
}
