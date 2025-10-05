
import React, { useState, useEffect } from "react";
import { TIME_CONSTANTS } from "@/constants";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertTriangle, Plus, Clock, CheckCircle, Shield, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useLogger } from "@/hooks/useLogger";
import type { DataBreach } from "@/types/gdpr";

export const DataBreachManagement = () => {
  const { error } = useLogger({ context: 'DataBreachManagement' });
  const [breaches, setBreaches] = useState<DataBreach[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [newBreach, setNewBreach] = useState({
    nature_of_breach: "",
    affected_users_count: 0,
    affected_data_types: "",
    severity: "medium",
    containment_measures: "",
    impact_assessment: ""
  });

  useEffect(() => {
    fetchBreaches();
  }, []);

  const fetchBreaches = async () => {
    try {
      const { data, error } = await supabase
        .from('data_breach_log')
        .select('*')
        .order('detected_at', { ascending: false });

      if (error) throw error;
      setBreaches((data || []) as DataBreach[]);
    } catch (fetchError) {
      error("Error fetching breaches", fetchError as Error);
      toast.error("Errore nel caricamento delle violazioni");
    } finally {
      setIsLoading(false);
    }
  };

  const createBreach = async () => {
    try {
      const affectedDataTypesArray = newBreach.affected_data_types
        .split(',')
        .map(type => type.trim())
        .filter(type => type.length > 0);

      const { data, error } = await supabase.rpc('detect_data_breach', {
        breach_nature: newBreach.nature_of_breach,
        affected_count: newBreach.affected_users_count,
        affected_data_types: affectedDataTypesArray,
        breach_severity: newBreach.severity,
        manual_report: true
      } as unknown as any);

      if (error) throw error;

      const result = data as unknown as { success: boolean; error?: string };
      if (!result.success) {
        throw new Error(result.error || 'Failed to create breach report');
      }

      toast.success("Violazione di dati registrata con successo");
      setIsCreateDialogOpen(false);
      setNewBreach({
        nature_of_breach: "",
        affected_users_count: 0,
        affected_data_types: "",
        severity: "medium",
        containment_measures: "",
        impact_assessment: ""
      });
      fetchBreaches();
    } catch (createError) {
      error("Error creating breach", createError as Error, { 
        breachNature: newBreach.nature_of_breach,
        affectedCount: newBreach.affected_users_count,
        severity: newBreach.severity 
      });
      toast.error("Errore nella registrazione della violazione");
    }
  };

  const updateBreachStatus = async (breachId: string, status: string) => {
    try {
      const { error } = await supabase
        .from('data_breach_log')
        .update({ 
          status,
          resolved_at: status === 'closed' ? new Date().toISOString() : null,
          updated_at: new Date().toISOString()
        })
        .eq('id', breachId);

      if (error) throw error;

      toast.success("Stato violazione aggiornato");
      fetchBreaches();
    } catch (updateError) {
      error("Error updating breach status", updateError as Error, { breachId, status });
      toast.error("Errore nell'aggiornamento dello stato");
    }
  };

  const markAuthorityNotified = async (breachId: string) => {
    try {
      const { error } = await supabase
        .from('data_breach_log')
        .update({ 
          authority_notified_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', breachId);

      if (error) throw error;

      toast.success("Notifica alle autorità registrata");
      fetchBreaches();
    } catch (notifyError) {
      error("Error marking authority notified", notifyError as Error, { breachId });
      toast.error("Errore nella registrazione della notifica");
    }
  };

  const getSeverityBadge = (severity: string) => {
    const variants = {
      low: "bg-green-100 text-green-800",
      medium: "bg-yellow-100 text-yellow-800",
      high: "bg-orange-100 text-orange-800",
      critical: "bg-red-100 text-red-800"
    };

    const labels = {
      low: "Bassa",
      medium: "Media",
      high: "Alta",
      critical: "Critica"
    };

    return (
      <Badge className={variants[severity as keyof typeof variants]}>
        {labels[severity as keyof typeof labels]}
      </Badge>
    );
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      open: "bg-red-100 text-red-800",
      investigating: "bg-yellow-100 text-yellow-800",
      contained: "bg-blue-100 text-blue-800",
      closed: "bg-green-100 text-green-800"
    };

    const labels = {
      open: "Aperta",
      investigating: "In Indagine",
      contained: "Contenuta",
      closed: "Chiusa"
    };

    return (
      <Badge className={variants[status as keyof typeof variants]}>
        {labels[status as keyof typeof labels]}
      </Badge>
    );
  };

  const getNotificationDeadline = (detectedAt: string) => {
    const detected = new Date(detectedAt);
    const deadline = new Date(detected.getTime() + TIME_CONSTANTS.GDPR_NOTIFICATION_DEADLINE); // 72 hours
    const now = new Date();
    const hoursLeft = Math.max(0, Math.floor((deadline.getTime() - now.getTime()) / (1000 * 60 * 60)));
    
    return { deadline, hoursLeft, isOverdue: hoursLeft === 0 && now > deadline };
  };

  const filteredBreaches = selectedStatus === "all" 
    ? breaches 
    : breaches.filter(breach => breach.status === selectedStatus);

  if (isLoading) {
    return <div className="text-center py-8">Caricamento violazioni di dati...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Violazioni Totali</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{breaches.length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Violazioni Aperte</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {breaches.filter(b => b.status === 'open').length}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Notifiche Scadute</CardTitle>
            <Clock className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {breaches.filter(b => 
                b.authority_notification_required && 
                !b.authority_notified_at && 
                getNotificationDeadline(b.detected_at).isOverdue
              ).length}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Utenti Interessati</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {breaches.reduce((sum, breach) => sum + breach.affected_users_count, 0)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Breach Management */}
      <Card>
        <CardHeader>
          <CardTitle>Gestione Violazioni di Dati</CardTitle>
          <CardDescription>
            Monitora e gestisci le violazioni di dati secondo GDPR Articolo 33
          </CardDescription>
          
          <div className="flex gap-4 items-center">
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filtra per stato" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tutti gli stati</SelectItem>
                <SelectItem value="open">Aperte</SelectItem>
                <SelectItem value="investigating">In Indagine</SelectItem>
                <SelectItem value="contained">Contenute</SelectItem>
                <SelectItem value="closed">Chiuse</SelectItem>
              </SelectContent>
            </Select>
            
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Registra Violazione
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Registra Violazione di Dati</DialogTitle>
                  <DialogDescription>
                    Registra una nuova violazione di dati per conformità GDPR
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="nature">Natura della Violazione</Label>
                    <Textarea
                      id="nature"
                      value={newBreach.nature_of_breach}
                      onChange={(e) => setNewBreach({ ...newBreach, nature_of_breach: e.target.value })}
                      placeholder="Descrivi la natura della violazione..."
                      rows={3}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="affected_count">Utenti Interessati</Label>
                      <Input
                        id="affected_count"
                        type="number"
                        min="0"
                        value={newBreach.affected_users_count}
                        onChange={(e) => setNewBreach({ ...newBreach, affected_users_count: parseInt(e.target.value) || 0 })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="severity">Gravità</Label>
                      <Select value={newBreach.severity} onValueChange={(value) => 
                        setNewBreach({ ...newBreach, severity: value })
                      }>
                        <SelectTrigger>
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
                  </div>
                  <div>
                    <Label htmlFor="data_types">Tipi di Dati Interessati (separati da virgola)</Label>
                    <Input
                      id="data_types"
                      value={newBreach.affected_data_types}
                      onChange={(e) => setNewBreach({ ...newBreach, affected_data_types: e.target.value })}
                      placeholder="es: email, nomi, indirizzi"
                    />
                  </div>
                  <div>
                    <Label htmlFor="containment">Misure di Contenimento</Label>
                    <Textarea
                      id="containment"
                      value={newBreach.containment_measures}
                      onChange={(e) => setNewBreach({ ...newBreach, containment_measures: e.target.value })}
                      placeholder="Descrivi le misure adottate per contenere la violazione..."
                      rows={2}
                    />
                  </div>
                  <div>
                    <Label htmlFor="impact">Valutazione dell'Impatto</Label>
                    <Textarea
                      id="impact"
                      value={newBreach.impact_assessment}
                      onChange={(e) => setNewBreach({ ...newBreach, impact_assessment: e.target.value })}
                      placeholder="Valuta l'impatto potenziale della violazione..."
                      rows={2}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                    Annulla
                  </Button>
                  <Button onClick={createBreach}>
                    Registra Violazione
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            
            <Button variant="outline" onClick={fetchBreaches}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Aggiorna
            </Button>
          </div>
        </CardHeader>
        
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Natura</TableHead>
                  <TableHead>Gravità</TableHead>
                  <TableHead>Utenti</TableHead>
                  <TableHead>Stato</TableHead>
                  <TableHead>Notifica Autorità</TableHead>
                  <TableHead>Data Rilevamento</TableHead>
                  <TableHead>Azioni</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBreaches.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                      Nessuna violazione di dati registrata
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredBreaches.map((breach) => {
                    const notification = getNotificationDeadline(breach.detected_at);
                    return (
                      <TableRow key={breach.id}>
                        <TableCell className="max-w-xs">
                          <div className="truncate" title={breach.nature_of_breach}>
                            {breach.nature_of_breach}
                          </div>
                        </TableCell>
                        <TableCell>
                          {getSeverityBadge(breach.severity)}
                        </TableCell>
                        <TableCell>
                          <span className="font-medium">{breach.affected_users_count}</span>
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(breach.status)}
                        </TableCell>
                        <TableCell>
                          {breach.authority_notification_required ? (
                            breach.authority_notified_at ? (
                              <Badge className="bg-green-100 text-green-800">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Notificata
                              </Badge>
                            ) : (
                              <div className="space-y-1">
                                <Badge className={notification.isOverdue ? "bg-red-100 text-red-800" : "bg-yellow-100 text-yellow-800"}>
                                  <Clock className="h-3 w-3 mr-1" />
                                  {notification.isOverdue ? "SCADUTA" : `${notification.hoursLeft}h rimanenti`}
                                </Badge>
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  onClick={() => markAuthorityNotified(breach.id)}
                                  className="text-xs h-6"
                                >
                                  Segna Notificata
                                </Button>
                              </div>
                            )
                          ) : (
                            <Badge className="bg-gray-100 text-gray-800">Non richiesta</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-sm">
                          {new Date(breach.detected_at).toLocaleDateString('it-IT', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </TableCell>
                        <TableCell>
                          <Select 
                            value={breach.status} 
                            onValueChange={(value) => updateBreachStatus(breach.id, value)}
                          >
                            <SelectTrigger className="w-32">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="open">Aperta</SelectItem>
                              <SelectItem value="investigating">In Indagine</SelectItem>
                              <SelectItem value="contained">Contenuta</SelectItem>
                              <SelectItem value="closed">Chiusa</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
