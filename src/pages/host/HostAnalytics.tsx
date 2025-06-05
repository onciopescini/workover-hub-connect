
import React from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart3, TrendingUp, Users, Calendar, DollarSign, Eye } from "lucide-react";

const HostAnalytics = () => {
  // Placeholder analytics data
  const stats = {
    totalBookings: 124,
    totalRevenue: 3850,
    averageRating: 4.7,
    occupancyRate: 78,
    totalViews: 2340,
    repeatCustomers: 45
  };

  const monthlyData = [
    { month: "Gen", bookings: 15, revenue: 450 },
    { month: "Feb", bookings: 18, revenue: 540 },
    { month: "Mar", bookings: 22, revenue: 660 },
    { month: "Apr", bookings: 20, revenue: 600 },
    { month: "Mag", bookings: 25, revenue: 750 },
    { month: "Giu", bookings: 24, revenue: 720 }
  ];

  const recentBookings = [
    { id: 1, guest: "Marco Rossi", space: "Sala Riunioni A", date: "2024-01-15", amount: 120 },
    { id: 2, guest: "Sara Bianchi", space: "Postazione Desk", date: "2024-01-14", amount: 35 },
    { id: 3, guest: "Luca Verde", space: "Sala Conferenze", date: "2024-01-13", amount: 200 },
  ];

  return (
    <AppLayout
      title="Analytics Host"
      subtitle="Monitora le performance dei tuoi spazi"
    >
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        {/* Key Metrics */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Prenotazioni Totali</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalBookings}</div>
              <p className="text-xs text-muted-foreground">
                +12% dal mese scorso
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Ricavi Totali</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">€{stats.totalRevenue}</div>
              <p className="text-xs text-muted-foreground">
                +8% dal mese scorso
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Valutazione Media</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.averageRating}/5</div>
              <p className="text-xs text-muted-foreground">
                Basato su 89 recensioni
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tasso di Occupazione</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.occupancyRate}%</div>
              <p className="text-xs text-muted-foreground">
                +5% dal mese scorso
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Visualizzazioni</CardTitle>
              <Eye className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalViews}</div>
              <p className="text-xs text-muted-foreground">
                +15% dal mese scorso
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Clienti Ricorrenti</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.repeatCustomers}</div>
              <p className="text-xs text-muted-foreground">
                36% dei clienti totali
              </p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Panoramica</TabsTrigger>
            <TabsTrigger value="bookings">Prenotazioni</TabsTrigger>
            <TabsTrigger value="revenue">Ricavi</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Andamento Mensile</CardTitle>
                  <CardDescription>Prenotazioni e ricavi negli ultimi 6 mesi</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {monthlyData.map((data, index) => (
                      <div key={index} className="flex justify-between items-center">
                        <span className="text-sm font-medium">{data.month}</span>
                        <div className="flex space-x-4">
                          <span className="text-sm text-gray-600">{data.bookings} prenotazioni</span>
                          <span className="text-sm font-semibold">€{data.revenue}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Prenotazioni Recenti</CardTitle>
                  <CardDescription>Ultime prenotazioni ricevute</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {recentBookings.map((booking) => (
                      <div key={booking.id} className="flex justify-between items-center">
                        <div>
                          <p className="text-sm font-medium">{booking.guest}</p>
                          <p className="text-xs text-gray-600">{booking.space}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold">€{booking.amount}</p>
                          <p className="text-xs text-gray-600">{booking.date}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="bookings">
            <Card>
              <CardHeader>
                <CardTitle>Analisi Prenotazioni</CardTitle>
                <CardDescription>Dettagli sulle prenotazioni dei tuoi spazi</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Grafici Prenotazioni
                  </h3>
                  <p className="text-gray-600 mb-4">
                    Qui verranno visualizzati i grafici dettagliati delle prenotazioni
                  </p>
                  <Button>Configura Grafici</Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="revenue">
            <Card>
              <CardHeader>
                <CardTitle>Analisi Ricavi</CardTitle>
                <CardDescription>Dettagli sui ricavi generati dai tuoi spazi</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <DollarSign className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Grafici Ricavi
                  </h3>
                  <p className="text-gray-600 mb-4">
                    Qui verranno visualizzati i grafici dettagliati dei ricavi
                  </p>
                  <Button>Configura Grafici</Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="performance">
            <Card>
              <CardHeader>
                <CardTitle>Performance Spazi</CardTitle>
                <CardDescription>Analisi delle performance per ogni spazio</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <BarChart3 className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Analisi Performance
                  </h3>
                  <p className="text-gray-600 mb-4">
                    Qui verranno visualizzate le metriche di performance dettagliate
                  </p>
                  <Button>Configura Analisi</Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
};

export default HostAnalytics;
