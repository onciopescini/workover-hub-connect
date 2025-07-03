
import { useEffect, useState } from "react";
import { getAdminActionsLog } from "@/lib/admin-utils";
import { AdminActionLog, ACTION_TYPES } from "@/types/admin";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, FileText } from "lucide-react";
import { toast } from "sonner";

export function AdminActionsLog() {
  const [logs, setLogs] = useState<AdminActionLog[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<AdminActionLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterActionType, setFilterActionType] = useState<string>("all");
  const [filterTargetType, setFilterTargetType] = useState<string>("all");

  useEffect(() => {
    fetchLogs();
  }, []);

  useEffect(() => {
    filterLogs();
  }, [logs, searchTerm, filterActionType, filterTargetType]);

  const fetchLogs = async () => {
    console.log("AdminActionsLog: Starting to fetch logs...");
    setIsLoading(true);
    try {
      const logsData = await getAdminActionsLog();
      console.log("AdminActionsLog: Received logs:", logsData.length, "entries");
      setLogs(logsData);
    } catch (error) {
      console.error("AdminActionsLog: Error fetching admin logs:", error);
      toast.error("Errore nel caricamento dei log");
    } finally {
      setIsLoading(false);
    }
  };

  const filterLogs = () => {
    let filtered = logs.filter(log => {
      const matchesSearch = 
        log.description.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesActionType = filterActionType === "all" || log.action_type === filterActionType;
      const matchesTargetType = filterTargetType === "all" || log.target_type === filterTargetType;

      return matchesSearch && matchesActionType && matchesTargetType;
    });

    setFilteredLogs(filtered);
  };

  const getActionTypeColor = (actionType: string) => {
    switch (actionType) {
      case "user_suspend": return "bg-red-100 text-red-800";
      case "user_reactivate": return "bg-green-100 text-green-800";
      case "space_approve": return "bg-blue-100 text-blue-800";
      case "space_reject": return "bg-orange-100 text-orange-800";
      case "space_suspend": return "bg-red-100 text-red-800";
      case "event_cancel": return "bg-yellow-100 text-yellow-800";
      case "tag_approve": return "bg-purple-100 text-purple-800";
      case "warning_issued": return "bg-pink-100 text-pink-800";
      case "report_review": return "bg-indigo-100 text-indigo-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getTargetTypeColor = (targetType: string) => {
    switch (targetType) {
      case "user": return "bg-blue-100 text-blue-800";
      case "space": return "bg-green-100 text-green-800";
      case "event": return "bg-purple-100 text-purple-800";
      case "tag": return "bg-orange-100 text-orange-800";
      case "ticket": return "bg-yellow-100 text-yellow-800";
      case "report": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  if (isLoading) {
    return <div className="text-center py-8">Caricamento log azioni...</div>;
  }

  console.log("AdminActionsLog: Rendering with logs:", logs.length, "entries");

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Log Azioni Amministrative</h2>
        <p className="text-gray-600">Visualizza tutte le azioni eseguite dagli amministratori</p>
        <p className="text-sm text-gray-500">Totale log: {logs.length} | Filtrati: {filteredLogs.length}</p>
      </div>

      {/* Debug Info */}
      {logs.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-orange-600">⚠️ Nessun log di azioni trovato</p>
            <p className="text-sm text-gray-500 mt-2">
              I log vengono creati automaticamente quando gli admin eseguono azioni.
              Se non vedi log, potrebbero esserci problemi con le funzioni del database.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Cerca per descrizione..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={filterActionType} onValueChange={setFilterActionType}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="Tipo Azione" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tutte le azioni</SelectItem>
                {Object.entries(ACTION_TYPES).map(([key, label]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterTargetType} onValueChange={setFilterTargetType}>
              <SelectTrigger className="w-full sm:w-[150px]">
                <SelectValue placeholder="Target" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tutti</SelectItem>
                <SelectItem value="user">Utente</SelectItem>
                <SelectItem value="space">Spazio</SelectItem>
                <SelectItem value="event">Evento</SelectItem>
                <SelectItem value="tag">Tag</SelectItem>
                <SelectItem value="ticket">Ticket</SelectItem>
                <SelectItem value="report">Report</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Logs List */}
      <div className="space-y-3">
        {filteredLogs.map((log) => (
          <Card key={log.id}>
            <CardContent className="pt-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <FileText className="w-4 h-4 text-gray-500" />
                    <Badge className={getActionTypeColor(log.action_type)}>
                      {ACTION_TYPES[log.action_type as keyof typeof ACTION_TYPES]}
                    </Badge>
                    <Badge className={getTargetTypeColor(log.target_type)}>
                      {log.target_type}
                    </Badge>
                  </div>
                  
                  <p className="text-gray-900 mb-1">{log.description}</p>
                  <div className="text-sm text-gray-500">
                    <span>Target ID: {log.target_id.slice(0, 8)}...</span>
                    <span className="mx-2">•</span>
                    <span>{new Date(log.created_at ?? '').toLocaleString('it-IT')}</span>
                  </div>
                  
                  {log.metadata && Object.keys(log.metadata).length > 0 && (
                    <details className="mt-2">
                      <summary className="text-sm text-blue-600 cursor-pointer hover:text-blue-800">
                        Mostra metadata
                      </summary>
                      <pre className="text-xs bg-gray-50 p-2 rounded mt-1 overflow-x-auto">
                        {JSON.stringify(log.metadata, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredLogs.length === 0 && !isLoading && logs.length > 0 && (
        <div className="text-center py-8">
          <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">Nessun log corrisponde ai filtri applicati</p>
        </div>
      )}

      {/* Results Summary */}
      <div className="text-sm text-gray-600">
        Visualizzati {filteredLogs.length} di {logs.length} log di azioni
      </div>
    </div>
  );
}
