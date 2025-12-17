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
      // Verifica se l'utente è autenticato ma non ha il ruolo richiesto (specificamente 'host')
      // Utilizziamo hasAnyRole su authState.roles che è la fonte di verità corretta (da user_roles)
      if (
        authState.isAuthenticated &&
        authState.user &&
        !hasAnyRole(authState.roles, ['host']) && // Controlla se manca il ruolo 'host'
        requiredRoles.includes('host') &&
        !isFixingRole
      ) {
        // CHECK PERSISTENCE: If we already tried to fix this session/user, ABORT.
        // This prevents infinite loops if the fix fails or if the role update doesn't reflect immediately.
        const ATTEMPT_KEY = 'role_auto_fix_attempted';
        const hasAttempted = sessionStorage.getItem(ATTEMPT_KEY);

        if (hasAttempted === 'true') {
          console.warn("Self-healing: Previously failed or stuck. Aborting and signing out to prevent loop.");
          await supabase.auth.signOut();
          window.location.href = '/login?error=role_missing';
          return;
        }

        // Mark as attempted BEFORE trying (Optimistic lock against reloads)
        sessionStorage.setItem(ATTEMPT_KEY, 'true');

        setIsFixingRole(true);
        console.log("Self-healing: User has no 'host' role. Assigning it via user_roles table (One-shot attempt)...");

        try {
          // INSERT into user_roles table instead of updating profiles
          const { error } = await supabase
            .from('user_roles')
            .insert({
              user_id: authState.user.id,
              role: 'host'
            });

          if (error) {
            // Check for duplicate key violation (code 23505) which means role already exists
            // In that case we can proceed to refresh. Otherwise throw.
            if (error.code !== '23505') {
              throw error;
            }
            console.warn("Self-healing: Role already existed (race condition?), proceeding to refresh.");
          }

          console.log("Self-healing: Role assigned successfully. Refreshing profile...");
          // Aggiorna lo stato locale per riflettere il cambiamento
          await refreshProfile();
          // Note: We do NOT clear sessionStorage here. "One-shot" means one shot.
          // If successful, the role check won't match next time, so the flag doesn't matter.

        } catch (err) {
          console.error("Self-healing failed:", err);
          // CRITICAL: Force logout and redirect on failure. DO NOT RETRY.
          await supabase.auth.signOut();
          window.location.href = '/login?error=role_missing';
        } finally {
          setIsFixingRole(false);
        }
      }
    };

    checkAndFixRole();
  }, [authState.isAuthenticated, authState.roles, requiredRoles, refreshProfile, isFixingRole, authState.user]);

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
