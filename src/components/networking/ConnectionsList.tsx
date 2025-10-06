
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MessageCircle, Check, X, Clock, Users, Eye } from "lucide-react";
import { useNetworking } from "@/hooks/useNetworking";
import { acceptConnectionRequest, rejectConnectionRequest, removeConnection } from "@/lib/networking-utils";
import { createOrGetPrivateChat } from "@/lib/networking-utils";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

export const ConnectionsList = () => {
  const navigate = useNavigate();
  const { 
    connections, 
    getSentRequests, 
    getReceivedRequests, 
    getActiveConnections,
    fetchConnections 
  } = useNetworking();

  const sentRequests = getSentRequests();
  const receivedRequests = getReceivedRequests();
  const activeConnections = getActiveConnections();

  const handleAcceptRequest = async (connectionId: string) => {
    const success = await acceptConnectionRequest(connectionId);
    if (success) {
      await fetchConnections();
    }
  };

  const handleRejectRequest = async (connectionId: string) => {
    const success = await rejectConnectionRequest(connectionId);
    if (success) {
      await fetchConnections();
    }
  };

  const handleRemoveConnection = async (connectionId: string) => {
    const success = await removeConnection(connectionId);
    if (success) {
      await fetchConnections();
    }
  };

  const handleStartChat = async (userId: string) => {
    const chatId = await createOrGetPrivateChat(userId);
    if (chatId) {
      navigate(`/private-chats/${chatId}`);
    } else {
      toast.error("Impossibile aprire la chat");
    }
  };

  const handleViewProfile = (userId: string) => {
    navigate(`/users/${userId}`);
  };

  const getUserInitials = (firstName?: string, lastName?: string) => {
    return `${firstName?.charAt(0) || ''}${lastName?.charAt(0) || ''}`.toUpperCase() || 'U';
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">{activeConnections.length}</div>
            <div className="text-sm text-gray-600">Connessioni Attive</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-yellow-600">{receivedRequests.length}</div>
            <div className="text-sm text-gray-600">Richieste Ricevute</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-gray-600">{sentRequests.length}</div>
            <div className="text-sm text-gray-600">Richieste Inviate</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="active" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="active" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            Connessioni ({activeConnections.length})
          </TabsTrigger>
          <TabsTrigger value="received" className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Ricevute ({receivedRequests.length})
          </TabsTrigger>
          <TabsTrigger value="sent" className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Inviate ({sentRequests.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="space-y-4">
          {activeConnections.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Nessuna connessione attiva
                </h3>
                <p className="text-gray-600">
                  Inizia a connetterti con altri professionisti per espandere la tua rete
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {activeConnections.map((connection) => {
                const otherUser = connection.sender?.id === connection.sender_id 
                  ? connection.receiver 
                  : connection.sender;
                
                return (
                  <Card key={connection.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <Avatar className="h-12 w-12">
                            <AvatarImage src={otherUser?.profile_photo_url || ""} />
                            <AvatarFallback>
                              {getUserInitials(otherUser?.first_name, otherUser?.last_name)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <h3 className="font-semibold">
                              {otherUser?.first_name} {otherUser?.last_name}
                            </h3>
                            {otherUser?.bio && (
                              <p className="text-sm text-gray-600 mt-1">{otherUser.bio}</p>
                            )}
                            <Badge variant="default" className="mt-2">
                              Connesso dal {new Date(connection.created_at).toLocaleDateString('it-IT')}
                            </Badge>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button 
                            size="sm"
                            onClick={() => handleStartChat(otherUser?.id || '')}
                          >
                            <MessageCircle className="w-4 h-4 mr-2" />
                            Messaggio
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleViewProfile(otherUser?.id || '')}
                          >
                            <Eye className="w-4 h-4 mr-2" />
                            Profilo
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleRemoveConnection(connection.id)}
                          >
                            Rimuovi
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="received" className="space-y-4">
          {receivedRequests.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Clock className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Nessuna richiesta ricevuta
                </h3>
                <p className="text-gray-600">
                  Le richieste di connessione che ricevi appariranno qui
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {receivedRequests.map((connection) => (
                <Card key={connection.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <Avatar className="h-12 w-12">
                          <AvatarImage src={connection.sender?.profile_photo_url || ""} />
                          <AvatarFallback>
                            {getUserInitials(connection.sender?.first_name, connection.sender?.last_name)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <h3 className="font-semibold">
                            {connection.sender?.first_name} {connection.sender?.last_name}
                          </h3>
                          {connection.sender?.bio && (
                            <p className="text-sm text-gray-600 mt-1">{connection.sender.bio}</p>
                          )}
                          <Badge variant="secondary" className="mt-2">
                            Richiesta del {new Date(connection.created_at).toLocaleDateString('it-IT')}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          size="sm"
                          onClick={() => handleAcceptRequest(connection.id)}
                        >
                          <Check className="w-4 h-4 mr-2" />
                          Accetta
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleRejectRequest(connection.id)}
                        >
                          <X className="w-4 h-4 mr-2" />
                          Rifiuta
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="sent" className="space-y-4">
          {sentRequests.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Clock className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Nessuna richiesta inviata
                </h3>
                <p className="text-gray-600">
                  Le richieste di connessione che invii appariranno qui
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {sentRequests.map((connection) => (
                <Card key={connection.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <Avatar className="h-12 w-12">
                          <AvatarImage src={connection.receiver?.profile_photo_url || ""} />
                          <AvatarFallback>
                            {getUserInitials(connection.receiver?.first_name, connection.receiver?.last_name)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <h3 className="font-semibold">
                            {connection.receiver?.first_name} {connection.receiver?.last_name}
                          </h3>
                          {connection.receiver?.bio && (
                            <p className="text-sm text-gray-600 mt-1">{connection.receiver.bio}</p>
                          )}
                          <Badge variant="secondary" className="mt-2">
                            Inviata il {new Date(connection.created_at).toLocaleDateString('it-IT')}
                          </Badge>
                        </div>
                      </div>
                      <Badge variant="outline">In Attesa</Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};
