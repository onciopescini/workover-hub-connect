
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { sreLogger } from '@/lib/sre-logger';

// Interfacce per le risposte delle funzioni database
interface SuspendSpaceResponse {
  success: boolean;
  error?: string;
  message?: string;
  cancelled_bookings?: number;
}

interface RevisionResponse {
  success: boolean;
  error?: string;
  message?: string;
}

export const suspendSpaceWithBookings = async (
  spaceId: string,
  suspensionReason: string
): Promise<boolean> => {
  try {
    const { data: user } = await supabase.auth.getUser();
    if (!user?.user) {
      toast.error("Utente non autenticato");
      return false;
    }

    const { data, error } = await supabase.rpc('suspend_space_with_bookings', {
      space_id: spaceId,
      admin_id: user.user.id,
      suspension_reason: suspensionReason
    });

    if (error) {
      sreLogger.error('Error suspending space', { error, spaceId, suspensionReason });
      toast.error("Errore nella sospensione dello spazio");
      return false;
    }

    const response = data as unknown as SuspendSpaceResponse;
    if (response?.success) {
      toast.success(`Spazio sospeso con successo. ${response.cancelled_bookings || 0} prenotazioni cancellate.`);
      return true;
    } else {
      toast.error(response?.error || "Errore nella sospensione dello spazio");
      return false;
    }
  } catch (error) {
    sreLogger.error('Error in suspendSpaceWithBookings', { error, spaceId, suspensionReason });
    toast.error("Errore nella sospensione dello spazio");
    return false;
  }
};

export const requestSpaceRevision = async (
  spaceId: string,
  revisionNotes: string
): Promise<boolean> => {
  try {
    const { data: user } = await supabase.auth.getUser();
    if (!user?.user) {
      toast.error("Utente non autenticato");
      return false;
    }

    const { data, error } = await supabase.rpc('request_space_revision', {
      space_id: spaceId,
      host_id: user.user.id,
      revision_notes: revisionNotes
    });

    if (error) {
      sreLogger.error('Error requesting revision', { error, spaceId, revisionNotes });
      toast.error("Errore nella richiesta di revisione");
      return false;
    }

    const response = data as unknown as RevisionResponse;
    if (response?.success) {
      toast.success("Richiesta di revisione inviata con successo");
      return true;
    } else {
      toast.error(response?.error || "Errore nella richiesta di revisione");
      return false;
    }
  } catch (error) {
    sreLogger.error('Error in requestSpaceRevision', { error, spaceId, revisionNotes });
    toast.error("Errore nella richiesta di revisione");
    return false;
  }
};

export const reviewSpaceRevision = async (
  spaceId: string,
  approved: boolean,
  adminNotes?: string
): Promise<boolean> => {
  try {
    const { data: user } = await supabase.auth.getUser();
    if (!user?.user) {
      toast.error("Utente non autenticato");
      return false;
    }

    const rpcParams: any = {
      space_id: spaceId,
      admin_id: user.user.id,
      approved
    };
    
    if (adminNotes) {
      rpcParams.admin_notes = adminNotes;
    }
    
    const { data, error } = await supabase.rpc('review_space_revision', rpcParams);

    if (error) {
      sreLogger.error('Error reviewing revision', { error, spaceId, approved, adminNotes });
      toast.error("Errore nella revisione");
      return false;
    }

    const response = data as unknown as RevisionResponse;
    if (response?.success) {
      toast.success(approved ? "Revisione approvata" : "Revisione rifiutata");
      return true;
    } else {
      toast.error(response?.error || "Errore nella revisione");
      return false;
    }
  } catch (error) {
    sreLogger.error('Error in reviewSpaceRevision', { error, spaceId, approved, adminNotes });
    toast.error("Errore nella revisione");
    return false;
  }
};

export const checkSpaceCreationRestriction = async (): Promise<boolean> => {
  try {
    const { data: user } = await supabase.auth.getUser();
    if (!user?.user) return false;

    const { data: profile } = await supabase
      .from('profiles')
      .select('space_creation_restricted, restriction_reason')
      .eq('id', user.user.id)
      .single();

    if (profile?.space_creation_restricted) {
      toast.error(`Creazione spazi limitata: ${profile.restriction_reason}`);
      return true;
    }

    return false;
  } catch (error) {
    sreLogger.error('Error checking space creation restriction', { error });
    return false;
  }
};
