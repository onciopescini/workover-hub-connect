export type AccessStatus = 
  | 'loading'
  | 'unauthenticated' 
  | 'unauthorized'
  | 'authorized';

export interface AccessGuardProps {
  requiredRoles?: string[];
  loadingFallback?: React.ReactNode;
  deniedFallback?: React.ReactNode;
  children: React.ReactNode;
}

export interface AccessDeniedProps {
  variant: 'unauthenticated' | 'unauthorized' | 'suspended';
  title?: string;
  message?: string;
  actionButton?: {
    text: string;
    href: string;
  };
}