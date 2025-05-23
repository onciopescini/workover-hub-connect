
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Message } from "@/types/booking";
import { formatDistanceToNow } from "date-fns";
import { it } from "date-fns/locale";

interface RecentMessagesProps {
  messages: Message[];
}

export function RecentMessages({ messages }: RecentMessagesProps) {
  if (messages.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Messaggi Recenti</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500 text-center py-4">
            Nessun messaggio recente
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Messaggi Recenti</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {messages.slice(0, 5).map((message) => (
          <div key={message.id} className="flex items-start space-x-3 p-3 rounded-lg border">
            <Avatar className="h-8 w-8">
              <AvatarImage src={message.sender?.profile_photo_url || undefined} />
              <AvatarFallback>
                {message.sender?.first_name?.[0]}{message.sender?.last_name?.[0]}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <p className="font-medium text-sm">
                  {message.sender?.first_name} {message.sender?.last_name}
                </p>
                <span className="text-xs text-gray-500">
                  {formatDistanceToNow(new Date(message.created_at), { 
                    addSuffix: true, 
                    locale: it 
                  })}
                </span>
              </div>
              
              <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                {message.content}
              </p>
              
              {!message.is_read && (
                <Badge variant="destructive" className="mt-2 text-xs">
                  Non letto
                </Badge>
              )}
            </div>
            
            <Button variant="outline" size="sm">
              Rispondi
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
