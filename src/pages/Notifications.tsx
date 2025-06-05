
import React from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, MessageSquare, Calendar, Users, CheckCircle } from "lucide-react";

const Notifications = () => {
  // Placeholder notification data
  const notifications = [
    {
      id: 1,
      type: "message",
      title: "Nuovo messaggio ricevuto",
      content: "Hai ricevuto un nuovo messaggio da Marco Rossi",
      timestamp: "2 ore fa",
      isRead: false,
      icon: MessageSquare,
    },
    {
      id: 2,
      type: "booking",
      title: "Prenotazione confermata",
      content: "La tua prenotazione per Spazio Milano Centro è stata confermata",
      timestamp: "1 giorno fa",
      isRead: true,
      icon: Calendar,
    },
    {
      id: 3,
      type: "connection",
      title: "Nuova connessione",
      content: "Sara Bianchi ha accettato la tua richiesta di connessione",
      timestamp: "3 giorni fa",
      isRead: false,
      icon: Users,
    },
    {
      id: 4,
      type: "system",
      title: "Aggiornamento sistema",
      content: "Nuove funzionalità disponibili nella dashboard",
      timestamp: "1 settimana fa",
      isRead: true,
      icon: Bell,
    },
  ];

  const getIconColor = (type: string, isRead: boolean) => {
    if (isRead) return "text-gray-400";
    
    switch (type) {
      case "message": return "text-blue-500";
      case "booking": return "text-green-500";
      case "connection": return "text-purple-500";
      default: return "text-gray-500";
    }
  };

  return (
    <AppLayout
      title="Notifiche"
      subtitle="Rimani aggiornato su tutte le attività"
    >
      <div className="max-w-4xl mx-auto p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Tutte le Notifiche</h2>
            <p className="text-gray-600">
              {notifications.filter(n => !n.isRead).length} non lette di {notifications.length} totali
            </p>
          </div>
          <div className="space-x-2">
            <Button variant="outline" size="sm">
              <CheckCircle className="h-4 w-4 mr-2" />
              Segna tutte come lette
            </Button>
            <Button variant="outline" size="sm">
              Impostazioni
            </Button>
          </div>
        </div>

        <div className="space-y-3">
          {notifications.map((notification) => {
            const Icon = notification.icon;
            return (
              <Card 
                key={notification.id} 
                className={`cursor-pointer transition-colors hover:bg-gray-50 ${
                  !notification.isRead ? "border-l-4 border-l-blue-500 bg-blue-50/30" : ""
                }`}
              >
                <CardContent className="p-4">
                  <div className="flex items-start space-x-3">
                    <Icon className={`h-5 w-5 mt-1 ${getIconColor(notification.type, notification.isRead)}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className={`font-medium ${!notification.isRead ? "text-gray-900" : "text-gray-600"}`}>
                          {notification.title}
                        </p>
                        <div className="flex items-center space-x-2">
                          {!notification.isRead && (
                            <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                              Nuovo
                            </Badge>
                          )}
                          <span className="text-xs text-gray-500">{notification.timestamp}</span>
                        </div>
                      </div>
                      <p className={`text-sm mt-1 ${!notification.isRead ? "text-gray-700" : "text-gray-500"}`}>
                        {notification.content}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {notifications.length === 0 && (
          <Card>
            <CardContent className="p-8 text-center">
              <Bell className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Nessuna notifica
              </h3>
              <p className="text-gray-600">
                Non hai ancora ricevuto notifiche. Controlla più tardi!
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
};

export default Notifications;
