import { useState, useEffect } from "react";
import { getAllSpaces } from "@/lib/admin/admin-space-utils";
import { AdminSpace } from "@/types/admin";
import { toast } from "sonner";

export function useAdminSpaces() {
  const [spaces, setSpaces] = useState<AdminSpace[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchSpaces = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const data = await getAllSpaces();
      setSpaces(data);
    } catch (err) {
      const error = err as Error;
      setError(error);
      toast.error("Errore nel caricamento degli spazi");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSpaces();
  }, []);

  return {
    spaces,
    isLoading,
    error,
    refetch: fetchSpaces
  };
}
