
import { supabase } from "@/integrations/supabase/client";

export const getHostSpaces = async (hostId: string) => {
  console.log('🔍 Fetching spaces for host:', hostId);
  
  const { data, error } = await supabase
    .from('spaces')
    .select('*')
    .eq('host_id', hostId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('❌ Error fetching host spaces:', error);
    throw error;
  }

  console.log('✅ Found', data?.length || 0, 'spaces for host');
  return data || [];
};

export const getUserRole = (authState: any): "host" | "coworker" | "admin" | null => {
  if (!authState?.profile?.role) return null;
  return authState.profile.role;
};

export const canAccessHostFeatures = (authState: any): boolean => {
  const role = getUserRole(authState);
  return role === 'host' || role === 'admin';
};
