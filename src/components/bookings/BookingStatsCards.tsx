
import React from 'react';
import { BookingWithDetails } from "@/types/booking";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar, Clock, Euro, MapPin } from 'lucide-react';

interface BookingStatsCardsProps {
  bookings: BookingWithDetails[];
}

export function BookingStatsCards({ bookings }: BookingStatsCardsProps) {
  const stats = React.useMemo(() => {
    const total = bookings.length;
    const pending = bookings.filter(b => b.status === 'pending').length;
    const confirmed = bookings.filter(b => b.status === 'confirmed').length;
    const cancelled = bookings.filter(b => b.status === 'cancelled').length;
    
    const totalSpent = bookings
      .filter(b => b.status === 'confirmed')
      .reduce((sum, b) => sum + (b.space?.price_per_day || 0), 0);

    const uniqueSpaces = new Set(bookings.map(b => b.space_id)).size;

    return { total, pending, confirmed, cancelled, totalSpent, uniqueSpaces };
  }, [bookings]);

  const cards = [
    {
      title: 'Prenotazioni Totali',
      value: stats.total,
      icon: Calendar,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      title: 'In Attesa',
      value: stats.pending,
      icon: Clock,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50',
    },
    {
      title: 'Confermate',
      value: stats.confirmed,
      icon: Calendar,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
    {
      title: 'Spazi Visitati',
      value: stats.uniqueSpaces,
      icon: MapPin,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {cards.map((card) => (
        <Card key={card.title} className="hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{card.title}</p>
                <p className="text-2xl font-bold text-gray-900">{card.value}</p>
              </div>
              <div className={`p-2 rounded-lg ${card.bgColor}`}>
                <card.icon className={`w-5 h-5 ${card.color}`} />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
