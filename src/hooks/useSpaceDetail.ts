import { useEffect, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSpaceReviewsQuery } from '@/hooks/queries/useSpaceReviewsQuery';
import { sreLogger } from '@/lib/sre-logger';
import { useSpaceLocation, useHasConfirmedBooking } from '@/hooks/queries/useSpaceLocation';
import { Space } from '@/types/space';

export const useSpaceDetail = (id: string | undefined) => {
  const queryClient = useQueryClient();

  const { data: space, isLoading: spaceLoading, error: spaceError } = useQuery({
    queryKey: ['space', id],
    queryFn: async () => {
      if (!id) {
        throw new Error('Space ID not provided');
      }

      // Query 'workspaces' table directly
      const { data: workspaceData, error: workspaceError } = await supabase
        .from('spaces')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (workspaceError) {
        throw workspaceError;
      }

      if (!workspaceData) {
        return null;
      }

      // Fetch host info
      const { data: hostData, error: hostError } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, profile_photo_url, bio, created_at, stripe_account_id, stripe_connected')
        .eq('id', workspaceData.host_id || '')
        .single();

      if (hostError) {
        sreLogger.warn('Error fetching host info', { hostId: workspaceData.host_id }, hostError);
      }

      let availabilityData = workspaceData.availability;

      // Normalize availability
      let normalizedAvailability = null;
      try {
        if (typeof availabilityData === 'string') {
          availabilityData = JSON.parse(availabilityData);
        }

        if (availabilityData && typeof availabilityData === 'object') {
          const availObj = availabilityData as any;
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

      const spaceObj: Space & {
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
      } = {
        ...workspaceData,
        availability: normalizedAvailability,
        photos: workspaceData.photos || [],
        amenities: workspaceData.amenities || [],
        seating_types: workspaceData.seating_types || [],
        features: workspaceData.features || [],
        event_friendly_tags: workspaceData.event_friendly_tags || [],
        ideal_guest_tags: workspaceData.ideal_guest_tags || [],
        timezone: undefined,
        city: workspaceData.city || undefined,
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
        (payload: any) => {
          const newStripeConnected = payload.new.stripe_connected;
          const newStripeAccountId = payload.new.stripe_account_id;

          queryClient.setQueryData(['space', id], (oldData: any) => {
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
