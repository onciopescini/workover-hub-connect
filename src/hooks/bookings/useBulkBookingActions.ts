
import { useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/auth/useAuth";

type BulkResult = {
  success: string[];
  failed: { id: string; error: string }[];
};

export const useBulkBookingActions = (opts?: { onAfterEach?: () => void; onAfterAll?: () => void }) => {
  const { toast } = useToast();
  const { authState } = useAuth();
  const [loading, setLoading] = useState(false);

  const canActAsHost = useMemo(() => {
    return authState.profile?.role === "host" || authState.profile?.role === "admin";
  }, [authState.profile?.role]);

  const confirmMultiple = async (bookingIds: string[]): Promise<BulkResult> => {
    if (!canActAsHost) {
      toast({ title: "Azione non consentita", description: "Solo gli host possono confermare prenotazioni.", variant: "destructive" });
      return { success: [], failed: bookingIds.map(id => ({ id, error: "not_allowed" })) };
    }
    setLoading(true);
    const success: string[] = [];
    const failed: { id: string; error: string }[] = [];

    try {
      // OPTIMIZED: Single batch update instead of N queries
      const { data: updatedBookings, error } = await supabase
        .from("bookings")
        .update({ status: "confirmed" })
        .in("id", bookingIds)
        .eq("status", "pending")
        .select("id");

      if (error) {
        console.error("Error confirming bookings:", error);
        bookingIds.forEach(id => failed.push({ id, error: error.message }));
      } else {
        const confirmedIds = updatedBookings?.map(b => b.id) || [];
        success.push(...confirmedIds);
        
        // Mark failed bookings
        bookingIds.forEach(id => {
          if (!confirmedIds.includes(id)) {
            failed.push({ id, error: "not_confirmed" });
          }
        });
        
        success.forEach(() => opts?.onAfterEach?.());
      }
    } catch (error: any) {
      console.error("Bulk confirm error:", error);
      bookingIds.forEach(id => failed.push({ id, error: error.message }));
    }

    setLoading(false);
    if (failed.length === 0) {
      toast({ title: "Prenotazioni confermate", description: `Confermate ${success.length} prenotazioni.` });
    } else {
      toast({
        title: "Conferma parziale",
        description: `Confermate ${success.length}, fallite ${failed.length}.`,
        variant: "destructive",
      });
    }
    opts?.onAfterAll?.();
    return { success, failed };
  };

  const cancelMultiple = async (bookingIds: string[], reason: string): Promise<BulkResult> => {
    if (!authState.user?.id) {
      toast({ title: "Non autenticato", description: "Accedi per continuare.", variant: "destructive" });
      return { success: [], failed: bookingIds.map(id => ({ id, error: "not_authenticated" })) };
    }
    setLoading(true);
    const success: string[] = [];
    const failed: { id: string; error: string }[] = [];

    try {
      // OPTIMIZED: Batch fetch booking details first (single query)
      const { data: bookings, error: fetchError } = await supabase
        .from("bookings")
        .select("id, user_id, space_id, spaces!inner(host_id)")
        .in("id", bookingIds);

      if (fetchError || !bookings) {
        bookingIds.forEach(id => failed.push({ id, error: fetchError?.message || "fetch_failed" }));
        setLoading(false);
        opts?.onAfterAll?.();
        return { success, failed };
      }

      // Process cancellations in parallel
      const results = await Promise.allSettled(
        bookings.map(async (booking) => {
          const payload = {
            booking_id: booking.id,
            cancelled_by_host: booking.spaces.host_id === authState.user?.id,
            ...(reason ? { reason } : {}),
          };
          
          const { data, error } = await supabase.rpc("cancel_booking", payload);
          const result = data as { success?: boolean; error?: string } | null;
          
          if (error || (result && result.success === false)) {
            throw new Error(error?.message || result?.error || "cancel_failed");
          }
          
          return booking.id;
        })
      );

      results.forEach((result, idx) => {
        const booking = bookings[idx];
        if (!booking) return;
        
        if (result.status === "fulfilled") {
          success.push(booking.id);
          opts?.onAfterEach?.();
        } else {
          failed.push({ id: booking.id, error: result.reason?.message || "unknown_error" });
        }
      });
    } catch (error: any) {
      console.error("Bulk cancel error:", error);
      bookingIds.forEach(id => failed.push({ id, error: error.message }));
    }

    setLoading(false);
    if (failed.length === 0) {
      toast({ title: "Prenotazioni annullate", description: `Annullate ${success.length} prenotazioni.` });
    } else {
      toast({
        title: "Annullamento parziale",
        description: `Annullate ${success.length}, fallite ${failed.length}.`,
        variant: "destructive",
      });
    }
    opts?.onAfterAll?.();
    return { success, failed };
  };

  const groupMessage = async (bookingIds: string[], content: string): Promise<BulkResult> => {
    if (!authState.user?.id) {
      toast({ title: "Non autenticato", description: "Accedi per continuare.", variant: "destructive" });
      return { success: [], failed: bookingIds.map(id => ({ id, error: "not_authenticated" })) };
    }
    if (!content || content.trim().length === 0) {
      toast({ title: "Messaggio vuoto", description: "Inserisci un contenuto per il messaggio.", variant: "destructive" });
      return { success: [], failed: bookingIds.map(id => ({ id, error: "empty_content" })) };
    }

    setLoading(true);
    const success: string[] = [];
    const failed: { id: string; error: string }[] = [];

    for (const id of bookingIds) {
      const { error } = await supabase.from("messages").insert({
        booking_id: id,
        sender_id: authState.user.id,
        content,
        attachments: [],
      });

      if (error) {
        failed.push({ id, error: error.message });
      } else {
        success.push(id);
      }
      opts?.onAfterEach?.();
    }

    setLoading(false);
    if (failed.length === 0) {
      toast({ title: "Messaggi inviati", description: `Inviati ${success.length} messaggi.` });
    } else {
      toast({
        title: "Invio parziale",
        description: `Inviati ${success.length}, falliti ${failed.length}.`,
        variant: "destructive",
      });
    }
    opts?.onAfterAll?.();
    return { success, failed };
  };

  return {
    loading,
    confirmMultiple,
    cancelMultiple,
    groupMessage,
  };
};

