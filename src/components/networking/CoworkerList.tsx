
import React, { useEffect, useState } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { User, Briefcase, Linkedin } from "lucide-react";
import { Coworker } from "@/types/networking";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StarRating } from "@/components/ui/StarRating";

interface CoworkerListProps {
  bookingId: string;
}

export const CoworkerList: React.FC<CoworkerListProps> = ({ bookingId }) => {
  const [coworkers, setCoworkers] = useState<Coworker[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCoworkers = async () => {
      try {
      const { data, error } = await supabase.rpc('get_coworkers', {
          booking_id: bookingId
        });

        if (error) {
          console.error('Error fetching coworkers:', error);
          return;
        }

        if (data) {
          // Type casting since RPC returns generic json or array
          setCoworkers(data as unknown as Coworker[]);
        }
      } catch (err) {
        console.error('Unexpected error fetching coworkers:', err);
      } finally {
        setLoading(false);
      }
    };

    if (bookingId) {
      fetchCoworkers();
    }
  }, [bookingId]);

  if (loading) {
    return (
      <div className="flex gap-2 p-2">
        {[1, 2, 3].map(i => (
          <div key={i} className="flex flex-col items-center space-y-2 w-[100px]">
            <div className="h-10 w-10 rounded-full bg-gray-200 animate-pulse" />
            <div className="h-3 w-16 bg-gray-200 animate-pulse rounded" />
            <div className="h-2 w-12 bg-gray-200 animate-pulse rounded" />
          </div>
        ))}
      </div>
    );
  }

  if (coworkers.length === 0) {
    // Optionally return null or a subtle message as per requirements
    // "Eri l'unico qui!"
    return (
      <div className="text-center py-2 text-sm text-gray-500 italic">
        Eri l'unico qui!
      </div>
    );
  }

  return (
    <div className="w-full">
      <h3 className="text-sm font-medium mb-2 text-gray-700">Coworker presenti</h3>
      <ScrollArea className="w-full whitespace-nowrap">
        <div className="flex space-x-4 p-1">
          {coworkers.map((coworker) => (
            <div key={coworker.id} className="flex flex-col items-center space-y-1 w-[120px] shrink-0">
              <Avatar className="h-10 w-10 border border-gray-100">
                <AvatarImage src={coworker.avatar_url || undefined} />
                <AvatarFallback className="bg-primary/5 text-primary">
                  {coworker.first_name?.[0]}{coworker.last_name?.[0]}
                </AvatarFallback>
              </Avatar>
              <div className="text-center w-full">
                <p className="text-xs font-medium truncate" title={`${coworker.first_name} ${coworker.last_name}`}>
                  {coworker.first_name} {coworker.last_name}
                </p>
                <div className="flex items-center justify-center gap-1 text-[10px] text-gray-500">
                  <Briefcase className="w-3 h-3" />
                  <span className="truncate max-w-[80px]" title={coworker.profession || 'Professione non specificata'}>
                    {coworker.profession || 'N/A'}
                  </span>
                </div>
                {coworker.cached_avg_rating && (
                   <div className="flex justify-center mt-1">
                     <StarRating rating={coworker.cached_avg_rating} readOnly size="xs" />
                   </div>
                )}
              </div>
              {coworker.linkedin_url && (
                 <a
                   href={coworker.linkedin_url}
                   target="_blank"
                   rel="noopener noreferrer"
                   className="text-[10px] text-blue-600 hover:underline flex items-center gap-0.5"
                 >
                   <Linkedin className="w-3 h-3" />
                   LinkedIn
                 </a>
              )}
            </div>
          ))}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
};
