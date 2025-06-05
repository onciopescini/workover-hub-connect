
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Eye, Plus, AlertTriangle, CheckCircle, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface AccessibilityAudit {
  id: string;
  page_url: string;
  audit_type: 'automated' | 'manual';
  score: number;
  violations: any[];
  created_by: string;
  created_at: string;
}

interface AccessibilityViolation {
  id: string;
  description: string;
  impact: string;
  help: string;
  helpUrl: string;
}

export const AccessibilityAuditManagement = () => {
  const [audits, setAudits] = useState<AccessibilityAudit[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedAuditType, setSelectedAuditType] = useState<string>("all");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newAudit, setNewAudit] = useState({
    page_url: "",
    score: 100,
    violations: ""
  });

  useEffect(() => {
    fetchAudits();
  }, []);

  const fetchAudits = async () => {
    try {
      const { data, error } = await supabase
        .from('accessibility_audits')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAudits((data || []) as AccessibilityAudit[]);
    } catch (error) {
      console.error("Error fetching accessibility audits:", error);
      toast.error("Errore nel caricamento degli audit di accessibilità");
    } finally {
      setIsLoading(false);
    }
  };

  const createManualAudit = async () => {
    try {
      const { data: currentUser } = await supabase.auth.getUser();
      if (!currentUser.user) throw new Error("Not authenticated");

      let violations = [];
      try {
        violations = newAudit.violations ? JSON.parse(newAudit.violations) : [];
      } catch (e) {
        toast.error("Formato JSON non valido per le violazioni");
        return;
      }

      const { error } = await supabase
        .from('accessibility_audits')
        .insert({
          page_url: newAudit.page_url,
          audit_type: 'manual',
          score: newAudit.score,
          violations: violations,
          created_by: currentUser.user.id
        });

      if (error) throw error;

      toast.success("Audit di accessibilità creato con successo");
      setIsCreateDialogOpen(false);
      setNewAudit({ page_url: "", score: 100, violations: "" });
      fetchAudits();
    } catch (error) {
      console.error("Error creating accessibility audit:", error);
      toast.error("Errore nella creazione dell'audit");
    }
  };

  const getScoreBadge = (score: number) => {
    if (score >= 90) return <Badge className="bg-green-100 text-green-800">Ottimo ({score})</Badge>;
    if (score >= 70) return <Badge className="bg-yellow-100 text-yellow-800">Buono ({score})</Badge>;
    if (score >= 50) return <Badge className="bg-orange-100 text-orange-800">Sufficiente ({score})</Badge>;
    return <Badge className="bg-red-100 text-red-800">Critico ({score})</Badge>;
  };

  const getAuditTypeIcon = (type: string) => {
    return type === 'automated' 
      ? <CheckCircle className="h-4 w-4 text-blue-500" />
      : <Eye className="h-4 w-4 text-purple-500" />;
  };

  const filteredAudits = selectedAuditType === "all" 
    ? audits 
    : audits.filter(audit => audit.audit_type === selectedAuditType);

  if (isLoading) {
    return <div className="text-center py-8">Caricamento audit di accessibilità...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Audit Totali</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{audits.length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Score Medio</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {audits.length > 0 ? Math.round(audits.reduce((sum, audit) => sum + audit.score, 0) / audits.length) : 0}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Violazioni Totali</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {audits.reduce((sum, audit) => sum + (audit.violations?.length || 0), 0)}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pagine Uniche</CardTitle>
            <RefreshCw className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Set(audits.map(audit => audit.page_url)).size}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Audit Management */}
      <Card>
        <CardHeader>
          <CardTitle>Gestione Audit di Accessibilità</CardTitle>
          <CardDescription>
            Monitora e gestisci gli audit di accessibilità delle pagine dell'applicazione
          </CardDescription>
          
          <div className="flex gap-4 items-center">
            <Select value={selectedAuditType} onValueChange={setSelectedAuditType}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filtra per tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tutti i tipi</SelectItem>
                <SelectItem value="automated">Automatici</SelectItem>
                <SelectItem value="manual">Manuali</SelectItem>
              </SelectContent>
            </Select>
            
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Nuovo Audit Manuale
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Crea Audit Manuale</DialogTitle>
                  <DialogDescription>
                    Aggiungi un audit di accessibilità manuale per una pagina specifica
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="page_url">URL Pagina</Label>
                    <Input
                      id="page_url"
                      value={newAudit.page_url}
                      onChange={(e) => setNewAudit({ ...newAudit, page_url: e.target.value })}
                      placeholder="/dashboard, /profile, ecc."
                    />
                  </div>
                  <div>
                    <Label htmlFor="score">Score (0-100)</Label>
                    <Input
                      id="score"
                      type="number"
                      min="0"
                      max="100"
                      value={newAudit.score}
                      onChange={(e) => setNewAudit({ ...newAudit, score: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="violations">Violazioni (JSON)</Label>
                    <Textarea
                      id="violations"
                      value={newAudit.violations}
                      onChange={(e) => setNewAudit({ ...newAudit, violations: e.target.value })}
                      placeholder='[{"id": "color-contrast", "description": "Contrasto insufficiente", "impact": "serious"}]'
                      rows={4}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                    Annulla
                  </Button>
                  <Button onClick={createManualAudit}>
                    Crea Audit
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            
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
                  <TableHead>Tipo</TableHead>
                  <TableHead>URL Pagina</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Violazioni</TableHead>
                  <TableHead>Data Audit</TableHead>
                  <TableHead>Creato Da</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAudits.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                      Nessun audit di accessibilità trovato
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredAudits.map((audit) => (
                    <TableRow key={audit.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getAuditTypeIcon(audit.audit_type)}
                          <span className="capitalize">{audit.audit_type}</span>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {audit.page_url}
                      </TableCell>
                      <TableCell>
                        {getScoreBadge(audit.score)}
                      </TableCell>
                      <TableCell>
                        <span className="font-medium">
                          {audit.violations?.length || 0} problemi
                        </span>
                      </TableCell>
                      <TableCell className="text-sm">
                        {new Date(audit.created_at).toLocaleDateString('it-IT', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </TableCell>
                      <TableCell className="text-sm text-gray-600">
                        {audit.created_by.substring(0, 8)}...
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
