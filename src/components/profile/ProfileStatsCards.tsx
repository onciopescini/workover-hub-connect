
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, Star, TrendingUp, Euro } from "lucide-react";
import { Profile } from "@/types/auth";
import { getUserPublicReviews } from "@/lib/user-review-utils";

interface ProfileStatsCardsProps {
  profile: Profile;
}

export function ProfileStatsCards({ profile }: ProfileStatsCardsProps) {
  const navigate = useNavigate();
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

        // Get bookings count
        let allBookings: any[] = [];
        
        if (profile.role === 'host') {
          // For hosts, get bookings through spaces
          const { data: spaces } = await supabase
            .from('spaces')
            .select('id')
            .eq('host_id', profile.id);
          
          if (spaces && spaces.length > 0) {
            const { data: hostBookingsData } = await supabase
              .from('bookings')
              .select('id, status, created_at')
              .in('space_id', spaces.map(s => s.id));
            allBookings = hostBookingsData || [];
          }
        } else {
          // For coworkers, get their bookings directly
          const { data: bookings } = await supabase
            .from('bookings')
            .select('id, status, created_at')
            .eq('user_id', profile.id);
          allBookings = bookings || [];
        }

        // Get reviews using the secure RPC function
        const publicReviews = await getUserPublicReviews(profile.id);

        const avgRating = publicReviews && publicReviews.length > 0 
          ? publicReviews.reduce((sum: number, r: any) => sum + r.rating, 0) / publicReviews.length 
          : 0;

        // Get earnings for hosts
        let earnings = 0;
        if (profile.role === 'host' && allBookings.length > 0) {
          const { data: payments } = await supabase
            .from('payments')
            .select('host_amount')
            .in('booking_id', allBookings.map(b => b.id))
            .eq('payment_status', 'completed');
          
          earnings = payments?.reduce((sum, p) => sum + (p.host_amount || 0), 0) || 0;
        }

        setStats({
          totalBookings: allBookings.length,
          averageRating: Math.round(avgRating * 10) / 10,
          monthlyGrowth: 0, // Could calculate based on bookings trend
          totalEarnings: earnings,
          reviewCount: publicReviews?.length || 0
        });
      } catch (error) {
        console.error('Error fetching profile stats:', error);
      }
    };

    fetchStats();
  }, [profile.id, profile.role]);

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
  if (profile.role === 'host') {
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
