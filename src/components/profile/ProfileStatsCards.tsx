
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, Star, TrendingUp, Euro } from "lucide-react";
import { Profile } from "@/types/auth";
import { getUserPublicReviews } from "@/lib/user-review-utils";
import { sreLogger } from '@/lib/sre-logger';
import { useProfileRoleDisplay } from '@/hooks/profile/useProfileRoleDisplay';

interface ProfileStatsCardsProps {
  profile: Profile;
}

export function ProfileStatsCards({ profile }: ProfileStatsCardsProps) {
  const navigate = useNavigate();
  const { isHost } = useProfileRoleDisplay();
  const [stats, setStats] = React.useState({
    totalBookings: 0,
    averageRating: 0,
    monthlyGrowth: 0,
    totalEarnings: 0,
    reviewCount: 0
  });

  React.useEffect(() => {
    const fetchStats = async () => {
      if (!profile.id) return;

      try {
        const { supabase } = await import('@/integrations/supabase/client');
        const { startTimer } = await import('@/lib/sre-logger');

        const endTimer = startTimer('profile_stats_fetch', { 
          userId: profile.id
        });

        // OPTIMIZED: Single query with JOINs instead of sequential queries
        if (isHost) {
          // Fetch bookings and payments in one query with JOIN
          const { data: hostData, error: hostError } = await supabase
            .from('bookings')
            .select(`
              id, 
              status, 
              created_at,
              spaces!inner(host_id),
              payments(host_amount, payment_status)
            `)
            .eq('spaces.host_id', profile.id);

          if (hostError) {
            sreLogger.error('Error fetching host stats', {
              component: 'ProfileStatsCards',
              action: 'fetch_host_stats',
              userId: profile.id
            }, hostError instanceof Error ? hostError : new Error(String(hostError)));
            endTimer();
            return;
          }

          const allBookings = hostData || [];
          const earnings = allBookings.reduce((sum, booking) => {
            const completedPayment = booking.payments?.find(
              (p: any) => p.payment_status === 'completed'
            );
            return sum + (completedPayment?.host_amount || 0);
          }, 0);

          // Get reviews in parallel
          const publicReviews = await getUserPublicReviews(profile.id);
          const avgRating = publicReviews?.length > 0 
            ? publicReviews.reduce((sum: number, r: any) => sum + r.rating, 0) / publicReviews.length 
            : 0;

          setStats({
            totalBookings: allBookings.length,
            averageRating: Math.round(avgRating * 10) / 10,
            monthlyGrowth: 0,
            totalEarnings: earnings,
            reviewCount: publicReviews?.length || 0
          });
        } else {
          // Coworker stats - single query
          const { data: coworkerBookings, error: coworkerError } = await supabase
            .from('bookings')
            .select('id, status, created_at')
            .eq('user_id', profile.id);

          if (coworkerError) {
            sreLogger.error('Error fetching coworker stats', {
              component: 'ProfileStatsCards',
              action: 'fetch_coworker_stats',
              userId: profile.id
            }, coworkerError instanceof Error ? coworkerError : new Error(String(coworkerError)));
            endTimer();
            return;
          }

          // Get reviews in parallel
          const publicReviews = await getUserPublicReviews(profile.id);
          const avgRating = publicReviews?.length > 0 
            ? publicReviews.reduce((sum: number, r: any) => sum + r.rating, 0) / publicReviews.length 
            : 0;

          setStats({
            totalBookings: coworkerBookings?.length || 0,
            averageRating: Math.round(avgRating * 10) / 10,
            monthlyGrowth: 0,
            totalEarnings: 0,
            reviewCount: publicReviews?.length || 0
          });
        }

        endTimer();
      } catch (error) {
        sreLogger.error('Error fetching profile stats', {
          component: 'ProfileStatsCards',
          action: 'fetch_stats',
          userId: profile.id
        }, error instanceof Error ? error : new Error(String(error)));
      }
    };

    fetchStats();
  }, [profile.id, isHost]);

  const cards = [
    {
      title: 'Prenotazioni Totali',
      value: stats.totalBookings,
      icon: Calendar,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      description: `Totali: ${stats.totalBookings}`
    },
    {
      title: 'Rating Medio',
      value: `${stats.averageRating}/5`,
      icon: Star,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50',
      description: `Basato su ${stats.reviewCount} recensioni`
    },
    {
      title: 'Crescita Mensile',
      value: `+${stats.monthlyGrowth}%`,
      icon: TrendingUp,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      description: 'Rispetto al mese scorso'
    }
  ];

  // Add earnings card only for hosts
  if (isHost) {
    cards.push({
      title: 'Guadagni Totali',
      value: `€${stats.totalEarnings}`,
      icon: Euro,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      description: 'Questo mese: +€340'
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Le tue Performance
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {cards.map((card) => (
            <div 
              key={card.title} 
              className={`relative p-4 border rounded-lg hover:shadow-md transition-shadow ${
                card.title === 'Rating Medio' ? 'cursor-pointer hover:bg-gray-50' : ''
              }`}
              onClick={card.title === 'Rating Medio' ? () => navigate('/reviews') : undefined}
            >
              <div className="flex items-center justify-between mb-2">
                <div className={`p-2 rounded-lg ${card.bgColor}`}>
                  <card.icon className={`w-4 h-4 ${card.color}`} />
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">{card.title}</p>
                <p className="text-xl font-bold text-gray-900 mb-1">{card.value}</p>
                <p className="text-xs text-gray-500">{card.description}</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
