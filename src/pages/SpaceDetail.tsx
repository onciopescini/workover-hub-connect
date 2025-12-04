import React, { lazy, Suspense } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { SpaceDetailContent } from '@/components/spaces/SpaceDetailContent';
import { Space } from '@/types/space';
import { useSpaceReviewsWithRating } from '@/hooks/queries/useSpaceReviewsQuery';
import { sreLogger } from '@/lib/sre-logger';
import { useSpaceLocation, useHasConfirmedBooking } from '@/hooks/queries/useSpaceLocation';

const SpaceHeroStitch = lazy(() => import('@/feature/spaces/SpaceHeroStitch'));

const SpaceDetail = () => {
  const { id } = useParams<{ id: string }>();
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
      
      // Refactor: Query 'workspaces' table instead of RPC/spaces
      const { data: workspaceData, error: workspaceError } = await (supabase
        .from('workspaces' as any) as any)
        .select('*')
        .eq('id', id)
        .single();

      if (workspaceError) {
        sreLogger.error('Database error', { spaceId: id, component: 'SpaceDetail' }, workspaceError as Error);
        throw workspaceError;
      }
      
      if (!workspaceData) {
        sreLogger.error('No space found for ID', { spaceId: id, component: 'SpaceDetail' }, new Error('Space not found'));
        throw new Error('Space not found');
      }

      // Fetch host info
      const { data: hostData, error: hostError } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, profile_photo_url, bio, created_at, stripe_account_id, stripe_connected')
        .eq('id', workspaceData.host_id)
        .single();

      if (hostError) {
        sreLogger.warn('Error fetching host info', { hostId: workspaceData.host_id }, hostError);
        // Continue without host details if fail
      }
      
      sreLogger.debug('Space fetched successfully', {
        spaceId: workspaceData.id,
        title: workspaceData.name,
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
          // Ensure recurring has all days with enabled and slots
          const defaultDay = { enabled: false, slots: [] };
          normalizedAvailability = {
            recurring: {
              monday: availabilityData.recurring?.monday || defaultDay,
              tuesday: availabilityData.recurring?.tuesday || defaultDay,
              wednesday: availabilityData.recurring?.wednesday || defaultDay,
              thursday: availabilityData.recurring?.thursday || defaultDay,
              friday: availabilityData.recurring?.friday || defaultDay,
              saturday: availabilityData.recurring?.saturday || defaultDay,
              sunday: availabilityData.recurring?.sunday || defaultDay,
            },
            exceptions: availabilityData.exceptions || []
          };
        }
      } catch (parseError) {
        sreLogger.warn('Failed to parse availability', { spaceId: id, error: parseError });
        normalizedAvailability = null; // Calendar will not disable dates if null
      }

      // Transform the response to match expected Space interface
      return {
        id: workspaceData.id,
        title: workspaceData.name, // Map name to title
        description: workspaceData.description || "",
        photos: workspaceData.photos || [],
        address: workspaceData.address,
        latitude: workspaceData.latitude || 0,
        longitude: workspaceData.longitude || 0,
        price_per_day: workspaceData.price_per_day,
        price_per_hour: workspaceData.price_per_hour,
        max_capacity: workspaceData.max_capacity,
        capacity: workspaceData.max_capacity,
        category: workspaceData.category,
        workspace_features: workspaceData.features || [], // Map features to workspace_features
        amenities: workspaceData.amenities || [],
        seating_types: workspaceData.seating_types || [],
        work_environment: workspaceData.work_environment || "controlled",
        rules: workspaceData.rules,
        host_id: workspaceData.host_id, // Keep hidden-for-security logic if needed, but here we use actual ID or masked one
        published: workspaceData.published || false,
        created_at: workspaceData.created_at || new Date().toISOString(),
        updated_at: workspaceData.updated_at || new Date().toISOString(),
        deleted_at: workspaceData.deleted_at || null,
        is_suspended: workspaceData.is_suspended || false,
        suspension_reason: workspaceData.suspension_reason || null,
        suspended_at: workspaceData.suspended_at || null,
        suspended_by: workspaceData.suspended_by || null,
        availability: normalizedAvailability,
        cancellation_policy: workspaceData.cancellation_policy,
        confirmation_type: workspaceData.confirmation_type || "instant",
        approved_at: null,
        approved_by: null,
        approximate_location: null,
        cached_avg_rating: null,
        cached_review_count: null,
        city_name: null,
        country_code: null,
        event_friendly_tags: workspaceData.event_friendly_tags || [],
        ideal_guest_tags: workspaceData.ideal_guest_tags || [],
        pending_approval: false,
        rejection_reason: null,
        revision_notes: null,
        revision_requested: false,
        host: hostData ? {
          id: hostData.id,
          first_name: hostData.first_name,
          last_name: hostData.last_name,
          profile_photo_url: hostData.profile_photo_url,
          bio: hostData.bio,
          created_at: hostData.created_at
        } : {
          id: 'unknown',
          first_name: 'Host',
          last_name: '',
          profile_photo_url: null,
          created_at: new Date().toISOString()
        },
        host_total_spaces: 0, // Placeholder as we don't count here
        host_stripe_account_id: hostData?.stripe_account_id || '',
        host_stripe_connected: hostData?.stripe_connected || false
      } as unknown as Space & {
        host?: {
          id: string;
          first_name: string;
          last_name: string;
          profile_photo_url: string | null;
          bio?: string;
          created_at: string;
        };
      };
    },
    enabled: !!id
  });

  // Load reviews and weighted rating from database
  const { reviews, weightedRating, isLoading: reviewsLoading } = useSpaceReviewsWithRating(id || '');

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
    
    // Otherwise, keep city-level location from spaces_public_safe
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
  
  return (
    <div className={`container mx-auto py-8 ${isStitch ? 'bg-stitch-bg' : ''}`}>
      {isStitch ? (
        <Suspense fallback={<div className="min-h-[400px] bg-stitch-bg" />}>
          <SpaceHeroStitch>
            <SpaceDetailContent 
              space={enhancedSpace!} 
              reviews={reviews}
              weightedRating={weightedRating}
            />
          </SpaceHeroStitch>
        </Suspense>
      ) : (
        <SpaceDetailContent 
          space={enhancedSpace!} 
          reviews={reviews}
          weightedRating={weightedRating}
        />
      )}
    </div>
  );
};

export default SpaceDetail;
