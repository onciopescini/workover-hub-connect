import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { queryKeys } from '@/lib/react-query-config';
import type { Profile } from '@/types/auth';

interface UseCurrentProfileOptions {
  userId: string | null;
  initialProfile?: Profile | null;
}

const fetchCurrentProfile = async (userId: string): Promise<Profile | null> => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
};

export const useCurrentProfile = ({ userId, initialProfile = null }: UseCurrentProfileOptions) => {
  return useQuery({
    queryKey: queryKeys.profile.all,
    queryFn: () => fetchCurrentProfile(userId ?? ''),
    enabled: Boolean(userId),
    initialData: initialProfile,
    staleTime: 0,
  });
};
