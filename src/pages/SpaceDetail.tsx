import React, { lazy, Suspense, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { SpaceDetailContent } from '@/components/spaces/SpaceDetailContent';
import { Space } from '@/types/space';
import { useSpaceReviewsQuery } from '@/hooks/queries/useSpaceReviewsQuery';
import { sreLogger } from '@/lib/sre-logger';
import { useSpaceLocation, useHasConfirmedBooking } from '@/hooks/queries/useSpaceLocation';

const SpaceHeroStitch = lazy(() => import('@/feature/spaces/SpaceHeroStitch'));

const SpaceDetail = () => {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const isStitch = import.meta.env.VITE_UI_THEME === 'stitch';
  
  sreLogger.debug('SpaceDetail - ID from URL', { spaceId: id, component: 'SpaceDetail' });
  
  const { data: space, isLoading: spaceLoading, error: spaceError } = useQuery({
    queryKey: ['space', id],
    queryFn: async () => {
      if (!id) {
        sreLogger.error('No space ID provided', { component: 'SpaceDetail' }, new Error('Space ID not provided'));
        throw new Error('Space ID not provided');
      }
      
      sreLogger.debug('Fetching space with ID', { spaceId: id, component: 'SpaceDetail' });
      
      // Query 'workspaces' table directly
      const { data: workspaceData, error: workspaceError } = await supabase
        .from('workspaces')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (workspaceError) {
        sreLogger.error('Database error', { spaceId: id, component: 'SpaceDetail' }, workspaceError as Error);
        throw workspaceError;
      }
      
      if (!workspaceData) {
        sreLogger.warn('No space found for ID', { spaceId: id, component: 'SpaceDetail' });
        // Return null instead of throwing, so the UI can handle the "Not Found" state
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
        // Continue without host details if fail
      }
      
      sreLogger.debug('Space fetched successfully', {
        spaceId: workspaceData.id,
        name: workspaceData.name,
        published: workspaceData.published,
        component: 'SpaceDetail'
      });
      
      let availabilityData = workspaceData.availability;

      // Normalize availability: parse if string, ensure structure
      let normalizedAvailability = null;
      try {
        if (typeof availabilityData === 'string') {
          availabilityData = JSON.parse(availabilityData);
        }
        
        if (availabilityData && typeof availabilityData === 'object') {
          const availObj = availabilityData as any;
          // Ensure recurring has all days with enabled and slots
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
        normalizedAvailability = null; // Calendar will not disable dates if null
      }

      // Transform the response to match expected Space interface
      // Note: We are using the updated Space type which extends workspaces Row
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
        // Ensure arrays are not null
        photos: workspaceData.photos || [],
        amenities: workspaceData.amenities || [],
        seating_types: workspaceData.seating_types || [],
        features: workspaceData.features || [],
        event_friendly_tags: workspaceData.event_friendly_tags || [],
        ideal_guest_tags: workspaceData.ideal_guest_tags || [],
        // Explicitly set optional fields if they are missing from workspaces
        timezone: undefined,
        city: workspaceData.city || undefined,
        country_code: undefined,

        host: hostData ? {
          id: hostData.id,
          first_name: hostData.first_name,
          last_name: hostData.last_name,
          profile_photo_url: hostData.profile_photo_url,
          bio: hostData.bio || undefined,
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

  // Load reviews (list only) - rating comes from cached_avg_rating in workspace data
  const { data: reviews = [] } = useSpaceReviewsQuery(id || '');

  // Try to fetch precise location (only if user has confirmed booking or is owner/admin)
  const { data: preciseLocation } = useSpaceLocation(id, !!id);
  const { data: hasConfirmedBooking } = useHasConfirmedBooking(id);

  // Enhance space data with precise location if available
  const enhancedSpace = React.useMemo(() => {
    if (!space) return space;
    
    // If user has access to precise location, use it
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
    
    // Otherwise, try to construct a display address from city
    return {
      ...space,
      hasPreciseLocation: false,
      hasConfirmedBooking: !!hasConfirmedBooking,
    };
  }, [space, preciseLocation, hasConfirmedBooking]);

  sreLogger.debug('Location access', {
    spaceId: id,
    hasConfirmedBooking,
    hasPreciseLocation: !!preciseLocation,
    showingCityOnly: !preciseLocation
  });

  // Realtime subscription for host profile updates (Stripe status)
  useEffect(() => {
    if (!space?.host_id) return;

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
          sreLogger.debug('Realtime profile update received', { payload });
          const newStripeConnected = payload.new.stripe_connected;
          const newStripeAccountId = payload.new.stripe_account_id;

          // Update the query cache
          queryClient.setQueryData(['space', id], (oldData: any) => {
            if (!oldData) return oldData;

            return {
              ...oldData,
              host_stripe_connected: newStripeConnected,
              host_stripe_account_id: newStripeAccountId,
              // Update nested host object as well
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

  // Loading state con debug info
  if (spaceLoading) {
    sreLogger.debug('Loading space', { spaceId: id, component: 'SpaceDetail' });
    return (
      <div className="container mx-auto py-8 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-2 text-gray-600">Caricamento spazio...</p>
          {id && <p className="text-xs text-gray-400">ID: {id}</p>}
        </div>
      </div>
    );
  }

  // Error state con dettagli
  if (spaceError) {
    sreLogger.error('Error state', { spaceId: id, component: 'SpaceDetail' }, spaceError as Error);
    return (
      <div className="container mx-auto py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-2">Errore nel caricamento</h1>
          <p className="text-gray-600 mb-4">
            {spaceError.message || 'Errore sconosciuto nel caricamento dello spazio'}
          </p>
          {id && (
            <div className="bg-gray-100 p-4 rounded-lg mt-4">
              <p className="text-sm text-gray-600">
                <strong>ID Spazio:</strong> {id}
              </p>
              <p className="text-sm text-gray-600 mt-1">
                <strong>Errore:</strong> {spaceError.message}
              </p>
            </div>
          )}
          <button 
            onClick={() => window.location.reload()} 
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Riprova
          </button>
        </div>
      </div>
    );
  }

  // Space not found
  if (!enhancedSpace) {
    sreLogger.warn('Space not found', { spaceId: id, component: 'SpaceDetail' });
    return (
      <div className="container mx-auto py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Spazio non trovato</h1>
          <p className="text-gray-600 mb-4">
            Lo spazio che stai cercando non esiste o non è più disponibile.
          </p>
          {id && (
            <div className="bg-gray-100 p-4 rounded-lg">
              <p className="text-sm text-gray-600">
                <strong>ID ricercato:</strong> {id}
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Success - render space details
  sreLogger.debug('Rendering space details', { 
    spaceId: enhancedSpace?.id, 
    hasPreLocation: !!preciseLocation,
    component: 'SpaceDetail' 
  });
  
  // Use cached rating from workspace data, fallback to 0
  const cachedRating = enhancedSpace?.cached_avg_rating || 0;

  return (
    <div className={`container mx-auto py-8 ${isStitch ? 'bg-stitch-bg' : ''}`}>
      {isStitch ? (
        <Suspense fallback={<div className="min-h-[400px] bg-stitch-bg" />}>
          <SpaceHeroStitch>
            <SpaceDetailContent 
              space={enhancedSpace!} 
              reviews={reviews}
              weightedRating={cachedRating}
            />
          </SpaceHeroStitch>
        </Suspense>
      ) : (
        <SpaceDetailContent 
          space={enhancedSpace!} 
          reviews={reviews}
          weightedRating={cachedRating}
        />
      )}
    </div>
  );
};

export default SpaceDetail;
