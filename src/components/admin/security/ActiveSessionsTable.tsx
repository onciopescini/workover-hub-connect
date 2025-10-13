import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';

interface ActiveSession {
  id: string;
  user_id: string;
  ip_address: string;
  user_agent: string;
  last_activity: string;
  created_at: string;
  expires_at: string;
}

export const ActiveSessionsTable = () => {
  const { data: sessions, isLoading } = useQuery({
    queryKey: ['active-sessions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('active_sessions')
        .select('*')
        .gte('expires_at', new Date().toISOString())
        .order('last_activity', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data as ActiveSession[];
    },
    refetchInterval: 30000 // Refresh every 30 seconds
  });

  if (isLoading) {
    return <div>Loading active sessions...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Active Sessions (Last 50)</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User ID</TableHead>
              <TableHead>IP Address</TableHead>
              <TableHead>User Agent</TableHead>
              <TableHead>Last Activity</TableHead>
              <TableHead>Expires At</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sessions?.map((session) => (
              <TableRow key={session.id}>
                <TableCell className="font-mono text-xs">
                  {session.user_id.substring(0, 8)}...
                </TableCell>
                <TableCell className="font-mono text-sm">
                  {session.ip_address || 'N/A'}
                </TableCell>
                <TableCell className="max-w-xs truncate text-sm">
                  {session.user_agent || 'N/A'}
                </TableCell>
                <TableCell className="text-sm">
                  {format(new Date(session.last_activity), 'yyyy-MM-dd HH:mm:ss')}
                </TableCell>
                <TableCell className="text-sm">
                  {format(new Date(session.expires_at), 'yyyy-MM-dd HH:mm:ss')}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};
