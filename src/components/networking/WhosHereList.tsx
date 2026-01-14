import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { MapPin } from "lucide-react";
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { Link } from 'react-router-dom';

interface CheckIn {
  user_id: string;
  workspace_id: string;
  checkin_time: string;
  profiles: {
    first_name: string;
    last_name: string;
    profile_photo_url: string | null;
    profession: string | null;
  };
  workspaces: {
    name: string;
    city: string | null;
  };
}

export const WhosHereList = () => {
  const [checkIns, setCheckIns] = useState<CheckIn[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchCheckIns = async () => {
      try {
        const { data, error } = await supabase
          .from('check_ins')
          .select(`
            user_id,
            workspace_id,
            checkin_time,
            profiles:user_id (
              first_name,
              last_name,
              profile_photo_url,
              profession
            ),
            workspaces:workspace_id (
              name,
              city
            )
          `)
          .is('checkout_time', null)
          .order('checkin_time', { ascending: false });

        if (error) {
          console.error('Error fetching check-ins:', error);
        } else {
          // Transform data to match CheckIn interface
          const typedData: CheckIn[] = data.map(item => ({
            user_id: item.user_id,
            workspace_id: item.workspace_id,
            checkin_time: item.checkin_time,
            profiles: {
              first_name: item.profiles?.first_name || '',
              last_name: item.profiles?.last_name || '',
              profile_photo_url: item.profiles?.profile_photo_url || null,
              profession: item.profiles?.profession || null
            },
            workspaces: {
              name: item.workspaces?.name || 'Workspace',
              city: item.workspaces?.city || null
            }
          }));
          setCheckIns(typedData);
        }
      } catch (error) {
        console.error('Unexpected error fetching check-ins:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCheckIns();

    // Subscribe to realtime changes
    const channel = supabase
      .channel('public:check_ins')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'check_ins'
        },
        () => {
          fetchCheckIns();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-12 h-12 bg-gray-200 rounded-full" />
              <div className="space-y-2 flex-1">
                <div className="h-4 bg-gray-200 rounded w-3/4" />
                <div className="h-3 bg-gray-200 rounded w-1/2" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (checkIns.length === 0) {
    return null; // Hide section if nobody is checked in
  }

  return (
    <div className="mb-8">
      <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
        Lavorano qui ora
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {checkIns.map((checkIn) => (
          <Link
            to={`/users/${checkIn.user_id}`}
            key={`${checkIn.user_id}-${checkIn.checkin_time}`}
            className="block"
          >
            <Card className="hover:shadow-md transition-shadow cursor-pointer border-l-4 border-l-green-500">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="relative">
                  <Avatar className="h-12 w-12 border-2 border-white shadow-sm">
                    <AvatarImage src={checkIn.profiles.profile_photo_url || undefined} />
                    <AvatarFallback>
                      {checkIn.profiles.first_name[0]}{checkIn.profiles.last_name[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full" />
                </div>

                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 truncate">
                    {checkIn.profiles.first_name} {checkIn.profiles.last_name}
                  </p>
                  <p className="text-xs text-gray-500 truncate mb-1">
                    {checkIn.profiles.profession || 'Coworker'}
                  </p>
                  <div className="flex items-center text-xs text-gray-500">
                    <MapPin className="w-3 h-3 mr-1 text-gray-400" />
                    <span className="truncate">
                      {checkIn.workspaces.name}
                      {checkIn.workspaces.city && `, ${checkIn.workspaces.city}`}
                    </span>
                  </div>
                  <p className="text-[10px] text-gray-400 mt-1">
                    Dalle {format(new Date(checkIn.checkin_time), 'HH:mm')}
                  </p>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
};
