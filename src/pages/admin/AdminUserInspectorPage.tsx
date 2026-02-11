import { FormEvent, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { AlertTriangle, Calendar, ExternalLink, Loader2, ShieldAlert, UserCheck, UserX } from 'lucide-react';
import { toast } from 'sonner';

import { ADMIN_RPC, ADMIN_ROUTES } from '@/constants';
import { useAdminUserInspector } from '@/hooks/admin/useAdminUserInspector';
import { supabase } from '@/integrations/supabase/client';
import { queryKeys } from '@/lib/react-query-config';
import { AdminUserInspectorBooking } from '@/types/admin-user-inspector';

import LoadingScreen from '@/components/LoadingScreen';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';

const formatDateTime = (value: string | null): string => {
  if (!value) {
    return 'N/A';
  }

  return format(new Date(value), 'dd MMM yyyy, HH:mm', { locale: it });
};

const formatDate = (value: string): string => format(new Date(value), 'dd MMM yyyy', { locale: it });

const BookingListCard = ({
  title,
  emptyMessage,
  bookings,
}: {
  title: string;
  emptyMessage: string;
  bookings: AdminUserInspectorBooking[];
}) => (
  <Card>
    <CardHeader>
      <CardTitle className="text-base">{title}</CardTitle>
    </CardHeader>
    <CardContent className="space-y-3">
      {bookings.length === 0 ? (
        <p className="text-sm text-muted-foreground">{emptyMessage}</p>
      ) : (
        bookings.map((booking) => (
          <div key={booking.id} className="rounded-md border p-3 text-sm">
            <div className="flex items-center justify-between gap-2">
              <Badge variant="outline">{booking.status ?? 'unknown'}</Badge>
              <span className="text-xs text-muted-foreground">{formatDate(booking.booking_date)}</span>
            </div>
            <div className="mt-2 font-medium">{booking.space_title ?? 'Space removed'}</div>
            {booking.space_id ? (
              <Link to={`/spaces/${booking.space_id}`} className="mt-1 inline-flex items-center text-xs text-primary hover:underline">
                Vai allo spazio <ExternalLink className="ml-1 h-3 w-3" />
              </Link>
            ) : null}
          </div>
        ))
      )}
    </CardContent>
  </Card>
);

const AdminUserInspectorPage = () => {
  const { id } = useParams<{ id: string }>();
  const userId = id ?? '';
  const [isSuspendDialogOpen, setIsSuspendDialogOpen] = useState(false);
  const [suspensionReason, setSuspensionReason] = useState('');

  const queryClient = useQueryClient();
  const { data, isLoading, isError, error } = useAdminUserInspector(userId);

  const suspendMutation = useMutation({
    mutationFn: async (reason: string) => {
      const { error: suspendError } = await supabase.rpc(ADMIN_RPC.SUSPEND_USER, {
        target_id: userId,
        reason,
      });

      if (suspendError) {
        throw suspendError;
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.admin.userInspector(userId) });
      await queryClient.invalidateQueries({ queryKey: queryKeys.admin.users() });
      toast.success('Utente sospeso correttamente');
      setSuspensionReason('');
      setIsSuspendDialogOpen(false);
    },
    onError: (mutationError: Error) => {
      toast.error(`Impossibile sospendere utente: ${mutationError.message}`);
    },
  });

  const fullName = useMemo(() => {
    if (!data?.profile) {
      return '';
    }

    return `${data.profile.first_name} ${data.profile.last_name}`.trim();
  }, [data?.profile]);

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (!userId) {
    return <div className="rounded-md border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">Missing user id.</div>;
  }

  if (isError || !data) {
    return (
      <div className="rounded-md border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
        Error loading inspector: {(error as Error | null)?.message ?? 'Unknown error'}
      </div>
    );
  }

  const isSuspended = data.profile.status === 'suspended' || Boolean(data.profile.is_suspended);

  const handleSuspendSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await suspendMutation.mutateAsync(suspensionReason.trim());
  };

  return (
    <div className="space-y-6">
      <header className="rounded-lg border bg-card p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <Avatar className="h-14 w-14">
              <AvatarImage src={data.profile.profile_photo_url ?? undefined} />
              <AvatarFallback>{(fullName[0] ?? data.profile.email[0] ?? '?').toUpperCase()}</AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-2xl font-bold">{fullName || 'Unnamed user'}</h1>
              <p className="text-muted-foreground">{data.profile.email}</p>
              <div className="mt-2 flex items-center gap-2">
                {isSuspended ? (
                  <Badge variant="destructive" className="gap-1">
                    <UserX className="h-3 w-3" /> Suspended
                  </Badge>
                ) : (
                  <Badge variant="outline" className="gap-1 border-green-300 bg-green-50 text-green-700">
                    <UserCheck className="h-3 w-3" /> Active
                  </Badge>
                )}
                <Badge variant="outline" className="gap-1">
                  <Calendar className="h-3 w-3" /> Joined {formatDate(data.profile.created_at)}
                </Badge>
              </div>
            </div>
          </div>

          <Button asChild variant="outline">
            <Link to={ADMIN_ROUTES.USERS}>Torna alla lista utenti</Link>
          </Button>
        </div>
      </header>

      <section className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Stripe Connect</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Connected</span>
              <Badge variant={data.stripe_status.stripe_connected ? 'default' : 'secondary'}>
                {data.stripe_status.stripe_connected ? 'Yes' : 'No'}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Onboarding</span>
              <Badge variant="outline">
                {data.stripe_status.stripe_onboarding_status === 'complete' ? 'Complete' : 'Pending'}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Spazi Host</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {data.host_spaces.length === 0 ? (
              <p className="text-muted-foreground">Nessuno spazio host registrato.</p>
            ) : (
              data.host_spaces.map((space) => (
                <div key={space.id} className="flex items-center justify-between rounded-md border p-2">
                  <div>
                    <p className="font-medium">{space.title}</p>
                    <p className="text-xs text-muted-foreground">Creato il {formatDate(space.created_at)}</p>
                  </div>
                  <Badge variant={space.status === 'active' ? 'default' : 'destructive'}>{space.status}</Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <BookingListCard
          title="Prenotazioni come Guest"
          emptyMessage="Nessuna prenotazione guest recente"
          bookings={data.recent_bookings_as_guest}
        />
        <BookingListCard
          title="Prenotazioni come Host"
          emptyMessage="Nessuna prenotazione host recente"
          bookings={data.recent_bookings_as_host}
        />
      </section>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Audit logs</CardTitle>
        </CardHeader>
        <CardContent>
          {data.admin_logs.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nessun evento amministrativo recente.</p>
          ) : (
            <div className="space-y-3">
              {data.admin_logs.map((log, index) => (
                <div key={log.id}>
                  <div className="flex items-start justify-between gap-4 text-sm">
                    <div>
                      <p className="font-medium">{log.action}</p>
                      <p className="text-xs text-muted-foreground">admin: {log.admin_id}</p>
                    </div>
                    <span className="text-xs text-muted-foreground">{formatDateTime(log.created_at)}</span>
                  </div>
                  {index < data.admin_logs.length - 1 ? <Separator className="mt-3" /> : null}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-destructive/40 bg-destructive/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base text-destructive">
            <ShieldAlert className="h-4 w-4" /> Emergency Actions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Dialog open={isSuspendDialogOpen} onOpenChange={setIsSuspendDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="destructive" disabled={isSuspended}>
                <AlertTriangle className="mr-2 h-4 w-4" /> Sospendi utente
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Conferma sospensione</DialogTitle>
                <DialogDescription>
                  Inserisci un motivo obbligatorio. Questa azione blocca l&apos;utente sulla piattaforma.
                </DialogDescription>
              </DialogHeader>

              <form className="space-y-4" onSubmit={handleSuspendSubmit}>
                <div className="space-y-2">
                  <label className="text-sm font-medium" htmlFor="suspension-reason">
                    Motivo della sospensione
                  </label>
                  <Textarea
                    id="suspension-reason"
                    placeholder="Es: abuso della piattaforma, frode, violazione termini..."
                    value={suspensionReason}
                    onChange={(event) => setSuspensionReason(event.target.value)}
                    minLength={3}
                    required
                  />
                </div>

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsSuspendDialogOpen(false)}>
                    Annulla
                  </Button>
                  <Button type="submit" variant="destructive" disabled={suspendMutation.isPending || suspensionReason.trim().length < 3}>
                    {suspendMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Conferma sospensione
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

          {isSuspended ? (
            <p className="mt-3 text-sm text-destructive">Utente già sospeso.</p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminUserInspectorPage;
