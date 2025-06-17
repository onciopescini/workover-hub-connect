
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Bell, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';

const Notifications = () => {
  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Notifiche
        </h1>
        <p className="text-gray-600">
          Rimani aggiornato su tutte le tue attività
        </p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Tutte le notifiche
          </CardTitle>
          <Button variant="outline" size="sm">
            <Check className="h-4 w-4 mr-2" />
            Segna tutte come lette
          </Button>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-gray-500">
            <Bell className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p>Non hai notifiche al momento</p>
            <p className="text-sm mt-2">Ti avviseremo quando ci saranno aggiornamenti importanti</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Notifications;
