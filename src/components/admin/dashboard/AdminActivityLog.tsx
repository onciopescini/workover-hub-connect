import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AdminActionLog } from "@/types/admin";
import { formatDistanceToNow } from "date-fns";
import { it } from "date-fns/locale";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";

interface AdminActivityLogProps {
  logs: AdminActionLog[];
  isLoading?: boolean;
}

const actionTypeColors: Record<string, "default" | "destructive" | "outline" | "secondary"> = {
  user_suspend: "destructive",
  user_reactivate: "secondary",
  space_approve: "secondary",
  space_reject: "destructive",
  space_suspend: "outline",
  tag_approve: "secondary",
  report_review: "default",
};

export function AdminActivityLog({ logs, isLoading }: AdminActivityLogProps) {
  const [filterType, setFilterType] = useState<string>("all");

  const filteredLogs = filterType === "all" 
    ? logs 
    : logs.filter(log => log.action_type === filterType);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Log Attività Amministrative</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 bg-gray-200 rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Log Attività Amministrative</CardTitle>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filtra azioni" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tutte le azioni</SelectItem>
            <SelectItem value="user_suspend">Sospensioni utente</SelectItem>
            <SelectItem value="space_approve">Approvazioni spazio</SelectItem>
            <SelectItem value="tag_approve">Approvazioni tag</SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px]">
          {filteredLogs.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              Nessuna attività registrata
            </div>
          ) : (
            <div className="space-y-3">
              {filteredLogs.map((log) => (
                <div 
                  key={log.id} 
                  className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant={actionTypeColors[log.action_type] as "default" | "destructive" | "outline" | "secondary" || "default"}>
                        {log.action_type}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {log.created_at ? formatDistanceToNow(new Date(log.created_at), { 
                          addSuffix: true,
                          locale: it 
                        }) : 'N/A'}
                      </span>
                    </div>
                    <p className="text-sm text-foreground">
                      {log.description}
                    </p>
                    {log.metadata && Object.keys(log.metadata).length > 0 && (
                      <div className="mt-2 text-xs text-muted-foreground">
                        {JSON.stringify(log.metadata)}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
