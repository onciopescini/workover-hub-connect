import { useEffect, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useSpaceReviewsQuery } from '@/hooks/queries/useSpaceReviewsQuery';
import { sreLogger } from '@/lib/sre-logger';
import { useSpaceLocation, useHasConfirmedBooking } from '@/hooks/queries/useSpaceLocation';
import { Space } from '@/types/space';
import type { Database, Json } from '@/integrations/supabase/types';
import { mapSpaceRowToSpace } from '@/lib/space-mappers';

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
  hasPreciseLocation?: boolean;
  hasConfirmedBooking?: boolean;
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
  const isCreateRoute = id === 'new';
  const canLoadSpaceData = Boolean(id) && !isCreateRoute;

  const { data: space, isLoading: spaceLoading, error: spaceError } = useQuery<SpaceDetail | null, Error>({
    queryKey: ['space', id],
    queryFn: async (): Promise<SpaceDetail | null> => {
      if (!id) {
        throw new Error('Space ID not provided');
      }

      const { data: spaceData, error: spaceError } = await supabase
        .from('spaces')
        .select(`
          id, host_id, title, description, address, city_name, latitude, longitude,
          price_per_hour, price_per_day, capacity, max_capacity, amenities, photos,
          category, workspace_features, published, pending_approval, created_at, updated_at,
          seating_types, ideal_guest_tags, event_friendly_tags,
          cancellation_policy, availability, timezone, country_code,
          cached_avg_rating, cached_review_count, confirmation_type, work_environment,
          rules, is_suspended, suspension_reason, suspended_at, suspended_by,
          deleted_at, approved_at, approved_by, rejection_reason, revision_notes,
          revision_requested, approximate_location
        `)
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
          const recurring = availObj.recurring || {};
          normalizedAvailability = {
            recurring: {
              monday: recurring['monday'] || defaultDay,
              tuesday: recurring['tuesday'] || defaultDay,
              wednesday: recurring['wednesday'] || defaultDay,
              thursday: recurring['thursday'] || defaultDay,
              friday: recurring['friday'] || defaultDay,
              saturday: recurring['saturday'] || defaultDay,
              sunday: recurring['sunday'] || defaultDay,
            },
            exceptions: availObj.exceptions || []
          };
        }
      } catch (parseError) {
        sreLogger.warn('Failed to parse availability', { spaceId: id, error: parseError });
        normalizedAvailability = null;
      }

      const mappedSpace = mapSpaceRowToSpace(spaceData);

      const spaceObj: SpaceDetail = {
        ...mappedSpace,
        availability: normalizedAvailability,
        photos: mappedSpace.photos || [],
        amenities: mappedSpace.amenities || [],
        seating_types: mappedSpace.seating_types || [],
        features: mappedSpace.features || [],
        event_friendly_tags: mappedSpace.event_friendly_tags || [],
        ideal_guest_tags: mappedSpace.ideal_guest_tags || [],
        timezone: mappedSpace.timezone || '',
        city: mappedSpace.city || '',
        country_code: mappedSpace.country_code || '',
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
    enabled: canLoadSpaceData
  });

  // Load reviews
  const { data: reviews = [] } = useSpaceReviewsQuery(canLoadSpaceData ? id : '');

  // Load location
  const { data: preciseLocation } = useSpaceLocation(id, canLoadSpaceData);
  const { data: hasConfirmedBooking } = useHasConfirmedBooking(canLoadSpaceData ? id : undefined);

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
    if (!space?.host_id || !id || !canLoadSpaceData) return;

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
        (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
          const newData = payload.new as SpaceHostProfile | undefined;
          const newStripeConnected = newData?.stripe_connected;
          const newStripeAccountId = newData?.stripe_account_id;

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
  }, [space?.host_id, id, queryClient, canLoadSpaceData]);

  return {
    space: enhancedSpace,
    isLoading: spaceLoading,
    error: spaceError,
    reviews,
    cachedRating: enhancedSpace?.cached_avg_rating || 0
  };
};
