
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Users, 
  MessageCircle, 
  Calendar, 
  TrendingUp, 
  Award,
  Target,
  Zap,
  Network
} from 'lucide-react';

interface NetworkingDashboardProps {
  stats: {
    totalConnections: number;
    pendingRequests: number;
    messagesThisWeek: number;
    eventsAttended: number;
    profileViews: number;
    connectionRate: number;
  };
}

export const NetworkingDashboard: React.FC<NetworkingDashboardProps> = ({ stats }) => {
  const achievements = [
    { id: 1, title: 'Network Builder', description: '10+ connessioni', unlocked: true },
    { id: 2, title: 'Event Networker', description: '5+ eventi', unlocked: true },
    { id: 3, title: 'Super Connector', description: '50+ connessioni', unlocked: false },
  ];

  return (
    <div className="space-y-6">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-lg p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold mb-2">Il tuo Network Professionale</h1>
            <p className="text-indigo-100">
              Espandi le tue connessioni e crea opportunità di business
            </p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold">{stats.totalConnections}</div>
            <div className="text-indigo-200">Connessioni Attive</div>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Richieste Pendenti</p>
                <p className="text-2xl font-bold text-orange-600">{stats.pendingRequests}</p>
              </div>
              <Users className="h-8 w-8 text-orange-600" />
            </div>
            <div className="mt-2">
              <Badge variant="secondary" className="text-xs">
                +12% questa settimana
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Messaggi</p>
                <p className="text-2xl font-bold text-blue-600">{stats.messagesThisWeek}</p>
              </div>
              <MessageCircle className="h-8 w-8 text-blue-600" />
            </div>
            <div className="mt-2">
              <Badge variant="secondary" className="text-xs">
                Questa settimana
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Visualizzazioni Profilo</p>
                <p className="text-2xl font-bold text-green-600">{stats.profileViews}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-600" />
            </div>
            <div className="mt-2">
              <Badge variant="secondary" className="text-xs">
                +{stats.connectionRate}% tasso accettazione
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Eventi</p>
                <p className="text-2xl font-bold text-purple-600">{stats.eventsAttended}</p>
              </div>
              <Calendar className="h-8 w-8 text-purple-600" />
            </div>
            <div className="mt-2">
              <Badge variant="secondary" className="text-xs">
                Partecipati
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardContent className="p-6">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Zap className="h-5 w-5 text-yellow-500" />
            Azioni Rapide
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button className="flex items-center gap-2 h-auto p-4" variant="outline">
              <Users className="h-5 w-5" />
              <div className="text-left">
                <div className="font-medium">Trova Connessioni</div>
                <div className="text-sm text-gray-500">Scopri nuovi professionisti</div>
              </div>
            </Button>
            <Button className="flex items-center gap-2 h-auto p-4" variant="outline">
              <MessageCircle className="h-5 w-5" />
              <div className="text-left">
                <div className="font-medium">Messaggi</div>
                <div className="text-sm text-gray-500">Gestisci conversazioni</div>
              </div>
            </Button>
            <Button className="flex items-center gap-2 h-auto p-4" variant="outline">
              <Calendar className="h-5 w-5" />
              <div className="text-left">
                <div className="font-medium">Eventi Networking</div>
                <div className="text-sm text-gray-500">Partecipa agli eventi</div>
              </div>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Achievements */}
      <Card>
        <CardContent className="p-6">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Award className="h-5 w-5 text-gold-500" />
            I tuoi Achievement
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {achievements.map((achievement) => (
              <div
                key={achievement.id}
                className={`p-4 rounded-lg border ${
                  achievement.unlocked
                    ? 'bg-green-50 border-green-200'
                    : 'bg-gray-50 border-gray-200'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`p-2 rounded-full ${
                      achievement.unlocked ? 'bg-green-500' : 'bg-gray-400'
                    }`}
                  >
                    <Award className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <div className="font-medium">{achievement.title}</div>
                    <div className="text-sm text-gray-600">
                      {achievement.description}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
