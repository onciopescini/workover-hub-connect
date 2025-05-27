
import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { getUserConnections, acceptConnectionRequest, rejectConnectionRequest, removeConnection } from "@/lib/networking-utils";
import { Connection } from "@/types/networking";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { User, UserCheck, UserX, MessageSquare, Trash2 } from "lucide-react";
import { StartChatButton } from "@/components/messaging/StartChatButton";
import LoadingScreen from "@/components/LoadingScreen";

export function ConnectionsList() {
  const { authState } = useAuth();
  const [connections, setConnections] = useState<Connection[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadConnections = async () => {
      if (!authState.user) return;
      
      try {
        const data = await getUserConnections();
        setConnections(data);
      } catch (error) {
        console.error("Error loading connections:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadConnections();
  }, [authState.user]);

  const handleAccept = async (connectionId: string) => {
    const success = await acceptConnectionRequest(connectionId);
    if (success) {
      setConnections(prev => 
        prev.map(conn => 
          conn.id === connectionId 
            ? { ...conn, status: 'accepted' }
            : conn
        )
      );
    }
  };

  const handleReject = async (connectionId: string) => {
    const success = await rejectConnectionRequest(connectionId);
    if (success) {
      setConnections(prev => 
        prev.filter(conn => conn.id !== connectionId)
      );
    }
  };

  const handleRemove = async (connectionId: string) => {
    const success = await removeConnection(connectionId);
    if (success) {
      setConnections(prev => 
        prev.filter(conn => conn.id !== connectionId)
      );
    }
  };

  if (isLoading) {
    return <LoadingScreen />;
  }

  const pendingRequests = connections.filter(c => 
    c.status === 'pending' && c.receiver_id === authState.user?.id
  );
  
  const sentRequests = connections.filter(c => 
    c.status === 'pending' && c.sender_id === authState.user?.id
  );
  
  const acceptedConnections = connections.filter(c => c.status === 'accepted');

  const getOtherUser = (connection: Connection) => {
    return connection.sender_id === authState.user?.id 
      ? connection.receiver 
      : connection.sender;
  };

  return (
    <div className="space-y-6">
      {/* Richieste in entrata */}
      {pendingRequests.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserCheck className="w-5 h-5" />
              Richieste di Connessione ({pendingRequests.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {pendingRequests.map((connection) => {
              const otherUser = getOtherUser(connection);
              if (!otherUser) return null;

              return (
                <div key={connection.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Avatar>
                      <AvatarImage src={otherUser.profile_photo_url || undefined} />
                      <AvatarFallback>
                        <User className="w-4 h-4" />
                      </AvatarFallback>
                    </Avatar>
                    
                    <div>
                      <h4 className="font-medium">
                        {otherUser.first_name} {otherUser.last_name}
                      </h4>
                      {otherUser.bio && (
                        <p className="text-sm text-gray-600 mt-1">{otherUser.bio}</p>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Button
                      onClick={() => handleAccept(connection.id)}
                      size="sm"
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <UserCheck className="w-4 h-4 mr-1" />
                      Accetta
                    </Button>
                    <Button
                      onClick={() => handleReject(connection.id)}
                      size="sm"
                      variant="outline"
                    >
                      <UserX className="w-4 h-4 mr-1" />
                      Rifiuta
                    </Button>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Richieste inviate */}
      {sentRequests.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              Richieste Inviate ({sentRequests.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {sentRequests.map((connection) => {
              const otherUser = getOtherUser(connection);
              if (!otherUser) return null;

              return (
                <div key={connection.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Avatar>
                      <AvatarImage src={otherUser.profile_photo_url || undefined} />
                      <AvatarFallback>
                        <User className="w-4 h-4" />
                      </AvatarFallback>
                    </Avatar>
                    
                    <div>
                      <h4 className="font-medium">
                        {otherUser.first_name} {otherUser.last_name}
                      </h4>
                      <Badge variant="secondary" className="mt-1">
                        In attesa
                      </Badge>
                    </div>
                  </div>
                  
                  <Button
                    onClick={() => handleReject(connection.id)}
                    size="sm"
                    variant="outline"
                  >
                    Annulla
                  </Button>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Connessioni accettate */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserCheck className="w-5 h-5" />
            Le Tue Connessioni ({acceptedConnections.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {acceptedConnections.length === 0 ? (
            <div className="text-center py-8">
              <User className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Nessuna connessione
              </h3>
              <p className="text-gray-600">
                Inizia a connetterti con altri professionisti nella sezione "Scopri"
              </p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {acceptedConnections.map((connection) => {
                const otherUser = getOtherUser(connection);
                if (!otherUser) return null;

                return (
                  <div key={connection.id} className="border rounded-lg p-4">
                    <div className="flex items-center space-x-3 mb-3">
                      <Avatar>
                        <AvatarImage src={otherUser.profile_photo_url || undefined} />
                        <AvatarFallback>
                          <User className="w-4 h-4" />
                        </AvatarFallback>
                      </Avatar>
                      
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium truncate">
                          {otherUser.first_name} {otherUser.last_name}
                        </h4>
                        {otherUser.bio && (
                          <p className="text-sm text-gray-600 truncate">{otherUser.bio}</p>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <StartChatButton
                        userId={otherUser.id}
                        userName={`${otherUser.first_name} ${otherUser.last_name}`}
                        size="sm"
                        className="flex-1"
                      />
                      
                      <Button
                        onClick={() => handleRemove(connection.id)}
                        size="sm"
                        variant="outline"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
