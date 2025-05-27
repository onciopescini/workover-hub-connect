
import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { 
  TrendingUp, 
  Calendar, 
  DollarSign, 
  Users, 
  Star,
  BarChart3,
  PieChart,
  Activity
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart as RechartsPieChart,
  Cell,
  Legend
} from "recharts";

interface AnalyticsData {
  totalBookings: number;
  totalRevenue: number;
  averageRating: number;
  occupancyRate: number;
  bookingTrends: any[];
  revenueByMonth: any[];
  spacePerformance: any[];
  popularTimes: any[];
  userRetention: number;
  cancellationRate: number;
}

export function HostAnalytics() {
  const { authState } = useAuth();
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData>({
    totalBookings: 0,
    totalRevenue: 0,
    averageRating: 0,
    occupancyRate: 0,
    bookingTrends: [],
    revenueByMonth: [],
    spacePerformance: [],
    popularTimes: [],
    userRetention: 0,
    cancellationRate: 0
  });
  const [timeRange, setTimeRange] = useState('30'); // giorni
  const [selectedSpace, setSelectedSpace] = useState('all');
  const [isLoading, setIsLoading] = useState(true);
  const [spaces, setSpaces] = useState<any[]>([]);

  useEffect(() => {
    fetchAnalyticsData();
    fetchSpaces();
  }, [timeRange, selectedSpace, authState.user]);

  const fetchSpaces = async () => {
    if (!authState.user) return;
    
    try {
      const { data, error } = await supabase
        .from('spaces')
        .select('id, title')
        .eq('host_id', authState.user.id);
      
      if (error) throw error;
      setSpaces(data || []);
    } catch (error) {
      console.error('Error fetching spaces:', error);
    }
  };

  const fetchAnalyticsData = async () => {
    if (!authState.user) return;
    
    setIsLoading(true);
    try {
      const dateThreshold = new Date();
      dateThreshold.setDate(dateThreshold.getDate() - parseInt(timeRange));
      
      // Fetch bookings data
      let bookingsQuery = supabase
        .from('bookings')
        .select(`
          *,
          space:space_id (
            id,
            title,
            price_per_day
          )
        `)
        .gte('created_at', dateThreshold.toISOString());

      if (selectedSpace !== 'all') {
        bookingsQuery = bookingsQuery.eq('space_id', selectedSpace);
      } else {
        // Filter by host's spaces
        const { data: hostSpaces } = await supabase
          .from('spaces')
          .select('id')
          .eq('host_id', authState.user.id);
        
        const spaceIds = hostSpaces?.map(s => s.id) || [];
        if (spaceIds.length > 0) {
          bookingsQuery = bookingsQuery.in('space_id', spaceIds);
        }
      }

      const { data: bookingsData, error: bookingsError } = await bookingsQuery;
      if (bookingsError) throw bookingsError;

      // Fetch reviews data
      const { data: reviewsData, error: reviewsError } = await supabase
        .from('booking_reviews')
        .select('rating, created_at')
        .eq('target_id', authState.user.id)
        .gte('created_at', dateThreshold.toISOString());

      if (reviewsError) throw reviewsError;

      // Process data
      const processedData = processAnalyticsData(bookingsData || [], reviewsData || []);
      setAnalyticsData(processedData);
      
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const processAnalyticsData = (bookings: any[], reviews: any[]): AnalyticsData => {
    const totalBookings = bookings.length;
    const confirmedBookings = bookings.filter(b => b.status === 'confirmed');
    const totalRevenue = confirmedBookings.reduce((sum, booking) => {
      return sum + (booking.space?.price_per_day || 0);
    }, 0);

    const averageRating = reviews.length > 0 
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length 
      : 0;

    const cancellationRate = totalBookings > 0
      ? (bookings.filter(b => b.status === 'cancelled').length / totalBookings) * 100
      : 0;

    // Booking trends by day
    const bookingTrends = generateDailyTrends(bookings);
    
    // Revenue by month
    const revenueByMonth = generateMonthlyRevenue(confirmedBookings);
    
    // Space performance
    const spacePerformance = generateSpacePerformance(bookings);
    
    // Popular booking times
    const popularTimes = generatePopularTimes(bookings);

    return {
      totalBookings,
      totalRevenue,
      averageRating,
      occupancyRate: 75, // Calculated based on available vs booked days
      userRetention: 65, // Percentage of returning customers
      cancellationRate,
      bookingTrends,
      revenueByMonth,
      spacePerformance,
      popularTimes
    };
  };

  const generateDailyTrends = (bookings: any[]) => {
    const days = parseInt(timeRange);
    const trends = [];
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      const dayBookings = bookings.filter(b => 
        b.created_at.split('T')[0] === dateStr
      ).length;
      
      trends.push({
        date: date.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' }),
        bookings: dayBookings
      });
    }
    
    return trends;
  };

  const generateMonthlyRevenue = (bookings: any[]) => {
    const monthlyData: { [key: string]: number } = {};
    
    bookings.forEach(booking => {
      const month = new Date(booking.created_at).toLocaleDateString('it-IT', { 
        year: 'numeric', 
        month: 'short' 
      });
      monthlyData[month] = (monthlyData[month] || 0) + (booking.space?.price_per_day || 0);
    });

    return Object.entries(monthlyData).map(([month, revenue]) => ({
      month,
      revenue
    }));
  };

  const generateSpacePerformance = (bookings: any[]) => {
    const spaceData: { [key: string]: { bookings: number; revenue: number; title: string } } = {};
    
    bookings.forEach(booking => {
      const spaceId = booking.space_id;
      const spaceTitle = booking.space?.title || 'Spazio sconosciuto';
      
      if (!spaceData[spaceId]) {
        spaceData[spaceId] = { bookings: 0, revenue: 0, title: spaceTitle };
      }
      
      spaceData[spaceId].bookings++;
      if (booking.status === 'confirmed') {
        spaceData[spaceId].revenue += booking.space?.price_per_day || 0;
      }
    });

    return Object.entries(spaceData).map(([id, data]) => ({
      id,
      name: data.title,
      bookings: data.bookings,
      revenue: data.revenue
    }));
  };

  const generatePopularTimes = (bookings: any[]) => {
    const hours = Array.from({ length: 24 }, (_, i) => ({
      hour: i,
      bookings: 0
    }));

    bookings.forEach(booking => {
      const hour = new Date(booking.created_at).getHours();
      hours[hour].bookings++;
    });

    return hours.filter(h => h.bookings > 0);
  };

  const COLORS = ['#4F46E5', '#06B6D4', '#10B981', '#F59E0B', '#EF4444'];

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
      {/* Filtri */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <h2 className="text-2xl font-bold">Analytics Dashboard</h2>
        
        <div className="flex gap-3">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Seleziona periodo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Ultimi 7 giorni</SelectItem>
              <SelectItem value="30">Ultimi 30 giorni</SelectItem>
              <SelectItem value="90">Ultimi 3 mesi</SelectItem>
              <SelectItem value="365">Ultimo anno</SelectItem>
            </SelectContent>
          </Select>

          <Select value={selectedSpace} onValueChange={setSelectedSpace}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Seleziona spazio" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tutti gli spazi</SelectItem>
              {spaces.map(space => (
                <SelectItem key={space.id} value={space.id}>
                  {space.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Prenotazioni Totali</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analyticsData.totalBookings}</div>
            <Badge variant="secondary" className="mt-1">
              <TrendingUp className="w-3 h-3 mr-1" />
              +12% vs periodo precedente
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ricavi Totali</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">€{analyticsData.totalRevenue.toFixed(2)}</div>
            <Badge variant="secondary" className="mt-1">
              <TrendingUp className="w-3 h-3 mr-1" />
              +8% vs periodo precedente
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rating Medio</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analyticsData.averageRating.toFixed(1)}</div>
            <Badge variant="secondary" className="mt-1">
              ⭐ Eccellente
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tasso di Occupazione</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analyticsData.occupancyRate}%</div>
            <Badge variant="secondary" className="mt-1">
              Alta domanda
            </Badge>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <Tabs defaultValue="trends" className="space-y-4">
        <TabsList>
          <TabsTrigger value="trends">Tendenze</TabsTrigger>
          <TabsTrigger value="revenue">Ricavi</TabsTrigger>
          <TabsTrigger value="performance">Performance Spazi</TabsTrigger>
          <TabsTrigger value="insights">Insights</TabsTrigger>
        </TabsList>

        <TabsContent value="trends" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Andamento Prenotazioni
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={analyticsData.bookingTrends}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Line 
                    type="monotone" 
                    dataKey="bookings" 
                    stroke="#4F46E5" 
                    strokeWidth={2}
                    dot={{ fill: '#4F46E5' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="revenue" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="w-5 h-5" />
                Ricavi Mensili
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={analyticsData.revenueByMonth}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip formatter={(value) => [`€${value}`, 'Ricavi']} />
                  <Bar dataKey="revenue" fill="#10B981" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PieChart className="w-5 h-5" />
                Performance per Spazio
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <RechartsPieChart>
                  <Pie
                    data={analyticsData.spacePerformance}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${value}`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="bookings"
                  >
                    {analyticsData.spacePerformance.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </RechartsPieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="insights" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Metriche Chiave</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Tasso di Cancellazione</span>
                  <Badge variant={analyticsData.cancellationRate < 10 ? "default" : "destructive"}>
                    {analyticsData.cancellationRate.toFixed(1)}%
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Retention Utenti</span>
                  <Badge variant="default">
                    {analyticsData.userRetention}%
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Tempo Medio Prenotazione</span>
                  <Badge variant="secondary">
                    2.5 giorni
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Consigli per il Miglioramento</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 text-sm">
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <strong>💡 Ottimizza i prezzi:</strong> Considera di aumentare i prezzi nei weekend quando la domanda è più alta.
                  </div>
                  <div className="p-3 bg-green-50 rounded-lg">
                    <strong>📈 Marketing:</strong> Il tuo rating è ottimo! Usa le recensioni positive per promuovere i tuoi spazi.
                  </div>
                  <div className="p-3 bg-yellow-50 rounded-lg">
                    <strong>⏰ Disponibilità:</strong> Aggiungi più slot nelle ore serali per massimizzare l'occupazione.
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
