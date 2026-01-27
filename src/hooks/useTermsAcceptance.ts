import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/auth/useAuth';
import { sreLogger } from '@/lib/sre-logger';

interface AcceptanceStatus {
  isLoading: boolean;
  needsAcceptance: boolean;
  latestVersion: string | null;
  acceptedVersion: string | null;
}

export const useTermsAcceptance = () => {
  const { authState } = useAuth();
  const [status, setStatus] = useState<AcceptanceStatus>({
    isLoading: true,
    needsAcceptance: false,
    latestVersion: null,
    acceptedVersion: null,
  });

  const checkAcceptance = useCallback(async () => {
    if (!authState.user?.id || !authState.isAuthenticated) {
      setStatus(prev => ({ ...prev, isLoading: false, needsAcceptance: false }));
      return;
    }

    try {
      // 1. Get latest ToS version
      const { data: latestToS, error: tosError } = await supabase
        .from('legal_documents_versions')
        .select('version, effective_date')
        .eq('document_type', 'tos')
        .order('effective_date', { ascending: false })
        .limit(1)
        .single();

      if (tosError || !latestToS) {
        // No ToS defined yet - don't block
        setStatus(prev => ({ ...prev, isLoading: false, needsAcceptance: false }));
        return;
      }

      // 2. Check user's acceptance
      const { data: acceptance } = await supabase
        .from('user_legal_acceptances')
        .select('version, accepted_at')
        .eq('user_id', authState.user.id)
        .eq('document_type', 'tos')
        .order('accepted_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      const needsAcceptance = !acceptance || acceptance.version !== latestToS.version;

      setStatus({
        isLoading: false,
        needsAcceptance,
        latestVersion: latestToS.version,
        acceptedVersion: acceptance?.version || null,
      });

      if (needsAcceptance) {
        sreLogger.info('User needs to accept ToS', {
          component: 'useTermsAcceptance',
          userId: authState.user.id,
          latestVersion: latestToS.version,
          acceptedVersion: acceptance?.version,
        });
      }
    } catch (error) {
      sreLogger.error('Error checking ToS acceptance', {
        component: 'useTermsAcceptance',
      }, error as Error);
      setStatus(prev => ({ ...prev, isLoading: false, needsAcceptance: false }));
    }
  }, [authState.user?.id, authState.isAuthenticated]);

  const acceptTerms = useCallback(async (): Promise<boolean> => {
    if (!authState.user?.id || !status.latestVersion) return false;

    try {
      const { error } = await supabase
        .from('user_legal_acceptances')
        .insert({
          user_id: authState.user.id,
          document_type: 'tos',
          version: status.latestVersion,
        });

      if (error) {
        sreLogger.error('Error accepting ToS', {
          component: 'useTermsAcceptance',
        }, error as Error);
        return false;
      }

      setStatus(prev => ({
        ...prev,
        needsAcceptance: false,
        acceptedVersion: status.latestVersion,
      }));

      return true;
    } catch (error) {
      sreLogger.error('Exception accepting ToS', {
        component: 'useTermsAcceptance',
      }, error as Error);
      return false;
    }
  }, [authState.user?.id, status.latestVersion]);

  useEffect(() => {
    checkAcceptance();
  }, [checkAcceptance]);

  return {
    ...status,
    acceptTerms,
    refreshStatus: checkAcceptance,
  };
};
