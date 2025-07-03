import React, { useState, useEffect } from 'react';
import { useAuth } from "@/contexts/OptimizedAuthContext";
import LoadingScreen from "@/components/LoadingScreen";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { MapPin, Calendar, Users, Building2, MessageSquare, Bell } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const Dashboard = () => {
  const { authState } = useAuth();
  const navigate = useNavigate();

  if (authState.isLoading) {
    return <LoadingScreen />;
  }

  if (!authState.isAuthenticated || !authState.profile) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Benvenuto in Workover
          </h1>
          <p className="text-gray-600 mb-6">
            Accedi per visualizzare la tua dashboard personalizzata
          </p>
          <div className="space-x-4">
            <Button onClick={() => navigate('/login')}>
              Accedi
            </Button>
            <Button variant="outline" onClick={() => navigate('/register')}>
              Registrati
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const { profile } = authState;

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Ciao, {profile.first_name}! 👋
        </h1>
        <p className="text-gray-600">
          Ecco un riepilogo delle tue attività su Workover
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate('/spaces')}>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Building2 className="h-5 w-5 text-indigo-600" />
              Esplora Spazi
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 text-sm">
              Scopri spazi di lavoro unici nella tua zona
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate('/events')}>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Calendar className="h-5 w-5 text-emerald-600" />
              Eventi
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 text-sm">
              Partecipa a eventi e workshop professionali
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate('/bookings')}>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <MapPin className="h-5 w-5 text-purple-600" />
              Le Mie Prenotazioni
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 text-sm">
              Gestisci le tue prenotazioni attive
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate('/messages')}>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <MessageSquare className="h-5 w-5 text-blue-600" />
              Messaggi
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 text-sm">
              Comunica con host e coworker
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate('/networking')}>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Users className="h-5 w-5 text-orange-600" />
              Networking
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 text-sm">
              Connettiti con altri professionisti
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate('/notifications')}>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Bell className="h-5 w-5 text-red-600" />
              Notifiche
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 text-sm">
              Rimani aggiornato su tutte le attività
            </p>
          </CardContent>
        </Card>
      </div>

      {profile.role === 'host' && (
        <Card>
          <CardHeader>
            <CardTitle>Area Host</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gray-600">
              Gestisci i tuoi spazi e le prenotazioni degli ospiti
            </p>
            <div className="flex gap-4">
              <Button onClick={() => navigate('/host/spaces')}>
                Gestisci Spazi
              </Button>
              <Button variant="outline" onClick={() => navigate('/host/spaces/new')}>
                Aggiungi Nuovo Spazio
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {profile.role === 'admin' && (
        <Card>
          <CardHeader>
            <CardTitle>Area Admin</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gray-600">
              Accedi agli strumenti di amministrazione
            </p>
            <div className="flex gap-4">
              <Button onClick={() => navigate('/admin/users')}>
                Gestisci Utenti
              </Button>
              <Button variant="outline" onClick={() => navigate('/admin/logs')}>
                Logs di Sistema
              </Button>
              <Button variant="outline" onClick={() => navigate('/validation')}>
                Validazione Pagamenti
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

    </div>
  );
};

export default Dashboard;
