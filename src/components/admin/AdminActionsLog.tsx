
/**
 * Admin Actions Log Component
 * 
 * Refactored to use separated concerns with custom hooks and sub-components
 * This reduces the component size and improves maintainability
 */
import { FileText } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useAdminActionsLog } from "@/hooks/admin/useAdminActionsLog";
import { AdminActionsFilters } from "./components/AdminActionsFilters";
import { AdminActionCard } from "./components/AdminActionCard";

export function AdminActionsLog() {
  const {
    logs,
    filteredLogs,
    isLoading,
    searchTerm,
    filterActionType,
    filterTargetType,
    setSearchTerm,
    setFilterActionType,
    setFilterTargetType
  } = useAdminActionsLog();

  if (isLoading) {
    return <div className="text-center py-8">Caricamento log azioni...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-2">Log Azioni Amministrative</h2>
        <p className="text-muted-foreground">Visualizza tutte le azioni eseguite dagli amministratori</p>
        <p className="text-sm text-muted-foreground">Totale log: {logs.length} | Filtrati: {filteredLogs.length}</p>
      </div>

      {/* Empty State */}
      {logs.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-orange-600">⚠️ Nessun log di azioni trovato</p>
            <p className="text-sm text-muted-foreground mt-2">
              I log vengono creati automaticamente quando gli admin eseguono azioni.
              Se non vedi log, potrebbero esserci problemi con le funzioni del database.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Filters Component */}
      <AdminActionsFilters
        searchTerm={searchTerm}
        filterActionType={filterActionType}
        filterTargetType={filterTargetType}
        onSearchChange={setSearchTerm}
        onActionTypeChange={setFilterActionType}
        onTargetTypeChange={setFilterTargetType}
      />

      {/* Logs List */}
      <div className="space-y-3">
        {filteredLogs.map((log) => (
          <AdminActionCard key={log.id} log={log} />
        ))}
      </div>

      {/* No Results State */}
      {filteredLogs.length === 0 && !isLoading && logs.length > 0 && (
        <div className="text-center py-8">
          <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">Nessun log corrisponde ai filtri applicati</p>
        </div>
      )}

      {/* Results Summary */}
      <div className="text-sm text-muted-foreground">
        Visualizzati {filteredLogs.length} di {logs.length} log di azioni
      </div>
    </div>
  );
}
