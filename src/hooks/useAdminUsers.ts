
import { useState, useEffect } from 'react';
import { useAuth } from "@/hooks/auth/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { AdminUserWithRoles } from '@/types/admin-user';
import { sreLogger } from '@/lib/sre-logger';

export const useAdminUsers = () => {
  const [users, setUsers] = useState<AdminUserWithRoles[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { authState } = useAuth();

  const fetchUsers = async () => {
    try {
      setIsLoading(true);
      
      // Fetch profiles
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('*');

      if (profilesError) {
        sreLogger.error('Error fetching users', {}, profilesError);
        toast.error('Failed to fetch users');
        return;
      }

      // Fetch user_roles
      const { data: rolesData, error: rolesError } = await supabase
        .from('user_roles' as any)
        .select('*');

      if (rolesError) {
        sreLogger.error('Error fetching user roles', {}, rolesError);
        // Non blocchiamo l'app se fallisce il fetch dei ruoli
      }

      if (profilesData) {
        // Merge profiles con system_roles and assign role from user_roles
        const usersWithRoles = profilesData.map(profile => {
          const userRoles = (rolesData as any)?.filter((r: any) => r.user_id === profile.id) || [];
          const primaryRole = userRoles[0]?.role || 'coworker';
          
          return {
            ...profile,
            role: primaryRole,
            competencies: profile.competencies ? (Array.isArray(profile.competencies) ? profile.competencies : JSON.parse(profile.competencies)) : [],
            industries: profile.industries ? (Array.isArray(profile.industries) ? profile.industries : JSON.parse(profile.industries)) : [],
            system_roles: userRoles
          };
        }) as AdminUserWithRoles[];
        
        setUsers(usersWithRoles);
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
  }, []);

  const updateUser = (userId: string, updates: Partial<AdminUserWithRoles>) => {
    setUsers(users.map(user =>
      user.id === userId ? { ...user, ...updates } : user
    ));
    // Refresh to get updated roles
    fetchUsers();
  };

  return {
    users,
    isLoading,
    fetchUsers,
    updateUser
  };
};
