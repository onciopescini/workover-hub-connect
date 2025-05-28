
import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { BookingWithDetails } from "@/types/booking";
import { useRequestManager } from "./useRequestManager";
import { 
  fetchCoworkerBookings, 
  fetchHostBookings, 
  combineAndDeduplicateBookings 
} from "@/utils/bookingDataUtils";

export const useBookings = () => {
  const { authState } = useAuth();
  const [bookings, setBookings] = useState<BookingWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const { canFetch, startFetch, endFetch, cleanup, debounce, isAborted } = useRequestManager();

  const fetchBookings = useCallback(async () => {
    if (!authState.user) {
      setIsLoading(false);
      setBookings([]);
      setError(null);
      return;
    }

    // Controllo se possiamo fare il fetch
    if (!canFetch()) {
      return;
    }

    setError(null);
    const signal = startFetch();

    try {
      // Fetch delle prenotazioni come coworker
      const coworkerBookings = await fetchCoworkerBookings(authState.user.id, signal);
      
      if (signal.aborted) return;

      // Fetch delle prenotazioni come host (se applicabile)
      let hostBookings: BookingWithDetails[] = [];
      if (authState.profile?.role === "host" || authState.profile?.role === "admin") {
        hostBookings = await fetchHostBookings(authState.user.id, signal);
      }

      if (signal.aborted) return;

      // Combina e deduplica i risultati
      const uniqueBookings = combineAndDeduplicateBookings(coworkerBookings, hostBookings);
      setBookings(uniqueBookings);

    } catch (error: any) {
      if (isAborted(error)) {
        console.log('Fetch was aborted');
        return;
      }
      
      console.error("Error fetching bookings:", error);
      const errorMessage = error.message || "Errore nel caricamento delle prenotazioni";
      setError(errorMessage);
      
      if (!error.message?.includes('aborted')) {
        toast.error(errorMessage);
      }
    } finally {
      setIsLoading(false);
      endFetch();
    }
  }, []); // Nessuna dipendenza per evitare il loop

  useEffect(() => {
    // Se non c'è utente, resetta lo stato
    if (!authState.user) {
      setBookings([]);
      setIsLoading(false);
      setError(null);
      return;
    }

    // Se l'autenticazione è ancora in caricamento, aspetta
    if (authState.isLoading) {
      return;
    }

    // Solo se abbiamo un utente autenticato e il profilo è caricato
    if (authState.user && !authState.isLoading) {
      debounce(() => {
        fetchBookings();
      }, 1000);
    }

    return cleanup;
  }, [authState.user?.id, authState.isLoading]);

  return { 
    bookings, 
    setBookings, 
    isLoading,
    error,
    refetch: fetchBookings
  };
};
