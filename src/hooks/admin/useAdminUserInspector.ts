import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { queryKeys } from '@/lib/react-query-config';
import { ADMIN_RPC } from '@/constants';
import { AdminUserInspectorDetail } from '@/types/admin-user-inspector';

export const useAdminUserInspector = (userId: string) => {
  return useQuery({
    queryKey: queryKeys.admin.userInspector(userId),
    enabled: userId.length > 0,
    queryFn: async (): Promise<AdminUserInspectorDetail> => {
      const { data, error } = await supabase.rpc(ADMIN_RPC.GET_USER_INSPECTOR_DETAIL, {
        target_user_id: userId,
      });

      if (error) {
        throw error;
      }

      if (!data) {
        throw new Error('Inspector detail not found');
      }

      return data as unknown as AdminUserInspectorDetail;
    },
  });
};
