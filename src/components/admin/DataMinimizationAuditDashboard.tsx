
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Database, Trash2, Archive, Eye, RefreshCw, AlertTriangle, TrendingDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useLogger } from "@/hooks/useLogger";
import type { DataMinimizationAudit } from "@/types/gdpr";

export const DataMinimizationAuditDashboard = () => {
  const { error } = useLogger({ context: 'DataMinimizationAuditDashboard' });
  const [audits, setAudits] = useState<DataMinimizationAudit[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRunningAudit, setIsRunningAudit] = useState(false);

  useEffect(() => {
    fetchAudits();
  }, []);

  const fetchAudits = async () => {
    try {
      const { data, error } = await supabase
        .from('data_minimization_audit')
        .select('*')
        .order('audit_date', { ascending: false });

      if (error) throw error;
      setAudits((data || []) as DataMinimizationAudit[]);
    } catch (fetchError) {
      error("Error fetching minimization audits", fetchError as Error, { operation: 'fetch_minimization_audits' });
      toast.error("Errore nel caricamento degli audit");
    } finally {
      setIsLoading(false);
    }
  };

  const runDataMinimizationAudit = async () => {
    setIsRunningAudit(true);
    try {
      const { data, error } = await supabase.rpc('run_data_minimization_audit');

      if (error) throw error;

      const result = data as unknown as { 
        success: boolean; 
        error?: string; 
        audit_entries_created: number;
        audit_date: string;
      };

      if (!result.success) {
        throw new Error(result.error || 'Failed to run audit');
      }

      toast.success(`Audit completato: ${result.audit_entries_created} voci create`);
      fetchAudits();
    } catch (auditError) {
      error("Error running minimization audit", auditError as Error, { operation: 'run_minimization_audit' });
      toast.error("Errore nell'esecuzione dell'audit");
    } finally {
      setIsRunningAudit(false);
    }
  };

  const getRecommendationBadge = (recommendation: string) => {
    const variants = {
      keep: "bg-green-100 text-green-800",
      anonymize: "bg-yellow-100 text-yellow-800",
      delete: "bg-red-100 text-red-800",
      archive: "bg-blue-100 text-blue-800"
    };

    const labels = {
      keep: "Mantieni",
      anonymize: "Anonimizza",
      delete: "Elimina",
      archive: "Archivia"
    };

    const icons = {
      keep: Eye,
      anonymize: TrendingDown,
      delete: Trash2,
      archive: Archive
    };

    const IconComponent = icons[recommendation as keyof typeof icons];

    return (
      <Badge className={variants[recommendation as keyof typeof variants]}>
        <IconComponent className="h-3 w-3 mr-1" />
        {labels[recommendation as keyof typeof labels]}
      </Badge>
    );
  };

  const getUsageFrequencyBadge = (frequency: string) => {
    const variants = {
      never: "bg-red-100 text-red-800",
      rare: "bg-orange-100 text-orange-800",
      occasional: "bg-yellow-100 text-yellow-800",
      frequent: "bg-blue-100 text-blue-800",
      constant: "bg-green-100 text-green-800"
    };

    const labels = {
      never: "Mai",
      rare: "Raro",
      occasional: "Occasionale",
      frequent: "Frequente",
      constant: "Costante"
    };

    return (
      <Badge className={variants[frequency as keyof typeof variants]}>
        {labels[frequency as keyof typeof labels]}
      </Badge>
    );
  };

  const getDataRiskScore = () => {
    const deleteRecommendations = audits.filter(a => a.retention_recommendation === 'delete').length;
    const anonymizeRecommendations = audits.filter(a => a.retention_recommendation === 'anonymize').length;
    const totalRecords = audits.reduce((sum, audit) => sum + audit.record_count, 0);
    
    return {
      deleteCount: deleteRecommendations,
      anonymizeCount: anonymizeRecommendations,
      totalRecords,
      riskLevel: deleteRecommendations > 3 ? 'high' : deleteRecommendations > 1 ? 'medium' : 'low'
    };
  };

  const riskData = getDataRiskScore();

  if (isLoading) {
    return <div className="text-center py-8">Caricamento audit di minimizzazione dati...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Audit Eseguiti</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{audits.length}</div>
            <p className="text-xs text-muted-foreground">
              {audits.filter(a => a.audit_date.startsWith(new Date().getFullYear().toString())).length} quest'anno
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Raccomandazioni Eliminazione</CardTitle>
            <Trash2 className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{riskData.deleteCount}</div>
            <p className="text-xs text-muted-foreground">
              Dataset da eliminare
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Raccomandazioni Anonimizzazione</CardTitle>
            <TrendingDown className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{riskData.anonymizeCount}</div>
            <p className="text-xs text-muted-foreground">
              Dataset da anonimizzare
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Livello di Rischio</CardTitle>
            <AlertTriangle className={`h-4 w-4 ${
              riskData.riskLevel === 'high' ? 'text-red-500' : 
              riskData.riskLevel === 'medium' ? 'text-yellow-500' : 'text-green-500'
            }`} />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${
              riskData.riskLevel === 'high' ? 'text-red-600' : 
              riskData.riskLevel === 'medium' ? 'text-yellow-600' : 'text-green-600'
            }`}>
              {riskData.riskLevel === 'high' ? 'Alto' : 
               riskData.riskLevel === 'medium' ? 'Medio' : 'Basso'}
            </div>
            <Progress 
              value={riskData.riskLevel === 'high' ? 85 : riskData.riskLevel === 'medium' ? 50 : 20} 
              className="mt-2"
            />
          </CardContent>
        </Card>
      </div>

      {/* Audit Management */}
      <Card>
        <CardHeader>
          <CardTitle>Dashboard Audit Minimizzazione Dati</CardTitle>
          <CardDescription>
            Monitora e gestisci l'utilizzo dei dati per conformità GDPR e minimizzazione
          </CardDescription>
          
          <div className="flex gap-4 items-center">
            <Button onClick={runDataMinimizationAudit} disabled={isRunningAudit}>
              <Database className="h-4 w-4 mr-2" />
              {isRunningAudit ? "Esecuzione..." : "Esegui Audit"}
            </Button>
            
            <Button variant="outline" onClick={fetchAudits}>
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
                  <TableHead>Tabella/Tipo Dati</TableHead>
                  <TableHead>Record</TableHead>
                  <TableHead>Frequenza Utilizzo</TableHead>
                  <TableHead>Raccomandazione</TableHead>
                  <TableHead>Base Legale</TableHead>
                  <TableHead>Data Audit</TableHead>
                  <TableHead>Note</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {audits.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                      Nessun audit di minimizzazione eseguito. Clicca "Esegui Audit" per iniziare.
                    </TableCell>
                  </TableRow>
                ) : (
                  audits.map((audit) => (
                    <TableRow key={audit.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{audit.table_name}</div>
                          <div className="text-sm text-gray-500">{audit.data_type}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="font-mono text-sm">{audit.record_count.toLocaleString()}</span>
                      </TableCell>
                      <TableCell>
                        {getUsageFrequencyBadge(audit.usage_frequency)}
                      </TableCell>
                      <TableCell>
                        {getRecommendationBadge(audit.retention_recommendation)}
                      </TableCell>
                      <TableCell className="text-sm">
                        {audit.legal_basis || 'Non specificata'}
                      </TableCell>
                      <TableCell className="text-sm">
                        {new Date(audit.audit_date).toLocaleDateString('it-IT', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        })}
                      </TableCell>
                      <TableCell className="max-w-xs">
                        <div className="truncate text-sm" title={audit.business_justification || audit.audit_notes}>
                          {audit.business_justification || audit.audit_notes || '-'}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Action Recommendations */}
      {audits.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Raccomandazioni Azioni</CardTitle>
            <CardDescription>
              Azioni suggerite basate sui risultati dell'audit di minimizzazione
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {riskData.deleteCount > 0 && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Trash2 className="h-4 w-4 text-red-600" />
                    <span className="font-medium text-red-800">Eliminazione Dati Raccomandata</span>
                  </div>
                  <p className="text-sm text-red-700">
                    {riskData.deleteCount} dataset sono stati identificati per l'eliminazione. 
                    Questi dati non sono più utilizzati attivamente e potrebbero violare i principi di minimizzazione GDPR.
                  </p>
                </div>
              )}
              
              {riskData.anonymizeCount > 0 && (
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingDown className="h-4 w-4 text-yellow-600" />
                    <span className="font-medium text-yellow-800">Anonimizzazione Raccomandata</span>
                  </div>
                  <p className="text-sm text-yellow-700">
                    {riskData.anonymizeCount} dataset potrebbero beneficiare dell'anonimizzazione per 
                    mantenere utilità analitiche riducendo i rischi privacy.
                  </p>
                </div>
              )}
              
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Database className="h-4 w-4 text-blue-600" />
                  <span className="font-medium text-blue-800">Prossimi Passi</span>
                </div>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>• Rivedi le raccomandazioni con il team legale</li>
                  <li>• Pianifica l'implementazione delle azioni di minimizzazione</li>
                  <li>• Programma audit regolari (raccomandati ogni 3-6 mesi)</li>
                  <li>• Documenta tutte le azioni intraprese per conformità GDPR</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
