import { Badge } from '@/components/ui/badge';
import { useFiscalMode } from '@/contexts/FiscalModeContext';
import { useAuth } from '@/hooks/auth/useAuth';

export const FiscalModeIndicator = () => {
  const { isMockMode } = useFiscalMode();
  const { authState } = useAuth();

  // Only show to admins
  if (authState.profile?.role !== 'admin') return null;
  
  if (!isMockMode) return null;

  return (
    <Badge 
      variant="secondary" 
      className="fixed bottom-4 right-4 z-50 text-xs"
    >
      🧪 FISCAL MOCK MODE
    </Badge>
  );
};
