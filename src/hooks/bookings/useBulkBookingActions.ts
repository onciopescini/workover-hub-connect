
import { toast } from "sonner";
import { useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/auth/useAuth";
import { useRoleAccess } from '@/hooks/useRoleAccess';
import { sreLogger } from '@/lib/sre-logger';

type BulkResult = {
  success: string[];
  failed: { id: string; error: string }[];
};

export const useBulkBookingActions = (opts?: { onAfterEach?: () => void; onAfterAll?: () => void }) => {
  const { hasAnyRole } = useRoleAccess();
  const [loading, setLoading] = useState(false);

  const canActAsHost = useMemo(() => {
    return hasAnyRole(['host', 'admin']);
  }, [hasAnyRole]);

  const confirmMultiple = async (bookingIds: string[]): Promise<BulkResult> => {
    if (!canActAsHost) {
      toast.error("Azione non consentita", { description: "Solo gli host possono confermare prenotazioni." });
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
        sreLogger.error('Error confirming bookings', {
          component: 'useBulkBookingActions',
          action: 'confirm_multiple',
          bookingCount: bookingIds.length
        }, error instanceof Error ? error : new Error(String(error)));
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
      sreLogger.error('Bulk confirm error', {
        component: 'useBulkBookingActions',
        action: 'confirm_multiple'
      }, error instanceof Error ? error : new Error(String(error)));
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
    const { authState } = useAuth();
    if (!authState.user?.id) {
      toast.error("Non autenticato", { description: "Accedi per continuare." });
      return { success: [], failed: bookingIds.map(id => ({ id, error: "not_authenticated" })) };
    }
    setLoading(true);
    const success: string[] = [];
    const failed: { id: string; error: string }[] = [];

    try {
      // OPTIMIZED: Batch fetch booking details first (single query)
      const { data: bookings, error: fetchError } = await supabase
        .from("bookings")
        .select("id, user_id, space_id")
        .in("id", bookingIds);

      if (fetchError || !bookings) {
        bookingIds.forEach(id => failed.push({ id, error: fetchError?.message || "fetch_failed" }));
        setLoading(false);
        opts?.onAfterAll?.();
        return { success, failed };
      }
      
      // Fetch spaces separately to get host_id
      const spaceIds = [...new Set(bookings.map(b => b.space_id))];
      const { data: spaces } = await supabase
        .from("spaces")
        .select("id, host_id")
        .in("id", spaceIds);
      
      const spacesMap = new Map(spaces?.map(s => [s.id, s]) || []);

      // Process cancellations in parallel
      const results = await Promise.allSettled(
        bookings.map(async (booking) => {
          const space = spacesMap.get(booking.space_id);
          const payload = {
            booking_id: booking.id,
            cancelled_by_host: space?.host_id === authState.user?.id,
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
      sreLogger.error('Bulk cancel error', {
        component: 'useBulkBookingActions',
        action: 'cancel_multiple'
      }, error instanceof Error ? error : new Error(String(error)));
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
    const { authState } = useAuth();
    if (!authState.user?.id) {
      toast.error("Non autenticato", { description: "Accedi per continuare." });
      return { success: [], failed: bookingIds.map(id => ({ id, error: "not_authenticated" })) };
    }
    if (!content || content.trim().length === 0) {
      toast.error("Messaggio vuoto", { description: "Inserisci un contenuto per il messaggio." });
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

