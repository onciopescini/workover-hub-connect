import { useState, useEffect } from 'react';
import { useAuth } from "@/hooks/auth/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { AdminUserWithRoles } from '@/types/admin-user';
import { sreLogger } from '@/lib/sre-logger';

export interface UseAdminUsersProps {
  page?: number;
  pageSize?: number;
  search?: string;
  activeTab?: string;
}

export const useAdminUsers = ({
  page = 1,
  pageSize = 20,
  search = '',
  activeTab = 'all'
}: UseAdminUsersProps = {}) => {
  const [users, setUsers] = useState<AdminUserWithRoles[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const { authState } = useAuth();

  const fetchUsers = async () => {
    try {
      setIsLoading(true);
      
      // Build query
      let query = supabase
        .from('profiles')
        .select('*', { count: 'exact' });

      // Apply Search
      if (search) {
        // Since we can't easily join email from auth.users (it's not exposed in postgrest usually directly unless in profiles),
        // we assume profiles has email if synched, or we search available fields.
        // The profiles table usually has first_name, last_name.
        // Note: profiles table definition in types shows `email` isn't a column there?
        // Wait, looking at types.ts... `profiles` DOES NOT have email.
        // `admin_users` usually implies we need email.
        // But `AdminUser` type says it has email.
        // Most likely email is not in `profiles` but inferred or in a view `profiles_with_email`?
        // Let's check `UserCard` usage. If `profiles` doesn't have email, we can't search it easily unless using an Edge Function or View.
        // However, standard `profiles` often lacks email.
        // BUT, `useAdminUsers` previously returned `email` in `AdminUser` type.
        // If the previous code was `select('*')` from `profiles`, and `profiles` has no email, then `user.email` was undefined.
        // Let's assume we search first/last name for now.
        query = query.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%`);
      }

      // Apply Tab Filter (Active/Suspended)
      if (activeTab === 'active') {
        query = query.eq('is_suspended', false);
      } else if (activeTab === 'inactive') {
        query = query.eq('is_suspended', true);
      }

      // Apply Pagination
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      query = query
        .order('created_at', { ascending: false })
        .range(from, to);

      const { data: profilesData, error: profilesError, count } = await query;

      if (profilesError) {
        sreLogger.error('Error fetching users', {}, profilesError);
        toast.error('Failed to fetch users');
        return;
      }

      setTotalCount(count || 0);

      if (profilesData && profilesData.length > 0) {
        // Fetch roles ONLY for these users
        const userIds = profilesData.map(p => p.id);
        const { data: rolesData, error: rolesError } = await supabase
          .from('user_roles' as any)
          .select('*')
          .in('user_id', userIds);

        if (rolesError) {
          sreLogger.error('Error fetching user roles', {}, rolesError);
        }

        // Merge profiles con system_roles
        const usersWithRoles = profilesData.map(profile => {
          const userRoles = (rolesData as any)?.filter((r: any) => r.user_id === profile.id) || [];
          const primaryRole = userRoles[0]?.role || 'coworker';
          
          return {
            ...profile,
            email: 'N/A', // Email is not in profiles table, handled by UI usually or specific admin view
            role: primaryRole,
            competencies: profile.competencies ? (Array.isArray(profile.competencies) ? profile.competencies : JSON.parse(profile.competencies as unknown as string)) : [],
            industries: profile.industries ? (Array.isArray(profile.industries) ? profile.industries : JSON.parse(profile.industries as unknown as string)) : [],
            system_roles: userRoles
          };
        }) as AdminUserWithRoles[];
        
        setUsers(usersWithRoles);
      } else {
        setUsers([]);
      }
    } catch (error) {
      sreLogger.error('Error fetching users', {}, error as Error);
      toast.error('Failed to fetch users');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [page, pageSize, search, activeTab]);

  const updateUser = (userId: string, updates: Partial<AdminUserWithRoles>) => {
    setUsers(users.map(user =>
      user.id === userId ? { ...user, ...updates } : user
    ));
    // Ideally we should refetch or invalidate query if using React Query
    // fetchUsers(); // Optional: might reset pagination state if we were stricter
  };

  return {
    users,
    totalCount,
    isLoading,
    fetchUsers,
    updateUser
  };
};
