import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Info, AlertCircle, XCircle } from "lucide-react";
import { createWarning, getUserWarnings } from "@/lib/admin/admin-warning-utils";
import { AdminWarning } from "@/types/admin";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface UserWarningsPanelProps {
  userId: string;
  onWarningCreated: () => void;
}

const severityIcons = {
  low: Info,
  medium: AlertCircle,
  high: AlertTriangle,
  critical: XCircle
};

const severityColors = {
  low: "bg-blue-500/10 text-blue-700",
  medium: "bg-yellow-500/10 text-yellow-700",
  high: "bg-orange-500/10 text-orange-700",
  critical: "bg-red-500/10 text-red-700"
};

export const UserWarningsPanel: React.FC<UserWarningsPanelProps> = ({
  userId,
  onWarningCreated
}) => {
  const [isCreating, setIsCreating] = useState(false);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [severity, setSeverity] = useState<'low' | 'medium' | 'high' | 'critical'>('medium');
  const [warningType, setWarningType] = useState('general');

  const { data: warnings, isLoading, refetch } = useQuery({
    queryKey: ['user-warnings', userId],
    queryFn: () => getUserWarnings(userId)
  });

  const { data: adminData } = useQuery({
    queryKey: ['current-admin'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    }
  });

  const handleCreateWarning = async () => {
    if (!title || !message || !adminData?.id) return;

    try {
      await createWarning({
        user_id: userId,
        admin_id: adminData.id,
        title,
        message,
        severity,
        warning_type: warningType,
        is_active: true
      });

      setTitle('');
      setMessage('');
      setSeverity('medium');
      setWarningType('general');
      setIsCreating(false);
      refetch();
      onWarningCreated();
    } catch (error) {
      console.error('Error creating warning:', error);
    }
  };

  if (isLoading) {
    return <div className="text-center py-4">Caricamento warnings...</div>;
  }

  return (
    <div className="space-y-4">
      {!isCreating ? (
        <Button onClick={() => setIsCreating(true)} className="w-full">
          Aggiungi Warning
        </Button>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Nuovo Warning</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Titolo</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Titolo del warning"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="message">Messaggio</Label>
              <Textarea
                id="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Descrizione dettagliata del warning"
                rows={4}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="severity">Gravità</Label>
                <Select value={severity} onValueChange={(v: any) => setSeverity(v)}>
                  <SelectTrigger id="severity">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Bassa</SelectItem>
                    <SelectItem value="medium">Media</SelectItem>
                    <SelectItem value="high">Alta</SelectItem>
                    <SelectItem value="critical">Critica</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="type">Tipo</Label>
                <Select value={warningType} onValueChange={setWarningType}>
                  <SelectTrigger id="type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">Generale</SelectItem>
                    <SelectItem value="behavior">Comportamento</SelectItem>
                    <SelectItem value="content">Contenuto</SelectItem>
                    <SelectItem value="payment">Pagamento</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex gap-2">
              <Button onClick={handleCreateWarning} className="flex-1">
                Crea Warning
              </Button>
              <Button variant="outline" onClick={() => setIsCreating(false)}>
                Annulla
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {warnings && warnings.length > 0 ? (
          warnings.map((warning) => {
            const Icon = severityIcons[warning.severity as keyof typeof severityIcons];
            return (
              <Card key={warning.id}>
                <CardContent className="pt-4">
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg ${severityColors[warning.severity as keyof typeof severityColors]}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium">{warning.title}</h4>
                        <Badge variant="outline" className="text-xs">
                          {warning.warning_type}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{warning.message}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(warning.created_at || '').toLocaleString()}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            Nessun warning presente
          </div>
        )}
      </div>
    </div>
  );
};
