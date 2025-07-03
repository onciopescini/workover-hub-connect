
import { useState, useEffect } from 'react';
import { useAuth } from "@/hooks/auth/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { AdminUser } from '@/types/admin-user';

export const useAdminUsers = () => {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { authState } = useAuth();

  const fetchUsers = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('*');

      if (error) {
        console.error('Error fetching users:', error);
        toast.error('Failed to fetch users');
        return;
      }

      if (data) {
        const usersWithParsedData = data.map(user => ({
          ...user,
          competencies: user.competencies ? (Array.isArray(user.competencies) ? user.competencies : JSON.parse(user.competencies)) : [],
          industries: user.industries ? (Array.isArray(user.industries) ? user.industries : JSON.parse(user.industries)) : [],
        })) as AdminUser[];
        setUsers(usersWithParsedData);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Failed to fetch users');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const updateUser = (userId: string, updates: Partial<AdminUser>) => {
    setUsers(users.map(user =>
      user.id === userId ? { ...user, ...updates } : user
    ));
  };

  return {
    users,
    isLoading,
    fetchUsers,
    updateUser
  };
};
