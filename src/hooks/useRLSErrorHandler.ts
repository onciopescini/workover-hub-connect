import { toast } from "sonner";
import { handleRLSError } from "@/lib/rls-error-handler";

/**
 * Hook to handle RLS errors with user-friendly messages
 * Updated for Fix B.4 - integrates with centralized error handler
 */
export const useRLSErrorHandler = () => {
  const handleError = (error: any): boolean => {
    const result = handleRLSError(error);
    
    if (result.isRLSError && result.shouldShowToast) {
      toast.error('Accesso negato', {
        description: result.userMessage,
        duration: 5000,
      });
      return true;
    }

    return false; // Not an RLS/auth error
  };

  return { handleError };
};
