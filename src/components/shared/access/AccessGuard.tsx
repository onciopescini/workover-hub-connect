import { useAuth } from '@/hooks/auth/useAuth';
import { AccessGuardProps } from '@/types/host/access.types';
import { AccessDenied } from './AccessDenied';
import { LoadingSkeleton } from './LoadingSkeleton';
import { hasAnyRole } from '@/lib/auth/role-utils';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const AccessGuard = ({ 
  requiredRoles = ['host', 'admin'], 
  loadingFallback, 
  deniedFallback, 
  children 
}: AccessGuardProps) => {
  const { authState, refreshProfile } = useAuth();
  const [isFixingRole, setIsFixingRole] = useState(false);

  // Self-healing: Assign 'host' role if user has no role and is accessing a host route
  useEffect(() => {
    const checkAndFixRole = async () => {
      // Verifica se l'utente è autenticato ma non ha un ruolo nel profilo
      // e sta cercando di accedere a una rotta che richiede ruolo 'host'
      if (
        authState.isAuthenticated &&
        authState.profile &&
        !authState.profile.role &&
        requiredRoles.includes('host') &&
        !isFixingRole
      ) {
        setIsFixingRole(true);
        console.log("Self-healing: User has no role. Assigning 'host' role...");

        try {
          // Aggiorna il ruolo nel database
          const { error } = await supabase
            .from('profiles')
            .update({ role: 'host' })
            .eq('id', authState.user!.id);

          if (error) throw error;

          console.log("Self-healing: Role assigned successfully. Refreshing profile...");
          // Aggiorna lo stato locale per riflettere il cambiamento
          await refreshProfile();
          // Feedback opzionale, teniamo pulito per ora come richiesto ("trasparente")
        } catch (err) {
          console.error("Self-healing failed:", err);
          toast.error("Errore durante la configurazione dell'account");
        } finally {
          setIsFixingRole(false);
        }
      }
    };

    checkAndFixRole();
  }, [authState.isAuthenticated, authState.profile, requiredRoles, refreshProfile, isFixingRole, authState.user]);

  // Loading state (initial or during fix)
  if (authState.isLoading || isFixingRole) {
    if (isFixingRole) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
          <LoadingSkeleton />
          <p className="text-muted-foreground animate-pulse">Configurazione account in corso...</p>
        </div>
      );
    }
    return loadingFallback || <LoadingSkeleton />;
  }

  // Unauthenticated
  if (!authState.isAuthenticated) {
    return deniedFallback || (
      <AccessDenied 
        variant="unauthenticated" 
        actionButton={{ text: "Effettua il Login", href: "/login" }}
      />
    );
  }

  // Unauthorized (wrong role)
  if (!hasAnyRole(authState.roles, requiredRoles as any[])) {
    return deniedFallback || (
      <AccessDenied 
        variant="unauthorized" 
        actionButton={{ text: "Torna alla Dashboard", href: "/dashboard" }}
      />
    );
  }

  // Authorized
  return <>{children}</>;
};