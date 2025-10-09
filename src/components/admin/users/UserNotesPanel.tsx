import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

interface UserNotesPanelProps {
  userId: string;
  onNotesUpdated: () => void;
}

export const UserNotesPanel: React.FC<UserNotesPanelProps> = ({
  userId,
  onNotesUpdated
}) => {
  const [notes, setNotes] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  const { data: adminNotes, isLoading, refetch } = useQuery({
    queryKey: ['user-admin-notes', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('admin_notes')
        .eq('id', userId)
        .single();

      if (error) throw error;
      setNotes(data?.admin_notes || '');
      return data?.admin_notes || '';
    }
  });

  const handleSaveNotes = async () => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ admin_notes: notes })
        .eq('id', userId);

      if (error) throw error;

      toast.success('Note salvate con successo');
      setIsEditing(false);
      refetch();
      onNotesUpdated();
    } catch (error) {
      console.error('Error saving notes:', error);
      toast.error('Errore nel salvataggio delle note');
    }
  };

  if (isLoading) {
    return <div className="text-center py-4">Caricamento note...</div>;
  }

  return (
    <div className="space-y-4">
      {!isEditing ? (
        <>
          {adminNotes ? (
            <Card>
              <CardContent className="pt-4">
                <p className="text-sm whitespace-pre-wrap">{adminNotes}</p>
              </CardContent>
            </Card>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              Nessuna nota presente
            </div>
          )}
          <Button onClick={() => setIsEditing(true)} className="w-full">
            {adminNotes ? 'Modifica Note' : 'Aggiungi Note'}
          </Button>
        </>
      ) : (
        <div className="space-y-4">
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Inserisci note amministrative su questo utente..."
            rows={8}
            className="resize-none"
          />
          <div className="flex gap-2">
            <Button onClick={handleSaveNotes} className="flex-1">
              Salva Note
            </Button>
            <Button 
              variant="outline" 
              onClick={() => {
                setNotes(adminNotes || '');
                setIsEditing(false);
              }}
            >
              Annulla
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
