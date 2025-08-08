
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface RealtimeBookingsSyncProps {
  onChange: () => void;
}

export const RealtimeBookingsSync = ({ onChange }: RealtimeBookingsSyncProps) => {
  useEffect(() => {
    const channel = supabase
      .channel("schema-db-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "bookings" },
        (_payload) => {
          console.log("[Realtime] Booking change detected:", _payload.eventType, _payload.new, _payload.old);
          onChange();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [onChange]);

  return null;
};

export default RealtimeBookingsSync;
