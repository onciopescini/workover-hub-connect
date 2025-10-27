import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AlertTriangle, CheckCircle, Clock, Shield, Bell } from "lucide-react";
import { useDataBreachLog, DataBreach } from "@/hooks/admin/useDataBreachLog";
import { formatDistanceToNow } from "date-fns";
import { it } from "date-fns/locale";
import { useState } from "react";
import { toast } from "sonner";

export function DataBreachManagement() {
  const {
    breaches,
    allBreaches,
    isLoading,
    filterSeverity,
    filterStatus,
    setFilterSeverity,
    setFilterStatus,
    updateBreachStatus,
    notifyAuthorities
  } = useDataBreachLog();

  const [detailsDialog, setDetailsDialog] = useState(false);
  const [selectedBreach, setSelectedBreach] = useState<DataBreach | null>(null);
  const [containmentMeasures, setContainmentMeasures] = useState("");
  const [impactAssessment, setImpactAssessment] = useState("");

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-600 text-white';
      case 'high': return 'bg-orange-500 text-white';
      case 'medium': return 'bg-yellow-500 text-white';
      case 'low': return 'bg-green-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-red-100 text-red-800';
      case 'investigating': return 'bg-blue-100 text-blue-800';
      case 'contained': return 'bg-yellow-100 text-yellow-800';
      case 'resolved': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'open': return 'Aperto';
      case 'investigating': return 'In analisi';
      case 'contained': return 'Contenuto';
      case 'resolved': return 'Risolto';
      default: return status;
    }
  };

  const handleUpdateDetails = async () => {
    if (!selectedBreach) return;

    await updateBreachStatus(selectedBreach.id, selectedBreach.status, {
      containment_measures: containmentMeasures,
      impact_assessment: impactAssessment
    });

    setDetailsDialog(false);
    setContainmentMeasures("");
    setImpactAssessment("");
    setSelectedBreach(null);
  };

  const handleNotifyAuthorities = async (breach: DataBreach) => {
    if (breach.authority_notified_at) {
      toast.info('Autorità già notificate');
      return;
    }
    await notifyAuthorities(breach.id);
  };

  if (isLoading) {
    return <div className="text-center py-8">Caricamento data breach log...</div>;
  }

  // Stats
  const openCount = allBreaches.filter(b => b.status === 'open').length;
  const criticalCount = allBreaches.filter(b => b.severity === 'critical' && b.status !== 'resolved').length;
  const unresolvedCount = allBreaches.filter(b => b.status !== 'resolved').length;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Data Breach Log</h2>
        <p className="text-gray-600">Gestisci violazioni dati e monitora lo stato di contenimento</p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-red-600">{openCount}</div>
                <div className="text-sm text-gray-600">Aperti</div>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-orange-600">{criticalCount}</div>
                <div className="text-sm text-gray-600">Critici Attivi</div>
              </div>
              <Shield className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-blue-600">{unresolvedCount}</div>
                <div className="text-sm text-gray-600">Non Risolti</div>
              </div>
              <Clock className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <Select value={filterSeverity} onValueChange={setFilterSeverity}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="Severità" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tutte le severità</SelectItem>
                <SelectItem value="critical">Critica</SelectItem>
                <SelectItem value="high">Alta</SelectItem>
                <SelectItem value="medium">Media</SelectItem>
                <SelectItem value="low">Bassa</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="Stato" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tutti gli stati</SelectItem>
                <SelectItem value="open">Aperto</SelectItem>
                <SelectItem value="investigating">In analisi</SelectItem>
                <SelectItem value="contained">Contenuto</SelectItem>
                <SelectItem value="resolved">Risolto</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Breaches List */}
      <div className="space-y-4">
        {breaches.map((breach) => (
          <Card key={breach.id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <CardTitle className="text-lg">{breach.nature_of_breach}</CardTitle>
                    <Badge className={getSeverityColor(breach.severity)}>
                      {breach.severity.toUpperCase()}
                    </Badge>
                    <Badge className={getStatusColor(breach.status)}>
                      {getStatusLabel(breach.status)}
                    </Badge>
                  </div>
                  <div className="text-sm text-gray-600 space-y-1">
                    <p><strong>Utenti coinvolti:</strong> {breach.affected_users_count}</p>
                    <p><strong>Dati interessati:</strong> {breach.affected_data_types.join(', ')}</p>
                    <p><strong>Data violazione:</strong> {new Date(breach.breach_date).toLocaleDateString('it-IT')}</p>
                    <p><strong>Rilevato:</strong> {formatDistanceToNow(new Date(breach.detected_at), { addSuffix: true, locale: it })}</p>
                    {breach.authority_notified_at && (
                      <p className="text-green-600">
                        <CheckCircle className="inline w-4 h-4 mr-1" />
                        Autorità notificate il {new Date(breach.authority_notified_at).toLocaleDateString('it-IT')}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  {breach.status === 'open' && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => updateBreachStatus(breach.id, 'investigating')}
                    >
                      Avvia Analisi
                    </Button>
                  )}

                  {breach.status === 'investigating' && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => updateBreachStatus(breach.id, 'contained')}
                    >
                      Segna Contenuto
                    </Button>
                  )}

                  {breach.status === 'contained' && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => updateBreachStatus(breach.id, 'resolved')}
                    >
                      Segna Risolto
                    </Button>
                  )}

                  {breach.authority_notification_required && !breach.authority_notified_at && (
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleNotifyAuthorities(breach)}
                    >
                      <Bell className="w-4 h-4 mr-1" />
                      Notifica Autorità
                    </Button>
                  )}

                  <Dialog open={detailsDialog} onOpenChange={setDetailsDialog}>
                    <DialogTrigger asChild>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedBreach(breach);
                          setContainmentMeasures(breach.containment_measures || '');
                          setImpactAssessment(breach.impact_assessment || '');
                        }}
                      >
                        Dettagli
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                      <DialogHeader>
                        <DialogTitle>Dettagli Data Breach</DialogTitle>
                        <DialogDescription>
                          Aggiungi misure di contenimento e valutazione impatto
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="containment">Misure di Contenimento</Label>
                          <Textarea
                            id="containment"
                            value={containmentMeasures}
                            onChange={(e) => setContainmentMeasures(e.target.value)}
                            placeholder="Descrivi le azioni intraprese per contenere la violazione..."
                            rows={4}
                          />
                        </div>
                        <div>
                          <Label htmlFor="impact">Valutazione Impatto</Label>
                          <Textarea
                            id="impact"
                            value={impactAssessment}
                            onChange={(e) => setImpactAssessment(e.target.value)}
                            placeholder="Descrivi l'impatto della violazione sugli utenti e sui sistemi..."
                            rows={4}
                          />
                        </div>
                        {breach.containment_measures && (
                          <div className="bg-blue-50 p-3 rounded-lg">
                            <p className="text-sm"><strong>Misure esistenti:</strong></p>
                            <p className="text-sm">{breach.containment_measures}</p>
                          </div>
                        )}
                        {breach.impact_assessment && (
                          <div className="bg-yellow-50 p-3 rounded-lg">
                            <p className="text-sm"><strong>Valutazione esistente:</strong></p>
                            <p className="text-sm">{breach.impact_assessment}</p>
                          </div>
                        )}
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setDetailsDialog(false)}>
                          Annulla
                        </Button>
                        <Button onClick={handleUpdateDetails}>
                          Salva Dettagli
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            </CardHeader>
          </Card>
        ))}
      </div>

      {breaches.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center text-gray-500">
            <CheckCircle className="w-12 h-12 mx-auto mb-4 text-green-600" />
            <p>Nessuna violazione dati registrata con i filtri selezionati</p>
          </CardContent>
        </Card>
      )}

      <div className="text-sm text-gray-600">
        Visualizzati {breaches.length} di {allBreaches.length} data breach
      </div>
    </div>
  );
}
