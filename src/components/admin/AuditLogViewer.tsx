import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

interface AuditLog {
  id: string;
  admin_id: string;
  action_type: string;
  target_type: string;
  target_id: string;
  description: string;
  metadata: any;
  ip_address: string;
  user_agent: string;
  session_id: string;
  created_at: string;
}

export const AuditLogViewer = () => {
  const { data: logs, isLoading } = useQuery({
    queryKey: ['audit-logs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('admin_actions_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      return data as AuditLog[];
    }
  });

  const getActionBadgeColor = (actionType: string) => {
    if (actionType.includes('delete') || actionType.includes('suspend')) return 'destructive';
    if (actionType.includes('approve') || actionType.includes('restore')) return 'default';
    return 'secondary';
  };

  if (isLoading) {
    return <div>Loading audit logs...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Audit Log (Last 100 Actions)</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Timestamp</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Target</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>IP Address</TableHead>
              <TableHead>Session</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs?.map((log) => (
              <TableRow key={log.id}>
                <TableCell className="font-mono text-sm">
                  {format(new Date(log.created_at), 'yyyy-MM-dd HH:mm:ss')}
                </TableCell>
                <TableCell>
                  <Badge variant={getActionBadgeColor(log.action_type)}>
                    {log.action_type}
                  </Badge>
                </TableCell>
                <TableCell>
                  <span className="text-sm text-muted-foreground">
                    {log.target_type}
                  </span>
                </TableCell>
                <TableCell className="max-w-md truncate">
                  {log.description}
                </TableCell>
                <TableCell className="font-mono text-xs">
                  {log.ip_address || 'N/A'}
                </TableCell>
                <TableCell className="font-mono text-xs">
                  {log.session_id?.substring(0, 8) || 'N/A'}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};
