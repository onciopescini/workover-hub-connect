import React, { useState } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TrendingUp, TrendingDown, Calendar, Users, Euro, BarChart3, ArrowLeft, Filter, Star } from 'lucide-react';
import { StarRating } from '@/components/ui/StarRating';
import { useSpaceMetrics } from '@/hooks/queries/useSpaceMetrics';
import { useSpaceReviewsWithRating } from '@/hooks/queries/useSpaceReviewsQuery';
import { calculateSpaceReviewStats, formatSpaceReviewAuthor, getTimeSinceSpaceReview } from '@/lib/space-review-service';
import { Link } from 'react-router-dom';

const SpaceRecap = () => {
  const { spaceId } = useParams<{ spaceId: string }>();
  const [ratingFilter, setRatingFilter] = useState<string>('all');
  const [sortOrder, setSortOrder] = useState<string>('newest');

  if (!spaceId) {
    return <Navigate to="/host/spaces" replace />;
  }

  const { data: metrics, isLoading: metricsLoading, error: metricsError } = useSpaceMetrics(spaceId);
  const { reviews, weightedRating, isLoading: reviewsLoading } = useSpaceReviewsWithRating(spaceId);

  const isLoading = metricsLoading || reviewsLoading;

  if (metricsError) {
    return (
      <AppLayout>
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-destructive mb-4">Errore</h1>
            <p className="text-muted-foreground mb-4">Impossibile caricare le metriche dello spazio.</p>
            <Link to="/host/spaces">
              <Button variant="outline">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Torna alla gestione spazi
              </Button>
            </Link>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (isLoading) {
    return (
      <AppLayout>
        <div className="container mx-auto px-4 py-8">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-muted rounded w-64"></div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-32 bg-muted rounded"></div>
              ))}
            </div>
            <div className="h-96 bg-muted rounded"></div>
          </div>
        </div>
      </AppLayout>
    );
  }

  const stats = calculateSpaceReviewStats(reviews);
  
  const filteredReviews = reviews.filter(review => {
    if (ratingFilter === 'all') return true;
    return review.rating === parseInt(ratingFilter);
  }).sort((a, b) => {
    if (sortOrder === 'newest') {
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    } else {
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    }
  });

  // renderStars removed in favor of StarRating component

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  };

  const formatGrowth = (growth: number) => {
    const isPositive = growth >= 0;
    const Icon = isPositive ? TrendingUp : TrendingDown;
    const colorClass = isPositive ? 'text-success' : 'text-destructive';
    
    return (
      <div className={`flex items-center gap-1 ${colorClass}`}>
        <Icon className="w-4 h-4" />
        <span className="text-sm font-medium">{Math.abs(growth)}%</span>
      </div>
    );
  };

  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-8 space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <Link to="/host/spaces">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Gestione Spazi
                </Button>
              </Link>
              <Separator orientation="vertical" className="h-6" />
              <div className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-primary" />
                <h1 className="text-2xl font-bold">Recap Spazio</h1>
              </div>
            </div>
            <h2 className="text-xl text-muted-foreground">{metrics?.space_title}</h2>
          </div>
          <div className="flex items-center gap-3">
            <StarRating rating={Math.round(weightedRating)} size="lg" readOnly fillColorClass="text-warning fill-warning" />
            <span className="text-2xl font-bold">{weightedRating.toFixed(1)}</span>
            <Badge variant="outline">{metrics?.total_reviews} recensioni</Badge>
          </div>
        </div>

        {/* Metriche principali */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Prenotazioni Totali</CardTitle>
              <Calendar className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics?.total_bookings}</div>
              <div className="flex items-center justify-between mt-2">
                <p className="text-xs text-muted-foreground">Questo mese: {metrics?.monthly_bookings}</p>
                {formatGrowth(metrics?.booking_growth || 0)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Revenue Totale</CardTitle>
              <Euro className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(metrics?.total_revenue || 0)}</div>
              <div className="flex items-center justify-between mt-2">
                <p className="text-xs text-muted-foreground">Questo mese: {formatCurrency(metrics?.monthly_revenue || 0)}</p>
                {formatGrowth(metrics?.revenue_growth || 0)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tasso Occupazione</CardTitle>
              <Users className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics?.occupancy_rate}%</div>
              <p className="text-xs text-muted-foreground mt-2">
                {metrics?.booked_days_last_30} giorni prenotati (ultimi 30gg)
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Confermate</CardTitle>
              <div className="w-3 h-3 rounded-full bg-success"></div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-success">{metrics?.confirmed_bookings}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">In Attesa</CardTitle>
              <div className="w-3 h-3 rounded-full bg-warning"></div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-warning">{metrics?.pending_bookings}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Cancellate</CardTitle>
              <div className="w-3 h-3 rounded-full bg-destructive"></div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">{metrics?.cancelled_bookings}</div>
            </CardContent>
          </Card>
        </div>

        {/* Sezione Recensioni */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-semibold">Recensioni ({reviews.length})</CardTitle>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4" />
                  <Select value={ratingFilter} onValueChange={setRatingFilter}>
                    <SelectTrigger className="w-32">
                      <SelectValue placeholder="Filtra" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tutte</SelectItem>
                      <SelectItem value="5">5 stelle</SelectItem>
                      <SelectItem value="4">4 stelle</SelectItem>
                      <SelectItem value="3">3 stelle</SelectItem>
                      <SelectItem value="2">2 stelle</SelectItem>
                      <SelectItem value="1">1 stella</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Select value={sortOrder} onValueChange={setSortOrder}>
                  <SelectTrigger className="w-36">
                    <SelectValue placeholder="Ordina" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="newest">Più recenti</SelectItem>
                    <SelectItem value="oldest">Più vecchie</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {filteredReviews.length === 0 ? (
              <div className="text-center py-12">
                <Star className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">
                  {ratingFilter === 'all' ? 'Nessuna recensione' : 'Nessuna recensione con questo filtro'}
                </h3>
                <p className="text-muted-foreground">
                  {ratingFilter === 'all' 
                    ? 'Le recensioni appariranno qui dopo le prime prenotazioni.' 
                    : 'Prova a cambiare i filtri per vedere altre recensioni.'}
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {filteredReviews.map((review, index) => (
                  <div key={review.id}>
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                              <span className="text-sm font-medium text-primary">
                                {formatSpaceReviewAuthor(review).charAt(0)}
                              </span>
                            </div>
                            <span className="font-medium">{formatSpaceReviewAuthor(review)}</span>
                          </div>
                          <StarRating rating={review.rating} size="sm" readOnly fillColorClass="text-warning fill-warning" />
                          <span className="text-sm text-muted-foreground">
                            {getTimeSinceSpaceReview(review.created_at)}
                          </span>
                        </div>
                        {review.content && (
                          <p className="text-sm text-muted-foreground leading-relaxed">
                            {review.content}
                          </p>
                        )}
                      </div>
                    </div>
                    {index < filteredReviews.length - 1 && (
                      <Separator className="mt-6" />
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default SpaceRecap;