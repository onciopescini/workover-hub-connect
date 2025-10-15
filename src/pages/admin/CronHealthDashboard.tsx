import React from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CheckCircle2, XCircle, Clock, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";

interface CronJob {
  jobid: number;
  schedule: string;
  command: string;
  nodename: string;
  nodeport: number;
  database: string;
  username: string;
  active: boolean;
  jobname: string;
}

interface CronJobRun {
  jobid: number;
  runid: number;
  job_pid: number;
  database: string;
  username: string;
  command: string;
  status: string;
  return_message: string | null;
  start_time: string;
  end_time: string | null;
}

export const CronHealthDashboard = () => {
  // Fetch all cron jobs
  const { data: cronJobs, isLoading: jobsLoading } = useQuery({
    queryKey: ['cron-jobs'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_cron_jobs');
      if (error) throw error;
      return data as CronJob[];
    },
    refetchInterval: 30000, // Refresh every 30s
  });

  // Fetch recent job runs
  const { data: recentRuns, isLoading: runsLoading } = useQuery({
    queryKey: ['cron-job-runs'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_cron_job_runs', { 
        limit_count: 50 
      });
      if (error) throw error;
      return data as CronJobRun[];
    },
    refetchInterval: 30000,
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'succeeded':
        return <CheckCircle2 className="h-4 w-4 text-success" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-destructive" />;
      case 'running':
        return <Clock className="h-4 w-4 text-warning animate-pulse" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (active: boolean) => {
    return active ? (
      <Badge variant="default" className="bg-success">Attivo</Badge>
    ) : (
      <Badge variant="outline">Disabilitato</Badge>
    );
  };

  if (jobsLoading || runsLoading) {
    return (
      <div className="p-8">
        <Card>
          <CardHeader>
            <CardTitle>Caricamento...</CardTitle>
          </CardHeader>
        </Card>
      </div>
    );
  }

  // Group runs by job
  const runsByJob = React.useMemo(() => {
    if (!recentRuns) return {};
    return recentRuns.reduce((acc: Record<number, CronJobRun[]>, run) => {
      if (!acc[run.jobid]) acc[run.jobid] = [];
      acc[run.jobid]!.push(run);
      return acc;
    }, {} as Record<number, CronJobRun[]>);
  }, [recentRuns]);

  return (
    <div className="container mx-auto p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Cron Jobs Health Dashboard</h1>
        <p className="text-muted-foreground">
          Monitoraggio stato e esecuzioni dei job schedulati
        </p>
      </div>

      {/* Jobs Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Job Configurati ({cronJobs?.length || 0})</CardTitle>
          <CardDescription>
            Stato e configurazione dei job pg_cron
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Schedule</TableHead>
                <TableHead>Stato</TableHead>
                <TableHead>Ultime Esecuzioni</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {cronJobs?.map((job) => {
                const runs = runsByJob[job.jobid]?.slice(0, 5) || [];
                const lastRun = runs[0];
                const failedCount = runs.filter(r => r.status === 'failed').length;

                return (
                  <TableRow key={job.jobid}>
                    <TableCell className="font-medium">{job.jobname}</TableCell>
                    <TableCell className="font-mono text-sm">{job.schedule}</TableCell>
                    <TableCell>{getStatusBadge(job.active)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {lastRun && (
                          <>
                            {getStatusIcon(lastRun.status)}
                            <span className="text-sm text-muted-foreground">
                              {format(new Date(lastRun.start_time), "dd MMM HH:mm", { locale: it })}
                            </span>
                          </>
                        )}
                        {failedCount > 0 && (
                          <Badge variant="destructive" className="ml-2">
                            {failedCount} falliti
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Recent Runs */}
      <Card>
        <CardHeader>
          <CardTitle>Esecuzioni Recenti (50 più recenti)</CardTitle>
          <CardDescription>
            Log dettagliato delle esecuzioni cron
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Stato</TableHead>
                <TableHead>Job</TableHead>
                <TableHead>Inizio</TableHead>
                <TableHead>Fine</TableHead>
                <TableHead>Durata</TableHead>
                <TableHead>Messaggio</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentRuns?.map((run) => {
                const job = cronJobs?.find(j => j.jobid === run.jobid);
                const duration = run.end_time 
                  ? Math.round((new Date(run.end_time).getTime() - new Date(run.start_time).getTime()) / 1000)
                  : null;

                return (
                  <TableRow key={`${run.jobid}-${run.runid}`}>
                    <TableCell>{getStatusIcon(run.status)}</TableCell>
                    <TableCell className="font-medium">{job?.jobname || `Job #${run.jobid}`}</TableCell>
                    <TableCell className="text-sm">
                      {format(new Date(run.start_time), "dd MMM HH:mm:ss", { locale: it })}
                    </TableCell>
                    <TableCell className="text-sm">
                      {run.end_time ? format(new Date(run.end_time), "HH:mm:ss", { locale: it }) : '-'}
                    </TableCell>
                    <TableCell className="text-sm">
                      {duration !== null ? `${duration}s` : '-'}
                    </TableCell>
                    <TableCell className="text-sm max-w-xs truncate">
                      {run.return_message || '-'}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};