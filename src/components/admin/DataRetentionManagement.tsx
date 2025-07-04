import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Trash2, Clock, Database, RefreshCw, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useLogger } from "@/hooks/useLogger";

type RetentionActionType = "anonymize" | "delete" | "archive";

interface RetentionLog {
  id: string;
  action_type: RetentionActionType;
  table_name: string;
  record_count: number;
  criteria_used: string;
  executed_at: string;
  executed_by: string;
}

interface CleanupInactiveDataResponse {
  deleted_profiles: number;
  anonymized_bookings: number;
  deleted_messages: number;
}

export const DataRetentionManagement = () => {
  const { error } = useLogger({ context: 'DataRetentionManagement' });
  const [retentionLogs, setRetentionLogs] = useState<RetentionLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRunningCleanup, setIsRunningCleanup] = useState(false);

  useEffect(() => {
    fetchRetentionLogs();
  }, []);

  const fetchRetentionLogs = async () => {
    try {
      const { data, error } = await supabase
        .from('data_retention_log')
        .select('*')
        .order('executed_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setRetentionLogs((data || []) as RetentionLog[]);
    } catch (fetchError) {
      error("Error fetching retention logs", fetchError as Error, { operation: 'fetch_retention_logs' });
      toast.error("Errore nel caricamento dei log di retention");
    } finally {
      setIsLoading(false);
    }
  };

  const runDataCleanup = async () => {
    setIsRunningCleanup(true);
    try {
      const { data, error } = await supabase.rpc('cleanup_inactive_data');

      if (error) throw error;

      const cleanupResult = data as unknown as CleanupInactiveDataResponse;
      toast.success(`Pulizia completata: ${cleanupResult.deleted_profiles} profili eliminati, ${cleanupResult.anonymized_bookings} prenotazioni anonimizzate, ${cleanupResult.deleted_messages} messaggi eliminati`);
      fetchRetentionLogs();
    } catch (cleanupError) {
      error("Error running data cleanup", cleanupError as Error, { operation: 'run_data_cleanup' });
      toast.error("Errore durante la pulizia dei dati");
    } finally {
      setIsRunningCleanup(false);
    }
  };

  const getActionTypeIcon = (actionType: RetentionActionType) => {
    switch (actionType) {
      case 'delete':
        return <Trash2 className="h-4 w-4 text-red-500" />;
      case 'anonymize':
        return <Database className="h-4 w-4 text-blue-500" />;
      case 'archive':
        return <Clock className="h-4 w-4 text-green-500" />;
      default:
        return <Database className="h-4 w-4 text-gray-500" />;
    }
  };

  const getActionTypeLabel = (actionType: RetentionActionType) => {
    const labels = {
      delete: "Eliminazione",
      anonymize: "Anonimizzazione",
      archive: "Archiviazione"
    };
    return labels[actionType];
  };

  if (isLoading) {
    return <div className="text-center py-8">Caricamento gestione retention...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Retention Policy Overview */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Account Inattivi</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">24 mesi</div>
            <p className="text-xs text-muted-foreground">
              Cancellazione automatica
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Dati Prenotazione</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">7 anni</div>
            <p className="text-xs text-muted-foreground">
              Anonimizzazione automatica
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Messaggi</CardTitle>
            <Trash2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">5 anni</div>
            <p className="text-xs text-muted-foreground">
              Cancellazione automatica
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Manual Cleanup Section */}
      <Card>
        <CardHeader>
          <CardTitle>Pulizia Manuale Dati</CardTitle>
          <CardDescription>
            Esegui la pulizia dei dati secondo le politiche di retention configurate
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 items-center">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Esegui Pulizia Dati
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle className="flex items-center">
                    <AlertTriangle className="h-5 w-5 mr-2 text-red-500" />
                    Conferma Pulizia Dati
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    Questa operazione eliminerà o anonimizzerà i dati secondo le politiche di retention:
                    <ul className="list-disc list-inside mt-2 space-y-1">
                      <li>Profili inattivi da oltre 24 mesi</li>
                      <li>Prenotazioni più vecchie di 7 anni (anonimizzate)</li>
                      <li>Messaggi più vecchi di 5 anni</li>
                    </ul>
                    Questa azione è irreversibile.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Annulla</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={runDataCleanup}
                    disabled={isRunningCleanup}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    {isRunningCleanup ? "Eseguendo..." : "Conferma Pulizia"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            
            <Button variant="outline" onClick={fetchRetentionLogs}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Aggiorna Log
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Retention Logs */}
      <Card>
        <CardHeader>
          <CardTitle>Log Retention Dati</CardTitle>
          <CardDescription>
            Cronologia delle operazioni di pulizia e retention eseguite
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Azione</TableHead>
                  <TableHead>Tabella</TableHead>
                  <TableHead>Record Interessati</TableHead>
                  <TableHead>Criteri</TableHead>
                  <TableHead>Data Esecuzione</TableHead>
                  <TableHead>Eseguito Da</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {retentionLogs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                      Nessun log di retention trovato
                    </TableCell>
                  </TableRow>
                ) : (
                  retentionLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getActionTypeIcon(log.action_type)}
                          <span className="font-medium">
                            {getActionTypeLabel(log.action_type)}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {log.table_name}
                      </TableCell>
                      <TableCell>
                        <span className="font-medium text-blue-600">
                          {log.record_count}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm text-gray-600">
                        {log.criteria_used}
                      </TableCell>
                      <TableCell className="text-sm">
                        {new Date(log.executed_at).toLocaleDateString('it-IT', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </TableCell>
                      <TableCell className="text-sm text-gray-600">
                        {log.executed_by}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
