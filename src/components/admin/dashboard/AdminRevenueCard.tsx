
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CreditCard } from "lucide-react";
import { AdminStats } from "@/types/admin";

interface AdminRevenueCardProps {
  stats: AdminStats;
}

export const AdminRevenueCard: React.FC<AdminRevenueCardProps> = ({ stats }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="w-5 h-5" />
          Fatturato Totale
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold text-green-600">
          €{stats.totalRevenue.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
        </div>
        <p className="text-sm text-gray-600 mt-1">
          Da {stats.totalBookings} prenotazioni totali
        </p>
      </CardContent>
    </Card>
  );
};
