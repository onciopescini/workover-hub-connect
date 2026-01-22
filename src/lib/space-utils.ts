import { supabase } from "@/integrations/supabase/client";
import { sreLogger } from '@/lib/sre-logger';

export const getHostSpaces = async (hostId: string) => {
  const { data, error } = await supabase
    .from('spaces')
    .select('id, title:name, address, max_capacity')
    .eq('host_id', hostId)
    .eq('published', true)
    .eq('published', true); // Note: is_suspended check removed as it's not in workspaces schema, relying on published for now

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
