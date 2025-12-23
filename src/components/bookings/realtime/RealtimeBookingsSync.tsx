
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/lib/logger";
import { useAuth } from "@/hooks/auth/useAuth";

interface RealtimeBookingsSyncProps {
  onChange: () => void;
}

export const RealtimeBookingsSync = ({ onChange }: RealtimeBookingsSyncProps) => {
  const { authState } = useAuth();

  useEffect(() => {
    // Non avviare la sottoscrizione se l'utente non è autenticato o il profilo non è pronto
    if (!authState.user || !authState.profile) {
      return;
    }

    const channel = supabase
      .channel("schema-db-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "bookings" },
        (payload) => {
          logger.debug("Realtime booking change detected", {
            component: "RealtimeBookingsSync"
          });
          onChange();
        }
      )
      .on("system", { event: "error" }, (error) => {
        // Just log the error, let Supabase client handle reconnection internally
        const safeErrorMessage = typeof error === 'object' ? JSON.stringify(error) : String(error);
        logger.error("Realtime connection error", {
          component: "RealtimeBookingsSync"
        }, new Error(safeErrorMessage));
      })
      .subscribe((status) => {
        if (!status || typeof status !== 'string') {
          return;
        }

        if (status === 'SUBSCRIBED') {
          logger.info("Realtime connection established", {
            component: "RealtimeBookingsSync"
          });
        }
      });
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, [onChange, authState.user, authState.profile]);

  return null;
};

export default RealtimeBookingsSync;
