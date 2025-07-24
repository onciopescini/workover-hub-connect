import { supabase } from "@/integrations/supabase/client";

export interface AIInsight {
  id: string;
  type: 'opportunity' | 'warning' | 'tip' | 'trend';
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  actionable: boolean;
  confidence: number;
  category: 'revenue' | 'bookings' | 'optimization' | 'marketing';
  createdAt: string;
  metadata?: Record<string, any>;
}

export interface MarketAnalysis {
  competitorPricing: {
    your_average: number;
    market_average: number;
    opportunity: string;
  };
  demandForecast: {
    next_week: string;
    next_month: string;
    seasonal_trend: string;
  };
  performance_score: number;
}

export interface InsightMetrics {
  totalRevenue: number;
  bookingCount: number;
  averageRating: number;
  occupancyRate: number;
  cancellationRate: number;
  repeatCustomerRate: number;
}

export const generateAIInsights = async (hostId: string): Promise<AIInsight[]> => {
  try {
    // Get host's real data for analysis
    const metrics = await getHostMetrics(hostId);
    const insights: AIInsight[] = [];

    // Revenue-based insights
    if (metrics.totalRevenue > 0) {
      // Low pricing opportunity
      if (metrics.occupancyRate > 80) {
        insights.push({
          id: 'pricing-opportunity',
          type: 'opportunity',
          title: 'Opportunità Aumento Prezzi',
          description: `Con un tasso di occupazione del ${metrics.occupancyRate}%, potresti aumentare i prezzi del 10-15% mantenendo la domanda alta.`,
          impact: 'high',
          actionable: true,
          confidence: 85,
          category: 'revenue',
          createdAt: new Date().toISOString(),
          metadata: { occupancyRate: metrics.occupancyRate, suggestedIncrease: 12 }
        });
      }

      // Seasonal pricing insight
      const currentMonth = new Date().getMonth();
      if (currentMonth >= 5 && currentMonth <= 8) { // Summer months
        insights.push({
          id: 'seasonal-pricing',
          type: 'tip',
          title: 'Pricing Stagionale Estate',
          description: 'Durante i mesi estivi, considera di implementare prezzi premium per sfruttare la maggiore domanda.',
          impact: 'medium',
          actionable: true,
          confidence: 75,
          category: 'revenue',
          createdAt: new Date().toISOString()
        });
      }
    }

    // Booking-based insights
    if (metrics.cancellationRate > 15) {
      insights.push({
        id: 'high-cancellation',
        type: 'warning',
        title: 'Tasso Cancellazioni Elevato',
        description: `Il tuo tasso di cancellazione è del ${metrics.cancellationRate}%. Considera di implementare una politica di cancellazione più stringente.`,
        impact: 'medium',
        actionable: true,
        confidence: 90,
        category: 'bookings',
        createdAt: new Date().toISOString(),
        metadata: { cancellationRate: metrics.cancellationRate }
      });
    }

    // Rating-based insights
    if (metrics.averageRating < 4.0 && metrics.averageRating > 0) {
      insights.push({
        id: 'rating-improvement',
        type: 'warning',
        title: 'Migliora la Valutazione',
        description: `La tua valutazione media è ${metrics.averageRating.toFixed(1)}/5. Focus su miglioramenti della qualità del servizio.`,
        impact: 'high',
        actionable: true,
        confidence: 95,
        category: 'optimization',
        createdAt: new Date().toISOString(),
        metadata: { currentRating: metrics.averageRating }
      });
    } else if (metrics.averageRating >= 4.5) {
      insights.push({
        id: 'rating-excellence',
        type: 'trend',
        title: 'Eccellente Reputazione',
        description: `La tua valutazione di ${metrics.averageRating.toFixed(1)}/5 è eccellente! Usa questo come vantaggio competitivo nel marketing.`,
        impact: 'medium',
        actionable: true,
        confidence: 90,
        category: 'marketing',
        createdAt: new Date().toISOString()
      });
    }

    // Repeat customer insights
    if (metrics.repeatCustomerRate > 30) {
      insights.push({
        id: 'loyal-customers',
        type: 'trend',
        title: 'Clientela Fedele',
        description: `Il ${metrics.repeatCustomerRate}% dei tuoi clienti torna. Considera un programma fedeltà o sconti per clienti abituali.`,
        impact: 'medium',
        actionable: true,
        confidence: 80,
        category: 'marketing',
        createdAt: new Date().toISOString(),
        metadata: { repeatRate: metrics.repeatCustomerRate }
      });
    }

    // Low occupancy insight
    if (metrics.occupancyRate < 40 && metrics.occupancyRate > 0) {
      insights.push({
        id: 'low-occupancy',
        type: 'warning',
        title: 'Bassa Occupazione',
        description: `Tasso di occupazione del ${metrics.occupancyRate}%. Considera strategie di marketing più aggressive o riduzioni di prezzo temporanee.`,
        impact: 'high',
        actionable: true,
        confidence: 85,
        category: 'optimization',
        createdAt: new Date().toISOString(),
        metadata: { occupancyRate: metrics.occupancyRate }
      });
    }

    // No data insights
    if (metrics.bookingCount === 0) {
      insights.push({
        id: 'no-bookings',
        type: 'warning',
        title: 'Nessuna Prenotazione',
        description: 'Non hai ancora ricevuto prenotazioni. Verifica che i tuoi spazi siano ben configurati e visibili.',
        impact: 'high',
        actionable: true,
        confidence: 100,
        category: 'marketing',
        createdAt: new Date().toISOString()
      });
    }

    return insights;

  } catch (error) {
    console.error('Error generating AI insights:', error);
    return [];
  }
};

export const generateMarketAnalysis = async (hostId: string): Promise<MarketAnalysis> => {
  try {
    const metrics = await getHostMetrics(hostId);
    
    // Mock competitor pricing analysis (in real app, this would use external data)
    const yourAverage = metrics.totalRevenue / Math.max(metrics.bookingCount, 1);
    const marketAverage = yourAverage * (1 + (Math.random() * 0.4 - 0.2)); // ±20% variation
    
    const pricingOpportunity = yourAverage < marketAverage 
      ? `+${((marketAverage - yourAverage) / yourAverage * 100).toFixed(1)}%`
      : `-${((yourAverage - marketAverage) / yourAverage * 100).toFixed(1)}%`;

    // Demand forecast based on current trends
    const getDemandLevel = (rate: number) => {
      if (rate > 70) return 'high';
      if (rate > 40) return 'medium';
      return 'low';
    };

    // Seasonal trends
    const currentMonth = new Date().getMonth();
    let seasonalTrend = 'stable';
    if (currentMonth >= 2 && currentMonth <= 5) seasonalTrend = 'growing';
    if (currentMonth >= 6 && currentMonth <= 8) seasonalTrend = 'peak';
    if (currentMonth >= 9 && currentMonth <= 11) seasonalTrend = 'declining';

    return {
      competitorPricing: {
        your_average: Math.round(yourAverage),
        market_average: Math.round(marketAverage),
        opportunity: pricingOpportunity
      },
      demandForecast: {
        next_week: getDemandLevel(metrics.occupancyRate + Math.random() * 20 - 10),
        next_month: getDemandLevel(metrics.occupancyRate + Math.random() * 30 - 15),
        seasonal_trend: seasonalTrend
      },
      performance_score: Math.min(100, Math.round(
        (metrics.averageRating * 15) + 
        (metrics.occupancyRate * 0.6) + 
        (metrics.repeatCustomerRate * 0.3) + 
        ((100 - metrics.cancellationRate) * 0.4)
      ))
    };

  } catch (error) {
    console.error('Error generating market analysis:', error);
    return {
      competitorPricing: {
        your_average: 0,
        market_average: 0,
        opportunity: '0%'
      },
      demandForecast: {
        next_week: 'medium',
        next_month: 'medium',
        seasonal_trend: 'stable'
      },
      performance_score: 50
    };
  }
};

const getHostMetrics = async (hostId: string): Promise<InsightMetrics> => {
  try {
    // Get revenue and booking data
    const { data: payments, error: paymentsError } = await supabase
      .from('payments')
      .select(`
        host_amount,
        bookings!inner (
          spaces!inner (host_id),
          status,
          cancelled_at
        )
      `)
      .eq('bookings.spaces.host_id', hostId)
      .eq('payment_status', 'completed');

    if (paymentsError) throw paymentsError;

    // Get all bookings for this host
    const { data: allBookings, error: bookingsError } = await supabase
      .from('bookings')
      .select(`
        *,
        spaces!inner (host_id)
      `)
      .eq('spaces.host_id', hostId);

    if (bookingsError) throw bookingsError;

    // Get reviews
    const { data: reviews, error: reviewsError } = await supabase
      .from('booking_reviews')
      .select(`
        rating,
        bookings!inner (
          spaces!inner (host_id)
        )
      `)
      .eq('bookings.spaces.host_id', hostId);

    if (reviewsError) throw reviewsError;

    // Calculate metrics
    const totalRevenue = payments?.reduce((sum, p) => sum + (p.host_amount || 0), 0) || 0;
    const bookingCount = allBookings?.length || 0;
    
    const ratings = reviews?.map(r => r.rating) || [];
    const averageRating = ratings.length > 0 
      ? ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length 
      : 0;

    // Calculate cancellation rate
    const cancelledBookings = allBookings?.filter(b => b.status === 'cancelled').length || 0;
    const cancellationRate = bookingCount > 0 ? (cancelledBookings / bookingCount) * 100 : 0;

    // Calculate repeat customer rate
    const userBookingCounts = new Map();
    allBookings?.forEach(booking => {
      const count = userBookingCounts.get(booking.user_id) || 0;
      userBookingCounts.set(booking.user_id, count + 1);
    });
    
    const repeatCustomers = Array.from(userBookingCounts.values()).filter(count => count > 1).length;
    const totalCustomers = userBookingCounts.size;
    const repeatCustomerRate = totalCustomers > 0 ? (repeatCustomers / totalCustomers) * 100 : 0;

    // Mock occupancy rate (would need more complex calculation with actual spaces and time slots)
    const occupancyRate = Math.min(100, bookingCount * 2); // Simplified calculation

    return {
      totalRevenue,
      bookingCount,
      averageRating,
      occupancyRate,
      cancellationRate,
      repeatCustomerRate
    };

  } catch (error) {
    console.error('Error calculating host metrics:', error);
    return {
      totalRevenue: 0,
      bookingCount: 0,
      averageRating: 0,
      occupancyRate: 0,
      cancellationRate: 0,
      repeatCustomerRate: 0
    };
  }
};