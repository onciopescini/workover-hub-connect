
import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/lib/logger";

interface RealtimeBookingsSyncProps {
  onChange: () => void;
}

export const RealtimeBookingsSync = ({ onChange }: RealtimeBookingsSyncProps) => {
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;

  useEffect(() => {
    const setupChannel = () => {
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
          logger.error("Realtime connection error", { 
            component: "RealtimeBookingsSync"
          }, error instanceof Error ? error : undefined);
          
          if (reconnectAttemptsRef.current < maxReconnectAttempts) {
            reconnectAttemptsRef.current++;
            const delay = 2000 * reconnectAttemptsRef.current;
            logger.info(`Attempting reconnection in ${delay}ms`, { 
              component: "RealtimeBookingsSync"
            });
            setTimeout(() => {
              supabase.removeChannel(channel);
              setupChannel();
            }, delay);
          }
        })
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            reconnectAttemptsRef.current = 0;
            logger.info("Realtime connection established", { 
              component: "RealtimeBookingsSync" 
            });
          }
        });

      return channel;
    };

    const channel = setupChannel();
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, [onChange]);

  return null;
};

export default RealtimeBookingsSync;
