/**
 * Individual Admin Action Log Card Component
 * 
 * Extracted from AdminActionsLog.tsx for better component organization
 */
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText } from "lucide-react";
import { AdminActionLog, ACTION_TYPES } from "@/types/admin";

interface AdminActionCardProps {
  log: AdminActionLog;
}

export function AdminActionCard({ log }: AdminActionCardProps) {
  const getActionTypeColor = (actionType: string) => {
    switch (actionType) {
      case "user_suspend": return "bg-destructive/10 text-destructive";
      case "user_reactivate": return "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300";
      case "space_approve": return "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300";
      case "space_reject": return "bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-300";
      case "space_suspend": return "bg-destructive/10 text-destructive";
      case "event_cancel": return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300";
      case "tag_approve": return "bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-300";
      case "warning_issued": return "bg-pink-100 text-pink-800 dark:bg-pink-900/20 dark:text-pink-300";
      case "report_review": return "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/20 dark:text-indigo-300";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const getTargetTypeColor = (targetType: string) => {
    switch (targetType) {
      case "user": return "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300";
      case "space": return "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300";
      case "event": return "bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-300";
      case "tag": return "bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-300";
      case "ticket": return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300";
      case "report": return "bg-destructive/10 text-destructive";
      default: return "bg-muted text-muted-foreground";
    }
  };

  return (
    <Card>
      <CardContent className="pt-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <FileText className="w-4 h-4 text-muted-foreground" />
              <Badge className={getActionTypeColor(log.action_type)}>
                {ACTION_TYPES[log.action_type as keyof typeof ACTION_TYPES]}
              </Badge>
              <Badge className={getTargetTypeColor(log.target_type)}>
                {log.target_type}
              </Badge>
            </div>
            
            <p className="text-foreground mb-1">{log.description}</p>
            <div className="text-sm text-muted-foreground">
              <span>Target ID: {log.target_id.slice(0, 8)}...</span>
              <span className="mx-2">•</span>
              <span>{new Date(log.created_at ?? '').toLocaleString('it-IT')}</span>
            </div>
            
            {log.metadata && Object.keys(log.metadata).length > 0 && (
              <details className="mt-2">
                <summary className="text-sm text-primary cursor-pointer hover:text-primary/80">
                  Mostra metadata
                </summary>
                <pre className="text-xs bg-muted p-2 rounded mt-1 overflow-x-auto">
                  {JSON.stringify(log.metadata, null, 2)}
                </pre>
              </details>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}