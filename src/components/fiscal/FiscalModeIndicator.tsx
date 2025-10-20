import { Badge } from '@/components/ui/badge';
import { useFiscalMode } from '@/contexts/FiscalModeContext';
import { useRoleAccess } from '@/hooks/useRoleAccess';

export const FiscalModeIndicator = () => {
  const { isMockMode } = useFiscalMode();
  const { isAdmin } = useRoleAccess();

  // Only show to admins
  if (!isAdmin) return null;
  
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
