import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/OptimizedAuthContext";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, Wallet, Users, Store } from "lucide-react";
import { format, subDays } from 'date-fns';
import { it } from 'date-fns/locale';

const HostRevenue = () => {
  const { authState } = useAuth();
  const [revenueData, setRevenueData] = useState({
    totalRevenue: 0,
    averageDailyRevenue: 0,
    bookingsCount: 0,
    spacesCount: 0,
  });

  useEffect(() => {
    const fetchRevenueData = async () => {
      // Simula dati di revenue (sostituisci con chiamate API reali)
      const simulatedTotalRevenue = Math.floor(Math.random() * 5000) + 1000;
      const simulatedBookingsCount = Math.floor(Math.random() * 50) + 10;
      const simulatedSpacesCount = Math.floor(Math.random() * 5) + 1;

      setRevenueData({
        totalRevenue: simulatedTotalRevenue,
        averageDailyRevenue: simulatedTotalRevenue / 30, // Simula media su 30 giorni
        bookingsCount: simulatedBookingsCount,
        spacesCount: simulatedSpacesCount,
      });
    };

    fetchRevenueData();
  }, [authState.user?.id]);

  const formatDate = (date: Date): string => {
    return format(date, 'dd MMMM yyyy', { locale: it });
  };

  const generateRevenueHistory = (days: number) => {
    const history = [];
    for (let i = 0; i < days; i++) {
      const date = subDays(new Date(), i);
      const revenue = Math.floor(Math.random() * 200) + 50; // Simula revenue giornaliera
      history.push({ date: formatDate(date), revenue });
    }
    return history;
  };

  const revenueHistory = generateRevenueHistory(30);

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-4">Dashboard Revenue</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4 flex items-center space-x-4">
            <div className="rounded-full bg-green-100 p-2">
              <Wallet className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <div className="text-2xl font-bold">€{revenueData.totalRevenue}</div>
              <div className="text-sm text-gray-500">Revenue Totale</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center space-x-4">
            <div className="rounded-full bg-blue-100 p-2">
              <CalendarDays className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <div className="text-2xl font-bold">€{revenueData.averageDailyRevenue.toFixed(2)}</div>
              <div className="text-sm text-gray-500">Media Giornaliera</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center space-x-4">
            <div className="rounded-full bg-indigo-100 p-2">
              <Users className="w-6 h-6 text-indigo-600" />
            </div>
            <div>
              <div className="text-2xl font-bold">{revenueData.bookingsCount}</div>
              <div className="text-sm text-gray-500">Prenotazioni</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center space-x-4">
            <div className="rounded-full bg-yellow-100 p-2">
              <Store className="w-6 h-6 text-yellow-600" />
            </div>
            <div>
              <div className="text-2xl font-bold">{revenueData.spacesCount}</div>
              <div className="text-sm text-gray-500">Spazi Gestiti</div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Storico Revenue (Ultimi 30 Giorni)</CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr>
                  <th className="text-left">Data</th>
                  <th className="text-left">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {revenueHistory.map((item, index) => (
                  <tr key={index}>
                    <td>{item.date}</td>
                    <td>€{item.revenue}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default HostRevenue;
