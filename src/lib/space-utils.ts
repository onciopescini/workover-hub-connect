import { supabase } from "@/integrations/supabase/client";
import { sreLogger } from '@/lib/sre-logger';

export const getHostSpaces = async (hostId: string) => {
  const { data, error } = await supabase
    .from('spaces')
    .select('id, title, address, max_capacity')
    .eq('host_id', hostId)
    .eq('published', true)
    .eq('is_suspended', false);

  if (error) {
    sreLogger.error('Error fetching host spaces', {
      component: 'SpaceUtils',
      action: 'getHostSpaces',
      hostId
    }, error as Error);
    throw error;
  }

  return data || [];
};
