
import React, { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users, UserPlus, MessageCircle, Search } from "lucide-react";
import { useNetworking } from "@/hooks/useNetworking";
import { ConnectionCard } from "@/components/networking/ConnectionCard";
import { ConnectionRequestCard } from "@/components/networking/ConnectionRequestCard";
import LoadingScreen from "@/components/LoadingScreen";
import { useNavigate } from "react-router-dom";

export default function Networking() {
  const navigate = useNavigate();
  const { 
    isLoading, 
    getActiveConnections, 
    getSentRequests, 
    getReceivedRequests 
  } = useNetworking();
  
  const [activeTab, setActiveTab] = useState("connections");

  const activeConnections = getActiveConnections();
  const sentRequests = getSentRequests();
  const receivedRequests = getReceivedRequests();

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <Users className="w-6 h-6 text-indigo-600" />
                Networking
              </h1>
              <p className="text-gray-600 mt-1">
                Connettiti con altri coworker e costruisci la tua rete professionale
              </p>
            </div>
            <Button 
              onClick={() => navigate("/networking/discover")}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              <Search className="w-4 h-4 mr-2" />
              Scopri Coworker
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-indigo-50 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-indigo-600" />
                <span className="font-medium text-indigo-900">Connessioni Attive</span>
              </div>
              <p className="text-2xl font-bold text-indigo-600 mt-1">
                {activeConnections.length}
              </p>
            </div>
            
            <div className="bg-orange-50 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-orange-600" />
                <span className="font-medium text-orange-900">Richieste Inviate</span>
              </div>
              <p className="text-2xl font-bold text-orange-600 mt-1">
                {sentRequests.length}
              </p>
            </div>
            
            <div className="bg-green-50 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <MessageCircle className="w-5 h-5 text-green-600" />
                <span className="font-medium text-green-900">Richieste Ricevute</span>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <p className="text-2xl font-bold text-green-600">
                  {receivedRequests.length}
                </p>
                {receivedRequests.length > 0 && (
                  <Badge variant="destructive" className="text-xs">
                    Nuove
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="connections" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Connessioni Attive
              {activeConnections.length > 0 && (
                <Badge variant="secondary" className="ml-1">
                  {activeConnections.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="sent" className="flex items-center gap-2">
              <UserPlus className="w-4 h-4" />
              Richieste Inviate
              {sentRequests.length > 0 && (
                <Badge variant="secondary" className="ml-1">
                  {sentRequests.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="received" className="flex items-center gap-2">
              <MessageCircle className="w-4 h-4" />
              Richieste Ricevute
              {receivedRequests.length > 0 && (
                <Badge variant="destructive" className="ml-1">
                  {receivedRequests.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="connections" className="space-y-4">
            {activeConnections.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-lg">
                <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Nessuna connessione attiva
                </h3>
                <p className="text-gray-600 mb-4">
                  Inizia a connetterti con altri coworker per espandere la tua rete
                </p>
                <Button 
                  onClick={() => navigate("/networking/discover")}
                  className="bg-indigo-600 hover:bg-indigo-700"
                >
                  Scopri Coworker
                </Button>
              </div>
            ) : (
              <div className="grid gap-4">
                {activeConnections.map((connection) => (
                  <ConnectionCard 
                    key={connection.id} 
                    connection={connection} 
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="sent" className="space-y-4">
            {sentRequests.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-lg">
                <UserPlus className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Nessuna richiesta inviata
                </h3>
                <p className="text-gray-600">
                  Le richieste di connessione che invii appariranno qui
                </p>
              </div>
            ) : (
              <div className="grid gap-4">
                {sentRequests.map((connection) => (
                  <ConnectionRequestCard 
                    key={connection.id} 
                    connection={connection} 
                    type="sent"
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="received" className="space-y-4">
            {receivedRequests.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-lg">
                <MessageCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Nessuna richiesta ricevuta
                </h3>
                <p className="text-gray-600">
                  Le richieste di connessione che ricevi appariranno qui
                </p>
              </div>
            ) : (
              <div className="grid gap-4">
                {receivedRequests.map((connection) => (
                  <ConnectionRequestCard 
                    key={connection.id} 
                    connection={connection} 
                    type="received"
                  />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
