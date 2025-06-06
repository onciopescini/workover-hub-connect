
import { supabase } from "@/integrations/supabase/client";

export const getHostSpaces = async (hostId: string) => {
  const { data, error } = await supabase
    .from('spaces')
    .select('id, title, address, max_capacity')
    .eq('host_id', hostId)
    .eq('published', true)
    .eq('is_suspended', false);

  if (error) {
    console.error('Error fetching host spaces:', error);
    throw error;
  }

  return data || [];
};
