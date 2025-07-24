
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, Star, TrendingUp, Euro } from "lucide-react";
import { Profile } from "@/types/auth";

interface ProfileStatsCardsProps {
  profile: Profile;
}

export function ProfileStatsCards({ profile }: ProfileStatsCardsProps) {
  // Dati reali - da implementare con query appropriate quando disponibili
  const stats = {
    totalBookings: 0,
    averageRating: 0,
    monthlyGrowth: 0,
    totalEarnings: 0
  };

  const cards = [
    {
      title: 'Prenotazioni Totali',
      value: stats.totalBookings,
      icon: Calendar,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      description: 'Questo mese: +3'
    },
    {
      title: 'Rating Medio',
      value: `${stats.averageRating}/5`,
      icon: Star,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50',
      description: 'Basato su 8 recensioni'
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
            <div key={card.title} className="relative p-4 border rounded-lg hover:shadow-md transition-shadow">
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
