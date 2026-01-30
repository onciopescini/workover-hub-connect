import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  AlertTriangle, 
  Search, 
  RefreshCcw, 
  ShieldCheck, 
  Ticket, 
  FileText,
  Loader2,
  ExternalLink
} from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { toast } from 'sonner';
import { formatCurrency, formatDate } from '@/lib/format';
import { useAdminAlerts } from '@/hooks/admin/useAdminDashboardStats';
import { Link } from 'react-router-dom';

interface DisputedBooking {
  id: string;
  booking_date: string;
  total_price: number | null;
  user_id: string;
  space_id: string | null;
  frozen_reason: string | null;
}

export const AdminActionCenter: React.FC = () => {
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(true);
  const [quickRefundId, setQuickRefundId] = useState('');

  // Fetch alerts
  const { data: alerts } = useAdminAlerts();

  // Fetch disputed bookings
  const { data: disputedBookings, isLoading: isLoadingDisputes } = useQuery<DisputedBooking[]>({
    queryKey: ['admin-disputed-bookings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bookings')
        .select('id, booking_date, total_price, user_id, space_id, frozen_reason')
        .eq('status', 'disputed')
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) throw error;
      return data || [];
    },
  });

  // Quick refund mutation
  const quickRefundMutation = useMutation({
    mutationFn: async (bookingId: string) => {
      const { data, error } = await supabase.functions.invoke('admin-process-refund', {
        body: { 
          bookingId, 
          refundType: 'full', 
          reason: 'Admin quick refund from Action Center' 
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      toast.success('Rimborso elaborato con successo');
      setQuickRefundId('');
      queryClient.invalidateQueries({ queryKey: ['admin-disputed-bookings'] });
      queryClient.invalidateQueries({ queryKey: ['admin_bookings'] });
    },
    onError: (error) => {
      toast.error(`Errore: ${error.message}`);
    },
  });

  const handleQuickRefund = () => {
    if (!quickRefundId.trim()) {
      toast.error('Inserisci un Booking ID valido');
      return;
    }
    quickRefundMutation.mutate(quickRefundId.trim());
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className="border-amber-200 bg-gradient-to-br from-amber-50/50 to-background">
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/30 transition-colors">
            <CardTitle className="flex items-center justify-between text-lg">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
                Action Center
              </div>
              <Badge variant="outline" className="text-amber-700 border-amber-300">
                {(alerts?.pendingKyc || 0) + (alerts?.openTickets || 0) + (alerts?.pendingGdpr || 0)} alerts
              </Badge>
            </CardTitle>
          </CardHeader>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <CardContent className="space-y-6">
            {/* Pending Alerts Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Link 
                to="/admin/kyc"
                className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors"
              >
                <div className="p-2 rounded-full bg-orange-100">
                  <ShieldCheck className="h-4 w-4 text-orange-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">KYC Pending</p>
                  <p className="text-2xl font-bold text-orange-600">{alerts?.pendingKyc || 0}</p>
                </div>
                <ExternalLink className="h-4 w-4 text-muted-foreground" />
              </Link>

              <div className="flex items-center gap-3 p-3 rounded-lg border">
                <div className="p-2 rounded-full bg-blue-100">
                  <Ticket className="h-4 w-4 text-blue-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">Open Tickets</p>
                  <p className="text-2xl font-bold text-blue-600">{alerts?.openTickets || 0}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 rounded-lg border">
                <div className="p-2 rounded-full bg-purple-100">
                  <FileText className="h-4 w-4 text-purple-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">GDPR Requests</p>
                  <p className="text-2xl font-bold text-purple-600">{alerts?.pendingGdpr || 0}</p>
                </div>
              </div>
            </div>

            {/* Quick Refund by ID */}
            <div className="p-4 rounded-lg border bg-background">
              <h4 className="font-medium mb-3 flex items-center gap-2">
                <RefreshCcw className="h-4 w-4" />
                Quick Refund by Booking ID
              </h4>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Inserisci Booking ID..."
                    className="pl-9"
                    value={quickRefundId}
                    onChange={(e) => setQuickRefundId(e.target.value)}
                  />
                </div>
                <Button 
                  onClick={handleQuickRefund}
                  disabled={quickRefundMutation.isPending || !quickRefundId.trim()}
                  className="bg-orange-600 hover:bg-orange-700"
                >
                  {quickRefundMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    'Rimborsa'
                  )}
                </Button>
              </div>
            </div>

            {/* Dispute Resolution Queue */}
            <div className="p-4 rounded-lg border bg-background">
              <h4 className="font-medium mb-3 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-destructive" />
                Dispute Queue ({disputedBookings?.length || 0})
              </h4>
              
              {isLoadingDisputes ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : disputedBookings && disputedBookings.length > 0 ? (
                <div className="space-y-2">
                  {disputedBookings.map((booking) => (
                    <div 
                      key={booking.id} 
                      className="flex items-center justify-between p-3 rounded-lg bg-destructive/5 border border-destructive/20"
                    >
                      <div className="flex-1">
                        <p className="text-sm font-mono text-muted-foreground">
                          #{booking.id.slice(0, 8)}
                        </p>
                        <p className="text-sm">
                          {formatDate(booking.booking_date)} • {formatCurrency(booking.total_price, { cents: true })}
                        </p>
                        {booking.frozen_reason && (
                          <p className="text-xs text-destructive mt-1">{booking.frozen_reason}</p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          size="sm" 
                          variant="outline"
                          className="text-green-600 hover:bg-green-50"
                          onClick={() => {
                            quickRefundMutation.mutate(booking.id);
                          }}
                          disabled={quickRefundMutation.isPending}
                        >
                          Refund Guest
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Nessuna disputa attiva 🎉
                </p>
              )}
            </div>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
};

export default AdminActionCenter;
