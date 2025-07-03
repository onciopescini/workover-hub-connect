
import { useState, useEffect, useCallback } from "react";
import { 
  checkProfileAccess, 
  fetchUserProfileWithAccess, 
  getProfileVisibilityLevel, 
  filterProfileData,
  ProfileAccessResult 
} from "@/lib/profile-access-utils";
import { toast } from "sonner";

interface UseProfileAccessProps {
  userId: string;
  autoFetch?: boolean;
}

export const useProfileAccess = ({ userId, autoFetch = true }: UseProfileAccessProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [profile, setProfile] = useState<Record<string, unknown> | null>(null);
  const [accessResult, setAccessResult] = useState<ProfileAccessResult | null>(null);
  const [visibilityLevel, setVisibilityLevel] = useState<'full' | 'limited' | 'none'>('none');
  const [error, setError] = useState<string | null>(null);

  const checkAccess = useCallback(async () => {
    if (!userId) return;
    
    setIsLoading(true);
    setError(null);

    try {
      const result = await checkProfileAccess(userId);
      setAccessResult(result);
      
      const level = getProfileVisibilityLevel(result.access_reason);
      setVisibilityLevel(level);

      if (!result.has_access) {
        setProfile(null);
        if (result.access_reason !== 'not_authenticated') {
          toast.info(result.message);
        }
      }
    } catch (err: unknown) {
      console.error('Error checking profile access:', err);
      setError(err instanceof Error ? err.message : 'Errore nella verifica dell\'accesso');
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  const fetchProfile = useCallback(async () => {
    if (!userId) return;
    
    setIsLoading(true);
    setError(null);

    try {
      const { profile: fetchedProfile, accessResult: result, hasAccess } = await fetchUserProfileWithAccess(userId);
      
      setAccessResult(result);
      const level = getProfileVisibilityLevel(result.access_reason);
      setVisibilityLevel(level);

      if (hasAccess && fetchedProfile) {
        const filteredProfile = filterProfileData(fetchedProfile, level);
        setProfile(filteredProfile);
      } else {
        setProfile(null);
        if (result.access_reason !== 'not_authenticated') {
          toast.info(result.message);
        }
      }
    } catch (err: unknown) {
      console.error('Error fetching profile:', err);
      setError(err instanceof Error ? err.message : 'Errore nel recupero del profilo');
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  const hasAccess = accessResult?.has_access || false;
  const canViewFullProfile = visibilityLevel === 'full';
  const canViewLimitedProfile = visibilityLevel === 'limited';

  useEffect(() => {
    if (autoFetch && userId) {
      fetchProfile();
    }
  }, [autoFetch, userId, fetchProfile]);

  return {
    profile,
    accessResult,
    visibilityLevel,
    isLoading,
    error,
    hasAccess,
    canViewFullProfile,
    canViewLimitedProfile,
    checkAccess,
    fetchProfile,
    refetch: fetchProfile
  };
};
