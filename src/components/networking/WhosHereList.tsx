import React, { useEffect, useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { MapPin } from "lucide-react";
import { format } from 'date-fns';
import { Link } from 'react-router-dom';

interface CheckIn {
  user_id: string;
  space_id: string;
  checkin_time: string;
  profiles: {
    first_name: string;
    last_name: string;
    profile_photo_url: string | null;
    profession: string | null;
  };
  spaces: {
    title: string;
    city_name: string | null;
  };
}

interface CheckInQueryRow {
  user_id: string;
  space_id: string;
  checkin_time: string;
  spaces: {
    title: string | null;
    city_name: string | null;
  } | null;
}

interface ProfileData {
  id: string;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  job_title: string | null;
}

export const WhosHereList = () => {
  const [checkIns, setCheckIns] = useState<CheckIn[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchCheckIns = async () => {
      try {
        // Fetch check-ins with space data
        const { data: checkInData, error: checkInError } = await supabase
          .from('check_ins')
          .select(`
            user_id,
            space_id,
            checkin_time,
            spaces:space_id (
              title,
              city_name
            )
          `)
          .is('checkout_time', null)
          .order('checkin_time', { ascending: false });

        if (checkInError) {
          console.error('Error fetching check-ins:', checkInError);
          return;
        }

        if (!checkInData || checkInData.length === 0) {
          setCheckIns([]);
          return;
        }

        // Get unique user IDs
        const userIds = [...new Set(checkInData.map(c => c.user_id))];
        
        // Fetch profiles separately
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles_public_view')
          .select('id, first_name, last_name, avatar_url, job_title')
          .in('id', userIds);

        if (profilesError) {
          console.error('Error fetching profiles:', profilesError);
        }

        // Create a map of user_id to profile
        const profilesMap = new Map<string, ProfileData>();
        (profilesData || []).filter(p => p.id != null).forEach(p => {
          profilesMap.set(p.id!, p as ProfileData);
        });

        // Combine the data
        const typedData: CheckIn[] = checkInData.map((item) => {
          const row = item as CheckInQueryRow;
          const profile = profilesMap.get(row.user_id);

          return {
            user_id: row.user_id,
            space_id: row.space_id,
            checkin_time: row.checkin_time,
            profiles: {
              first_name: profile?.first_name || '',
              last_name: profile?.last_name || '',
              profile_photo_url: profile?.avatar_url || null,
              profession: profile?.job_title || null
            },
            spaces: {
              title: row.spaces?.title || 'Space',
              city_name: row.spaces?.city_name || null
            }
          };
        });
        
        setCheckIns(typedData);
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
              <div className="w-12 h-12 bg-muted rounded-full" />
              <div className="space-y-2 flex-1">
                <div className="h-4 bg-muted rounded w-3/4" />
                <div className="h-3 bg-muted rounded w-1/2" />
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
      <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
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
                  <Avatar className="h-12 w-12 border-2 border-background shadow-sm">
                    <AvatarImage src={checkIn.profiles.profile_photo_url || undefined} />
                    <AvatarFallback>
                      {checkIn.profiles.first_name[0]}{checkIn.profiles.last_name[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-background rounded-full" />
                </div>

                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-foreground truncate">
                    {checkIn.profiles.first_name} {checkIn.profiles.last_name}
                  </p>
                  <p className="text-xs text-muted-foreground truncate mb-1">
                    {checkIn.profiles.profession || 'Coworker'}
                  </p>
                  <div className="flex items-center text-xs text-muted-foreground">
                    <MapPin className="w-3 h-3 mr-1" />
                    <span className="truncate">
                      {checkIn.spaces.title}
                      {checkIn.spaces.city_name && `, ${checkIn.spaces.city_name}`}
                    </span>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1">
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
