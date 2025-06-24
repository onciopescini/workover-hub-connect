import React from 'react';
import { useAuth } from "@/contexts/OptimizedAuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, MessageSquare, Users, Star, CreditCard, FileText } from "lucide-react";
import { format, subDays } from 'date-fns';
import { it } from 'date-fns/locale';

interface AnalyticsData {
  totalRevenue: number;
  totalBookings: number;
  averageRating: number;
  totalMessages: number;
  totalCoworkers: number;
}

const HostAnalytics = () => {
  const { authState } = useAuth();

  const { data: analyticsData, isLoading, error } = useQuery({
    queryKey: ['host-analytics', authState.user?.id],
    queryFn: async () => {
      if (!authState.user?.id) {
        return null;
      }

      // Fetch total revenue
      const { data: revenueData, error: revenueError } = await supabase
        .from('payments')
        .select('amount')
        .eq('host_id', authState.user.id)
        .eq('status', 'completed');

      if (revenueError) {
        console.error('Error fetching revenue:', revenueError);
        throw revenueError;
      }

      const totalRevenue = revenueData?.reduce((sum, payment) => sum + payment.amount, 0) || 0;

      // Fetch total bookings
      const { data: bookingsData, error: bookingsError } = await supabase
        .from('bookings')
        .select('id', { count: 'exact' })
        .eq('host_id', authState.user.id);

      if (bookingsError) {
        console.error('Error fetching bookings:', bookingsError);
        throw bookingsError;
      }

      const totalBookings = bookingsData?.length || 0;

      // Fetch average rating
      const { data: ratingData, error: ratingError } = await supabase
        .from('reviews')
        .select('rating')
        .eq('host_id', authState.user.id);

      if (ratingError) {
        console.error('Error fetching ratings:', ratingError);
        throw ratingError;
      }

      const totalRatings = ratingData?.reduce((sum, review) => sum + review.rating, 0) || 0;
      const averageRating = ratingData?.length ? totalRatings / ratingData.length : 0;

      // Fetch total messages
      const { data: messagesData, error: messagesError } = await supabase
        .from('messages')
        .select('id', { count: 'exact' })
        .eq('host_id', authState.user.id);

      if (messagesError) {
        console.error('Error fetching messages:', messagesError);
        throw messagesError;
      }

      const totalMessages = messagesData?.length || 0;

      // Fetch total coworkers
      const { data: coworkersData, error: coworkersError } = await supabase
        .from('bookings')
        .select('user_id', { count: 'distinct' })
        .eq('host_id', authState.user.id);

      if (coworkersError) {
        console.error('Error fetching coworkers:', coworkersError);
        throw coworkersError;
      }

      const totalCoworkers = coworkersData?.length || 0;

      return {
        totalRevenue,
        totalBookings,
        averageRating,
        totalMessages,
        totalCoworkers,
      };
    },
    enabled: !!authState.user?.id,
  });

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>Error: {error.message}</div>;
  }

  if (!analyticsData) {
    return <div>No data available.</div>;
  }

  return (
    <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Guadagno Totale
          </CardTitle>
          <CreditCard className="h-4 w-4 text-gray-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">€{analyticsData.totalRevenue.toFixed(2)}</div>
          <p className="text-xs text-gray-500">
            Incasso totale da tutte le prenotazioni
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Prenotazioni Totali
          </CardTitle>
          <Calendar className="h-4 w-4 text-gray-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{analyticsData.totalBookings}</div>
          <p className="text-xs text-gray-500">
            Numero totale di prenotazioni ricevute
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Valutazione Media
          </CardTitle>
          <Star className="h-4 w-4 text-gray-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{analyticsData.averageRating.toFixed(1)}</div>
          <p className="text-xs text-gray-500">
            Valutazione media basata sulle recensioni
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Messaggi Totali
          </CardTitle>
          <MessageSquare className="h-4 w-4 text-gray-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{analyticsData.totalMessages}</div>
          <p className="text-xs text-gray-500">
            Numero totale di messaggi ricevuti
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Coworkers Unici
          </CardTitle>
          <Users className="h-4 w-4 text-gray-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{analyticsData.totalCoworkers}</div>
          <p className="text-xs text-gray-500">
            Numero totale di coworkers che hanno prenotato
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default HostAnalytics;
