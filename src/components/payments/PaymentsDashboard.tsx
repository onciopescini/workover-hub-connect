import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  CreditCard, 
  DollarSign, 
  TrendingUp, 
  Download, 
  Eye,
  CheckCircle,
  Clock,
  XCircle,
  AlertCircle,
  RefreshCw
} from "lucide-react";

interface PaymentWithDetails {
  id: string;
  user_id: string;
  booking_id: string;
  amount: number;
  currency: string;
  payment_status: string;
  method?: string;
  receipt_url?: string;
  stripe_session_id?: string;
  created_at: string;
  booking: {
    booking_date: string;
    status: string;
    space: {
      title: string;
      host_id: string;
    };
  } | null;
  user: {
    first_name: string;
    last_name: string;
  } | null;
}

export function PaymentsDashboard() {
  const { authState } = useAuth();
  const [payments, setPayments] = useState<PaymentWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [timeRange, setTimeRange] = useState('30');
  const [stats, setStats] = useState({
    totalRevenue: 0,
    pendingPayments: 0,
    completedPayments: 0,
    failedPayments: 0
  });

  useEffect(() => {
    fetchPayments();
  }, [filter, timeRange]);

  const fetchPayments = async () => {
    if (!authState.user) return;
    
    setIsLoading(true);
    try {
      const dateThreshold = new Date();
      dateThreshold.setDate(dateThreshold.getDate() - parseInt(timeRange));

      if (authState.profile?.role === 'host') {
        // For hosts, get payments for their spaces
        const { data: hostPayments, error: hostError } = await supabase
          .from('payments')
          .select(`
            id,
            user_id,
            booking_id,
            amount,
            currency,
            payment_status,
            method,
            receipt_url,
            stripe_session_id,
            created_at,
            bookings!inner(
              booking_date,
              status,
              spaces!inner(
                title,
                host_id
              )
            ),
            profiles(
              first_name,
              last_name
            )
          `)
          .gte('created_at', dateThreshold.toISOString())
          .eq('bookings.spaces.host_id', authState.user.id)
          .order('created_at', { ascending: false });

        if (hostError) throw hostError;

        // Transform the data to match our interface
        const transformedPayments: PaymentWithDetails[] = (hostPayments || []).map(payment => ({
          id: payment.id,
          user_id: payment.user_id,
          booking_id: payment.booking_id,
          amount: payment.amount,
          currency: payment.currency,
          payment_status: payment.payment_status,
          method: payment.method,
          receipt_url: payment.receipt_url,
          stripe_session_id: payment.stripe_session_id,
          created_at: payment.created_at,
          booking: payment.bookings ? {
            booking_date: payment.bookings.booking_date,
            status: payment.bookings.status,
            space: {
              title: payment.bookings.spaces?.title || '',
              host_id: payment.bookings.spaces?.host_id || ''
            }
          } : null,
          user: payment.profiles ? {
            first_name: payment.profiles.first_name,
            last_name: payment.profiles.last_name
          } : null
        }));

        let finalPayments = transformedPayments;
        if (filter !== 'all') {
          finalPayments = transformedPayments.filter(payment => payment.payment_status === filter);
        }

        setPayments(finalPayments);
        
        // Calculate stats
        const statsResult = transformedPayments.reduce((acc, payment) => {
          if (payment.payment_status === 'completed') {
            acc.totalRevenue += payment.amount;
            acc.completedPayments++;
          } else if (payment.payment_status === 'pending') {
            acc.pendingPayments++;
          } else if (payment.payment_status === 'failed') {
            acc.failedPayments++;
          }
          return acc;
        }, {
          totalRevenue: 0,
          pendingPayments: 0,
          completedPayments: 0,
          failedPayments: 0
        });

        setStats(statsResult);
      } else {
        // For regular users, get their own payments
        const { data, error } = await supabase
          .from('payments')
          .select(`
            id,
            user_id,
            booking_id,
            amount,
            currency,
            payment_status,
            method,
            receipt_url,
            stripe_session_id,
            created_at,
            bookings(
              booking_date,
              status,
              spaces(
                title,
                host_id
              )
            ),
            profiles(
              first_name,
              last_name
            )
          `)
          .eq('user_id', authState.user.id)
          .gte('created_at', dateThreshold.toISOString())
          .order('created_at', { ascending: false });

        if (error) throw error;

        // Transform the data to match our interface
        const transformedPayments: PaymentWithDetails[] = (data || []).map(payment => ({
          id: payment.id,
          user_id: payment.user_id,
          booking_id: payment.booking_id,
          amount: payment.amount,
          currency: payment.currency,
          payment_status: payment.payment_status,
          method: payment.method,
          receipt_url: payment.receipt_url,
          stripe_session_id: payment.stripe_session_id,
          created_at: payment.created_at,
          booking: payment.bookings ? {
            booking_date: payment.bookings.booking_date,
            status: payment.bookings.status,
            space: {
              title: payment.bookings.spaces?.title || '',
              host_id: payment.bookings.spaces?.host_id || ''
            }
          } : null,
          user: payment.profiles ? {
            first_name: payment.profiles.first_name,
            last_name: payment.profiles.last_name
          } : null
        }));

        let finalPayments = transformedPayments;
        if (filter !== 'all') {
          finalPayments = transformedPayments.filter(payment => payment.payment_status === filter);
        }

        setPayments(finalPayments);
        
        // Calculate stats
        const statsResult = transformedPayments.reduce((acc, payment) => {
          if (payment.payment_status === 'completed') {
            acc.totalRevenue += payment.amount;
            acc.completedPayments++;
          } else if (payment.payment_status === 'pending') {
            acc.pendingPayments++;
          } else if (payment.payment_status === 'failed') {
            acc.failedPayments++;
          }
          return acc;
        }, {
          totalRevenue: 0,
          pendingPayments: 0,
          completedPayments: 0,
          failedPayments: 0
        });

        setStats(statsResult);
      }
    } catch (error) {
      console.error('Error fetching payments:', error);
      toast.error('Errore nel caricamento dei pagamenti');
    } finally {
      setIsLoading(false);
    }
  };

  const retryPayment = async (paymentId: string, bookingId: string, amount: number) => {
    try {
      // Create new payment session
      const { data, error } = await supabase.functions.invoke('create-payment-session', {
        body: {
          booking_id: bookingId,
          amount: Math.round(amount * 100),
          currency: 'EUR',
          user_id: authState.user?.id
        }
      });

      if (error) throw error;

      if (data?.payment_url) {
        window.open(data.payment_url, '_blank');
      }
    } catch (error) {
      console.error('Error retrying payment:', error);
      toast.error('Errore nel tentativo di pagamento');
    }
  };

  const downloadReceipt = (receiptUrl: string) => {
    if (receiptUrl) {
      window.open(receiptUrl, '_blank');
    } else {
      toast.error('Ricevuta non disponibile');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge variant="default"><CheckCircle className="w-3 h-3 mr-1" />Completato</Badge>;
      case 'pending':
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />In sospeso</Badge>;
      case 'failed':
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Fallito</Badge>;
      case 'cancelled':
        return <Badge variant="outline"><XCircle className="w-3 h-3 mr-1" />Annullato</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse space-y-3">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-8 bg-gray-200 rounded w-1/2"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CreditCard className="w-6 h-6 text-green-500" />
          <h2 className="text-2xl font-bold">Dashboard Pagamenti</h2>
        </div>
        
        <div className="flex gap-3">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Periodo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Ultimi 7 giorni</SelectItem>
              <SelectItem value="30">Ultimi 30 giorni</SelectItem>
              <SelectItem value="90">Ultimi 3 mesi</SelectItem>
              <SelectItem value="365">Ultimo anno</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Stato" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tutti</SelectItem>
              <SelectItem value="completed">Completati</SelectItem>
              <SelectItem value="pending">In sospeso</SelectItem>
              <SelectItem value="failed">Falliti</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {authState.profile?.role === 'host' ? 'Ricavi Totali' : 'Speso Totale'}
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">€{stats.totalRevenue.toFixed(2)}</div>
            <Badge variant="secondary" className="mt-1">
              <TrendingUp className="w-3 h-3 mr-1" />
              Ultimi {timeRange} giorni
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pagamenti Completati</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.completedPayments}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Sospeso</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendingPayments}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Falliti</CardTitle>
            <XCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.failedPayments}</div>
          </CardContent>
        </Card>
      </div>

      {/* Payments List */}
      <Card>
        <CardHeader>
          <CardTitle>Lista Pagamenti</CardTitle>
        </CardHeader>
        <CardContent>
          {payments.length === 0 ? (
            <div className="text-center py-8">
              <CreditCard className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Nessun pagamento
              </h3>
              <p className="text-gray-600">
                Non ci sono pagamenti per il periodo selezionato.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {payments.map((payment) => (
                <div key={payment.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className="font-semibold">
                        {payment.booking?.space?.title || 'Spazio non disponibile'}
                      </h4>
                      {getStatusBadge(payment.payment_status)}
                    </div>
                    
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <span>€{payment.amount.toFixed(2)}</span>
                      <span>
                        {authState.profile?.role === 'host' 
                          ? `Cliente: ${payment.user?.first_name || ''} ${payment.user?.last_name || ''}`
                          : `Data: ${payment.booking?.booking_date ? new Date(payment.booking.booking_date).toLocaleDateString('it-IT') : 'N/A'}`
                        }
                      </span>
                      <span>{new Date(payment.created_at).toLocaleDateString('it-IT')}</span>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    {payment.payment_status === 'failed' && authState.profile?.role !== 'host' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => retryPayment(payment.id, payment.booking_id, payment.amount)}
                      >
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Riprova
                      </Button>
                    )}
                    
                    {payment.receipt_url && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => downloadReceipt(payment.receipt_url!)}
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Ricevuta
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
