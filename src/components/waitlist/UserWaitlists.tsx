
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getUserWaitlists, leaveWaitlist } from "@/lib/waitlist-utils";
import { WaitlistWithDetails } from "@/types/waitlist";
import { formatDistanceToNow } from "date-fns";
import { it } from "date-fns/locale";
import { Clock, X, Calendar, MapPin } from "lucide-react";

const UserWaitlists = () => {
  const [waitlists, setWaitlists] = useState<WaitlistWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchWaitlists();
  }, []);

  const fetchWaitlists = async () => {
    setIsLoading(true);
    const data = await getUserWaitlists();
    setWaitlists(data);
    setIsLoading(false);
  };

  const handleLeaveWaitlist = async (waitlistId: string) => {
    const success = await leaveWaitlist(waitlistId);
    if (success) {
      await fetchWaitlists();
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-24 bg-gray-100 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  if (waitlists.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-gray-500">
          <Clock className="w-12 h-12 mx-auto mb-4 text-gray-300" />
          <p>Non sei in nessuna lista d'attesa</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {waitlists.map((waitlist) => (
        <Card key={waitlist.id}>
          <CardHeader className="pb-3">
            <div className="flex justify-between items-start">
              <CardTitle className="text-lg flex items-center gap-2">
                {waitlist.space_id ? <MapPin className="w-5 h-5" /> : <Calendar className="w-5 h-5" />}
                {waitlist.space_title || waitlist.event_title}
              </CardTitle>
              <Badge variant="secondary" className="bg-orange-100 text-orange-800">
                Lista d'attesa
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-start">
              <div>
                <div className="text-sm text-gray-600">
                  {waitlist.space_id ? "Spazio" : "Evento"}
                  {waitlist.host_name && (
                    <span className="ml-2">• Host: {waitlist.host_name}</span>
                  )}
                </div>
                
                {waitlist.event_date && (
                  <div className="text-sm text-gray-600 mt-1">
                    Data evento: {new Date(waitlist.event_date).toLocaleDateString('it-IT')}
                  </div>
                )}
                
                <div className="text-xs text-gray-500 mt-2">
                  In lista da {formatDistanceToNow(new Date(waitlist.created_at!), { 
                    addSuffix: true, 
                    locale: it 
                  })}
                </div>
              </div>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleLeaveWaitlist(waitlist.id)}
                className="text-red-600 border-red-200 hover:bg-red-50"
              >
                <X className="w-4 h-4 mr-1" />
                Esci
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default UserWaitlists;
