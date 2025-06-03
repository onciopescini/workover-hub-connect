
import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { CreditCard } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

import { useAsyncOperation } from "@/hooks/useAsyncOperation";
import { LoadingCard } from "@/components/shared/LoadingCard";
import { PaymentStats } from "./PaymentStats";
import { PaymentFilters } from "./PaymentFilters";
import { PaymentsList } from "./PaymentsList";
import { PaymentWithDetails } from "@/types/payment";

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
    failedPayments: 0,
    hostEarnings: 0,
    platformFees: 0
  });

  const { execute: executeWithLoading } = useAsyncOperation({
    errorMessage: 'Errore nel caricamento dei pagamenti'
  });

  const { execute: executeRetryPayment } = useAsyncOperation({
    successMessage: 'Tentativo di pagamento avviato',
    errorMessage: 'Errore nel tentativo di pagamento'
  });

  useEffect(() => {
    fetchPayments();
  }, [filter, timeRange]);

  const fetchPayments = async () => {
    if (!authState.user) return;
    
    await executeWithLoading(async () => {
      setIsLoading(true);
      const dateThreshold = new Date();
      dateThreshold.setDate(dateThreshold.getDate() - parseInt(timeRange));

      if (authState.profile?.role === 'host') {
        // Query per host: mostra pagamenti per i suoi spazi
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
            stripe_transfer_id,
            host_amount,
            platform_fee,
            created_at,
            bookings!inner(
              booking_date,
              status,
              spaces!inner(
                title,
                host_id
              )
            )
          `)
          .gte('created_at', dateThreshold.toISOString())
          .eq('bookings.spaces.host_id', authState.user.id)
          .order('created_at', { ascending: false });

        if (hostError) {
          console.error('Host payments fetch error:', hostError);
          throw hostError;
        }

        // Get user profiles
        const userIds = hostPayments?.map(p => p.user_id) || [];
        let profiles: any[] = [];
        
        if (userIds.length > 0) {
          const { data: profilesData, error: profilesError } = await supabase
            .from('profiles')
            .select('id, first_name, last_name')
            .in('id', userIds);

          if (profilesError) {
            console.error('Profiles fetch error:', profilesError);
            throw profilesError;
          }
          profiles = profilesData || [];
        }

        // Transform data
        const transformedPayments: PaymentWithDetails[] = (hostPayments || []).map(payment => {
          const userProfile = profiles?.find(p => p.id === payment.user_id);
          return {
            id: payment.id,
            user_id: payment.user_id,
            booking_id: payment.booking_id,
            amount: payment.amount,
            currency: payment.currency,
            payment_status: payment.payment_status,
            method: payment.method,
            receipt_url: payment.receipt_url,
            stripe_session_id: payment.stripe_session_id,
            stripe_transfer_id: payment.stripe_transfer_id,
            host_amount: payment.host_amount,
            platform_fee: payment.platform_fee,
            created_at: payment.created_at,
            booking: payment.bookings ? {
              booking_date: payment.bookings.booking_date,
              status: payment.bookings.status,
              space: {
                title: payment.bookings.spaces?.title || '',
                host_id: payment.bookings.spaces?.host_id || ''
              }
            } : null,
            user: userProfile ? {
              first_name: userProfile.first_name,
              last_name: userProfile.last_name
            } : null
          };
        });

        let finalPayments = transformedPayments;
        if (filter !== 'all') {
          finalPayments = transformedPayments.filter(payment => payment.payment_status === filter);
        }

        setPayments(finalPayments);
        
        // Calculate stats for hosts
        const statsResult = transformedPayments.reduce((acc, payment) => {
          if (payment.payment_status === 'completed') {
            acc.totalRevenue += payment.amount;
            acc.completedPayments++;
            acc.hostEarnings += payment.host_amount || 0;
            acc.platformFees += payment.platform_fee || 0;
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
          failedPayments: 0,
          hostEarnings: 0,
          platformFees: 0
        });

        setStats(statsResult);
      } else {
        // Query per coworker: mostra i loro pagamenti
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
            stripe_transfer_id,
            host_amount,
            platform_fee,
            created_at,
            bookings(
              booking_date,
              status,
              spaces(
                title,
                host_id
              )
            )
          `)
          .eq('user_id', authState.user.id)
          .gte('created_at', dateThreshold.toISOString())
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Coworker payments fetch error:', error);
          throw error;
        }

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
          stripe_transfer_id: payment.stripe_transfer_id,
          host_amount: payment.host_amount,
          platform_fee: payment.platform_fee,
          created_at: payment.created_at,
          booking: payment.bookings ? {
            booking_date: payment.bookings.booking_date,
            status: payment.bookings.status,
            space: {
              title: payment.bookings.spaces?.title || '',
              host_id: payment.bookings.spaces?.host_id || ''
            }
          } : null,
          user: null
        }));

        let finalPayments = transformedPayments;
        if (filter !== 'all') {
          finalPayments = transformedPayments.filter(payment => payment.payment_status === filter);
        }

        setPayments(finalPayments);
        
        // Calculate stats for coworkers
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
          failedPayments: 0,
          hostEarnings: 0,
          platformFees: 0
        });

        setStats(statsResult);
      }
      setIsLoading(false);
    });
  };

  const retryPayment = async (paymentId: string, bookingId: string, amount: number) => {
    await executeRetryPayment(async () => {
      const { data, error } = await supabase.functions.invoke('create-payment-session', {
        body: {
          booking_id: bookingId,
          base_amount: amount,
          platform_fee: amount * 0.05,
          total_amount: amount + (amount * 0.05),
          currency: 'EUR',
          user_id: authState.user?.id
        }
      });

      if (error) throw error;

      if (data?.payment_url) {
        window.open(data.payment_url, '_blank');
      }
    });
  };

  const downloadReceipt = (receiptUrl: string) => {
    if (receiptUrl) {
      window.open(receiptUrl, '_blank');
    } else {
      toast.error('Ricevuta non disponibile');
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <LoadingCard key={i} rows={2} />
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
        
        <PaymentFilters
          timeRange={timeRange}
          filter={filter}
          onTimeRangeChange={setTimeRange}
          onFilterChange={setFilter}
        />
      </div>

      <PaymentStats 
        stats={stats} 
        timeRange={timeRange} 
        userRole={authState.profile?.role} 
      />

      <PaymentsList
        payments={payments}
        userRole={authState.profile?.role}
        onRetryPayment={retryPayment}
        onDownloadReceipt={downloadReceipt}
      />
    </div>
  );
}
