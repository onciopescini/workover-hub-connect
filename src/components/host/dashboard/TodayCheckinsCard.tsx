
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { CalendarCheck, Clock, MapPin } from 'lucide-react';
import { useTodayCheckins } from '@/hooks/host/useTodayCheckins';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

export const TodayCheckinsCard = () => {
  const { data: checkins, isLoading } = useTodayCheckins();

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <CalendarCheck className="w-5 h-5 text-primary" />
            Check-in di Oggi
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2].map((i) => (
              <div key={i} className="flex items-center gap-4 animate-pulse">
                <div className="w-10 h-10 rounded-full bg-gray-200" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-1/2" />
                  <div className="h-3 bg-gray-200 rounded w-3/4" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!checkins || checkins.length === 0) {
    // Optionally return null or a simplified empty state.
    // The requirement says "Display a summary card".
    // If empty, maybe just show "Nessun arrivo oggi".
    return (
      <Card className="bg-slate-50 border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-6 text-gray-500">
          <CalendarCheck className="w-8 h-8 mb-2 opacity-50" />
          <p className="text-sm font-medium">Nessun arrivo previsto per oggi</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <CalendarCheck className="w-5 h-5 text-primary" />
          Arrivi di Oggi
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {checkins.map((checkin) => (
          <div key={checkin.id} className="flex items-start gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors">
            <Avatar className="w-10 h-10 border border-gray-100">
              <AvatarImage src={checkin.guest_avatar} />
              <AvatarFallback>{checkin.guest_name.charAt(0)}</AvatarFallback>
            </Avatar>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <p className="text-sm font-medium truncate text-gray-900">
                  {checkin.guest_name}
                </p>
                <div className="flex items-center text-xs text-primary font-medium bg-primary/10 px-2 py-0.5 rounded-full">
                  <Clock className="w-3 h-3 mr-1" />
                  {checkin.start_time ? format(new Date(checkin.start_time), 'HH:mm') : '--:--'}
                </div>
              </div>

              <div className="flex items-center text-xs text-gray-500 truncate">
                <MapPin className="w-3 h-3 mr-1 flex-shrink-0" />
                <span className="truncate">{checkin.space_name}</span>
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};
