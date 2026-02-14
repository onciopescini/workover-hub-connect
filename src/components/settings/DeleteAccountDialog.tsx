import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { Trash2 } from 'lucide-react';
import type { GDPRRequestInstant } from '@/types/gdpr';

const GDPR_DELETION_REQUEST_TYPE: GDPRRequestInstant['request_type'] = 'data_deletion';

export const DeleteAccountDialog = () => {
  const navigate = useNavigate();
  const [confirmText, setConfirmText] = useState('');
  const [acknowledged, setAcknowledged] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const handleDelete = async () => {
    if (confirmText !== 'ELIMINA' || !acknowledged) {
      toast.error('Devi confermare la cancellazione');
      return;
    }
    
    setIsDeleting(true);
    
    try {
      // Crea richiesta GDPR di cancellazione
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.user) throw new Error('Sessione non valida');
      
      const { error: gdprError } = await supabase
        .from('gdpr_requests')
        .insert({
          user_id: session.session.user.id,
          request_type: GDPR_DELETION_REQUEST_TYPE,
          status: 'pending'
        });
      
      if (gdprError) throw gdprError;
      
      // Logout immediato
      await supabase.auth.signOut();
      
      toast.success('Richiesta di cancellazione inviata. Riceverai conferma via email entro 30 giorni.');
      navigate('/');
    } catch (error) {
      toast.error('Errore durante la richiesta di cancellazione');
      console.error(error);
    } finally {
      setIsDeleting(false);
    }
  };
  
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="destructive" className="w-full">
          <Trash2 className="mr-2 h-4 w-4" />
          Elimina Account
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Eliminare il tuo account?</AlertDialogTitle>
          <AlertDialogDescription className="space-y-4">
            <p className="text-destructive font-semibold">
              Questa azione è irreversibile. Tutti i tuoi dati saranno eliminati entro 30 giorni.
            </p>
            
            <div className="space-y-2">
              <p className="font-medium">Cosa verrà eliminato:</p>
              <ul className="list-disc pl-5 space-y-1 text-sm">
                <li>Profilo personale e professionale</li>
                <li>Prenotazioni e cronologia</li>
                <li>Messaggi e conversazioni</li>
                <li>Spazi pubblicati (se host)</li>
                <li>Connessioni e networking</li>
              </ul>
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox
                id="acknowledge"
                checked={acknowledged}
                onCheckedChange={(checked) => setAcknowledged(checked as boolean)}
              />
              <Label htmlFor="acknowledge" className="text-sm cursor-pointer">
                Comprendo che questa azione è irreversibile
              </Label>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="confirm">Digita <strong>ELIMINA</strong> per confermare</Label>
              <Input
                id="confirm"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="ELIMINA"
              />
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Annulla</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={confirmText !== 'ELIMINA' || !acknowledged || isDeleting}
            className="bg-destructive hover:bg-destructive/90"
          >
            {isDeleting ? 'Eliminazione...' : 'Elimina Account'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
