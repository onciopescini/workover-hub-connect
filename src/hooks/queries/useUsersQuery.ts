
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getAllUsers, suspendUser, reactivateUser, createWarning, getUserWarnings } from "@/lib/admin-utils";
import { AdminProfile, AdminWarning } from "@/types/admin";
import { toast } from "sonner";
import { logger } from "@/lib/logger";
import { sreLogger } from '@/lib/sre-logger';

// Query Keys
export const userKeys = {
  all: ['users'] as const,
  lists: () => [...userKeys.all, 'list'] as const,
  list: (filters?: UserFilters) => [...userKeys.lists(), filters] as const,
  warnings: (userId: string) => [...userKeys.all, 'warnings', userId] as const,
};

export interface UserFilters {
  searchTerm?: string;
  role?: string;
  status?: string;
}

// Fetch users function
const fetchUsers = async (): Promise<AdminProfile[]> => {
  logger.debug("Fetching users with React Query", { component: 'useUsersQuery' });
  const users = await getAllUsers();
  logger.debug("Fetched users", { component: 'useUsersQuery', count: users.length });
  return users;
};

// Fetch user warnings function
const fetchUserWarnings = async (userId: string): Promise<AdminWarning[]> => {
  return await getUserWarnings(userId);
};

// Main users query hook
export const useUsersQuery = () => {
  return useQuery({
    queryKey: userKeys.list(),
    queryFn: fetchUsers,
    staleTime: 60000, // 1 minute
    refetchOnWindowFocus: false,
  });
};

// User warnings query hook
export const useUserWarningsQuery = (userId: string) => {
  return useQuery({
    queryKey: userKeys.warnings(userId),
    queryFn: () => fetchUserWarnings(userId),
    enabled: !!userId,
    staleTime: 30000, // 30 seconds
  });
};

// Suspend user mutation
export const useSuspendUserMutation = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ userId, reason }: { userId: string; reason: string }) => {
      await suspendUser(userId, reason);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.all });
      toast.success("Utente sospeso con successo");
    },
    onError: (error) => {
      sreLogger.error("Error suspending user", {}, error as Error);
      toast.error("Errore nella sospensione dell'utente");
    },
  });
};

// Reactivate user mutation
export const useReactivateUserMutation = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (userId: string) => {
      await reactivateUser(userId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.all });
      toast.success("Utente riattivato con successo");
    },
    onError: (error) => {
      sreLogger.error("Error reactivating user", {}, error as Error);
      toast.error("Errore nella riattivazione dell'utente");
    },
  });
};

// Create warning mutation
export const useCreateWarningMutation = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (warningData: {
      user_id: string;
      admin_id: string;
      warning_type: string;
      title: string;
      message: string;
      severity: string;
      is_active: boolean;
    }) => {
      await createWarning(warningData);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: userKeys.warnings(variables.user_id) });
      toast.success("Warning inviato con successo");
    },
    onError: (error) => {
      sreLogger.error("Error creating warning", {}, error as Error);
      toast.error("Errore nell'invio del warning");
    },
  });
};
