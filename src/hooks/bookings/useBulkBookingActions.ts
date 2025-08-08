
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

    for (const id of bookingIds) {
      const { error } = await supabase
        .from("bookings")
        .update({ status: "confirmed" })
        .eq("id", id);

      if (error) {
        failed.push({ id, error: error.message });
      } else {
        success.push(id);
      }
      opts?.onAfterEach?.();
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

    for (const id of bookingIds) {
      const { data, error } = await supabase.rpc("cancel_booking", {
        booking_id: id,
        cancelled_by_host: canActAsHost ? true : false,
        reason: reason || null,
      });

      if (error || (data && data.success === false)) {
        failed.push({ id, error: error?.message || data?.error || "unknown_error" });
      } else {
        success.push(id);
      }
      opts?.onAfterEach?.();
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

