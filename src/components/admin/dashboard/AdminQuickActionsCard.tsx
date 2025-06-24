
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AdminStats } from "@/types/admin";

interface AdminQuickActionsCardProps {
  stats: AdminStats;
}

export const AdminQuickActionsCard: React.FC<AdminQuickActionsCardProps> = ({ stats }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Azioni Rapide</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">Spazi da approvare</span>
          <span className="font-medium">{stats.pendingSpaces}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">Utenti sospesi</span>
          <span className="font-medium">{stats.suspendedUsers}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">Prenotazioni attive</span>
          <span className="font-medium">{stats.activeBookings}</span>
        </div>
      </CardContent>
    </Card>
  );
};
