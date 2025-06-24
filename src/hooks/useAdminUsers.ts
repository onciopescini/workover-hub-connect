
import { useState, useEffect } from 'react';
import { useAuth } from "@/contexts/OptimizedAuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface User {
  id: string;
  first_name: string;
  last_name: string;
  role: string;
  profile_photo_url: string | null;
  created_at: string;
  updated_at: string;
  last_login_at: string | null;
  phone: string | null;
  city: string | null;
  profession: string | null;
  competencies: string[] | null;
  industries: string[] | null;
  is_suspended: boolean;
  suspension_reason: string | null;
}

export const useAdminUsers = () => {
  const [users, setUsers] = useState<User[]>([]);
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
        })) as User[];
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

  const updateUser = (userId: string, updates: Partial<User>) => {
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
