import { useEffect, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useSpaceReviewsQuery } from '@/hooks/queries/useSpaceReviewsQuery';
import { sreLogger } from '@/lib/sre-logger';
import { useSpaceLocation, useHasConfirmedBooking } from '@/hooks/queries/useSpaceLocation';
import { Space } from '@/types/space';
import type { Database, Json } from '@/integrations/supabase/types';

type AvailabilitySlot = {
  enabled?: boolean;
  slots?: Json[];
};

type AvailabilityPayload = {
  recurring?: Record<string, AvailabilitySlot>;
  exceptions?: Json[];
};

type SpaceHostProfile = Pick<
  Database['public']['Tables']['profiles']['Row'],
  'id' | 'first_name' | 'last_name' | 'profile_photo_url' | 'bio' | 'created_at' | 'stripe_account_id' | 'stripe_connected'
>;

type SpaceDetail = Space & {
  host?: {
    id: string;
    first_name: string;
    last_name: string;
    profile_photo_url: string | null;
    bio?: string;
    created_at: string;
  };
  host_total_spaces: number;
  host_stripe_account_id: string;
  host_stripe_connected: boolean;
};

interface UseSpaceDetailResult {
  space: SpaceDetail | null | undefined;
  isLoading: boolean;
  error: Error | null;
  reviews: ReturnType<typeof useSpaceReviewsQuery>['data'];
  cachedRating: number;
}

const isAvailabilityPayload = (value: unknown): value is AvailabilityPayload => {
  return !!value && typeof value === 'object' && !Array.isArray(value);
};

export const useSpaceDetail = (id: string | undefined): UseSpaceDetailResult => {
  const queryClient = useQueryClient();

  const { data: space, isLoading: spaceLoading, error: spaceError } = useQuery<SpaceDetail | null, Error>({
    queryKey: ['space', id],
    queryFn: async (): Promise<SpaceDetail | null> => {
      if (!id) {
        throw new Error('Space ID not provided');
      }

      // Query 'spaces' table directly
      const { data: spaceData, error: spaceError } = await supabase
        .from('spaces')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (spaceError) {
        throw spaceError;
      }

      if (!spaceData) {
        return null;
      }

      // Fetch host info
      const { data: hostData, error: hostError } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, profile_photo_url, bio, created_at, stripe_account_id, stripe_connected')
        .eq('id', spaceData.host_id || '')
        .single();

      if (hostError) {
        sreLogger.warn('Error fetching host info', { hostId: spaceData.host_id }, hostError);
      }

      let availabilityData: Json | null = spaceData.availability;

      // Normalize availability
      let normalizedAvailability: AvailabilityPayload | null = null;
      try {
        if (typeof availabilityData === 'string') {
          availabilityData = JSON.parse(availabilityData);
        }

        if (isAvailabilityPayload(availabilityData)) {
          const availObj = availabilityData;
          const defaultDay = { enabled: false, slots: [] };
          normalizedAvailability = {
            recurring: {
              monday: availObj.recurring?.monday || defaultDay,
              tuesday: availObj.recurring?.tuesday || defaultDay,
              wednesday: availObj.recurring?.wednesday || defaultDay,
              thursday: availObj.recurring?.thursday || defaultDay,
              friday: availObj.recurring?.friday || defaultDay,
              saturday: availObj.recurring?.saturday || defaultDay,
              sunday: availObj.recurring?.sunday || defaultDay,
            },
            exceptions: availObj.exceptions || []
          };
        }
      } catch (parseError) {
        sreLogger.warn('Failed to parse availability', { spaceId: id, error: parseError });
        normalizedAvailability = null;
      }

      const spaceObj: SpaceDetail = {
        ...spaceData,
        availability: normalizedAvailability,
        photos: spaceData.photos || [],
        amenities: spaceData.amenities || [],
        seating_types: spaceData.seating_types || [],
        features: spaceData.features || [],
        event_friendly_tags: spaceData.event_friendly_tags || [],
        ideal_guest_tags: spaceData.ideal_guest_tags || [],
        timezone: undefined,
        city: spaceData.city || undefined,
        country_code: undefined,
        host: hostData ? {
          id: hostData.id,
          first_name: hostData.first_name,
          last_name: hostData.last_name,
          profile_photo_url: hostData.profile_photo_url,
          bio: hostData.bio || '',
          created_at: hostData.created_at
        } : {
          id: 'unknown',
          first_name: 'Host',
          last_name: '',
          profile_photo_url: null,
          created_at: new Date().toISOString()
        },
        host_total_spaces: 0,
        host_stripe_account_id: hostData?.stripe_account_id || '',
        host_stripe_connected: hostData?.stripe_connected || false
      };

      return spaceObj;
    },
    enabled: !!id
  });

  // Load reviews
  const { data: reviews = [] } = useSpaceReviewsQuery(id || '');

  // Load location
  const { data: preciseLocation } = useSpaceLocation(id, !!id);
  const { data: hasConfirmedBooking } = useHasConfirmedBooking(id);

  // Enhance space
  const enhancedSpace = useMemo(() => {
    if (!space) return space;

    if (preciseLocation) {
      return {
        ...space,
        address: preciseLocation.address,
        latitude: preciseLocation.latitude,
        longitude: preciseLocation.longitude,
        hasPreciseLocation: true,
        hasConfirmedBooking: !!hasConfirmedBooking,
      };
    }

    return {
      ...space,
      hasPreciseLocation: false,
      hasConfirmedBooking: !!hasConfirmedBooking,
    };
  }, [space, preciseLocation, hasConfirmedBooking]);

  // Realtime subscription
  useEffect(() => {
    if (!space?.host_id || !id) return;

    const channel = supabase
      .channel(`host-updates-${space.host_id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${space.host_id}`
        },
        (payload: RealtimePostgresChangesPayload<SpaceHostProfile>) => {
          const newStripeConnected = payload.new.stripe_connected;
          const newStripeAccountId = payload.new.stripe_account_id;

          queryClient.setQueryData(['space', id], (oldData: SpaceDetail | null | undefined) => {
            if (!oldData) return oldData;

            return {
              ...oldData,
              host_stripe_connected: newStripeConnected,
              host_stripe_account_id: newStripeAccountId,
              host: oldData.host ? {
                ...oldData.host,
                stripe_connected: newStripeConnected,
                stripe_account_id: newStripeAccountId
              } : oldData.host
            };
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [space?.host_id, id, queryClient]);

  return {
    space: enhancedSpace,
    isLoading: spaceLoading,
    error: spaceError,
    reviews,
    cachedRating: enhancedSpace?.cached_avg_rating || 0
  };
};
