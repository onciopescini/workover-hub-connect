
import { supabase } from "@/integrations/supabase/client";

export const getHostSpaces = async (hostId: string) => {
  console.log('🔍 getHostSpaces: Fetching ALL spaces for host:', hostId);
  
  try {
    const { data, error } = await supabase
      .from('spaces')
      .select('*')
      .eq('host_id', hostId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Error fetching host spaces:', error);
      throw error;
    }

    console.log('✅ getHostSpaces: Found', data?.length || 0, 'spaces for host');
    console.log('📊 Spaces data:', data?.map(space => ({
      id: space.id,
      title: space.title,
      published: space.published,
      is_suspended: space.is_suspended,
      host_id: space.host_id
    })));
    
    return data || [];
  } catch (error) {
    console.error('❌ getHostSpaces: Exception:', error);
    throw error;
  }
};

export const getUserRole = (authState: any): "host" | "coworker" | "admin" | null => {
  if (!authState?.profile?.role) return null;
  return authState.profile.role;
};

export const canAccessHostFeatures = (authState: any): boolean => {
  const role = getUserRole(authState);
  return role === 'host' || role === 'admin';
};
