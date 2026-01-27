
# Operation 10/10 - Phase 3: Tech Purity & Vaporware Removal

## Executive Summary

This phase eliminates all mock data, hardcoded fallbacks, and incomplete implementations ("Vaporware") while completing the Service Layer migration for the Chat system. The goal is 10/10 Technical Completeness.

---

## Current State Analysis

### Identified Vaporware

| Component | Issue | Location |
|-----------|-------|----------|
| Chat Service | Direct Supabase calls in hook | `src/hooks/chat/useChat.ts` |
| Chat - Fallback UUID | Hardcoded `00000000-0000-0000-0000-000000000000` | `useChat.ts:180` |
| Networking Dashboard | Mock `messagesThisWeek: 24` | `src/pages/Networking.tsx:41` |
| Networking Dashboard | Mock `profileViews: 89` | `src/pages/Networking.tsx:42` |
| Networking Dashboard | Mock `connectionRate: 78` | `src/pages/Networking.tsx:43` |
| Search Map | `userLocation={null} // TODO` | `src/pages/Search.tsx:186` |
| Availability Scheduler | `bookings={[]} // TODO` | `RefactoredAvailabilityScheduler.tsx:133,150` |

### Existing Infrastructure
- `src/lib/conversations.ts` - Already has proper messaging functions
- `src/hooks/useProfileViews.ts` - Already fetches real profile views
- `src/hooks/usePublicSpacesLogic.ts` - Has working `getUserLocation` implementation
- `src/hooks/useSpaceHourlyAvailability.ts` - Fetches real bookings for a space

---

## Implementation Plan

### 1. Chat Service Refactor (Critical Tech Debt)

#### 1.1 Create Chat Service

**New File:** `src/services/api/chatService.ts`

This service consolidates all chat-related logic following the established Service Layer Pattern.

```typescript
/**
 * Chat Service Layer
 * 
 * Handles all chat and messaging API calls with proper error handling
 * and type safety. Follows the established Service Layer Pattern.
 */

import { supabase } from '@/integrations/supabase/client';
import { sreLogger } from '@/lib/sre-logger';
import { 
  Conversation, 
  Message, 
  ChatParticipant,
  DeleteMessagePayload,
  ArchiveConversationPayload 
} from '@/types/chat';

// ============= TYPES =============

export interface FetchConversationsResult {
  success: boolean;
  conversations?: Conversation[];
  error?: string;
}

export interface FetchMessagesResult {
  success: boolean;
  messages?: Message[];
  error?: string;
}

export interface SendMessageParams {
  conversationId: string;
  senderId: string;
  content: string;
}

export interface SendMessageResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

// ============= FETCH CONVERSATIONS =============

export async function fetchConversations(userId: string): Promise<FetchConversationsResult> {
  if (!userId) {
    return { success: false, error: 'User ID is required' };
  }

  sreLogger.info('Fetching conversations', { component: 'chatService', userId });

  try {
    const { data, error } = await supabase
      .from("conversations")
      .select(`
        id,
        updated_at,
        last_message,
        last_message_at,
        booking_id,
        participant_status:conversation_participants!inner (
          user_id,
          archived_at,
          last_read_at
        ),
        conversation_participants:conversation_participants (
          user_id,
          archived_at,
          last_read_at,
          profiles (
            id,
            first_name,
            last_name,
            profile_photo_url
          )
        )
      `)
      .eq("participant_status.user_id", userId)
      .is("participant_status.archived_at", null)
      .order("updated_at", { ascending: false });

    if (error) {
      sreLogger.error('Error fetching conversations', { component: 'chatService' }, error);
      return { success: false, error: error.message };
    }

    const conversations: Conversation[] = (data ?? []).map((conv: any) => ({
      id: conv.id,
      updated_at: conv.updated_at,
      participants: conv.conversation_participants.map((cp: any): ChatParticipant => ({
        id: cp.profiles.id,
        first_name: cp.profiles.first_name,
        last_name: cp.profiles.last_name,
        profile_photo_url: cp.profiles.profile_photo_url,
        avatar_url: cp.profiles.profile_photo_url || null,
      })),
      last_message: conv.last_message
        ? { content: conv.last_message, created_at: conv.last_message_at || conv.updated_at }
        : null,
      archived_at: conv.participant_status?.[0]?.archived_at ?? null,
      last_read_at: conv.participant_status?.[0]?.last_read_at ?? null,
    }));

    return { success: true, conversations };
  } catch (err) {
    sreLogger.error('Exception fetching conversations', { component: 'chatService' }, err as Error);
    return { success: false, error: 'Failed to fetch conversations' };
  }
}

// ============= FETCH MESSAGES =============

export async function fetchMessages(conversationId: string): Promise<FetchMessagesResult> {
  if (!conversationId) {
    return { success: false, error: 'Conversation ID is required' };
  }

  sreLogger.info('Fetching messages', { component: 'chatService', conversationId });

  try {
    const { data, error } = await supabase
      .from("messages")
      .select("id, conversation_id, sender_id, content, created_at, is_read")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });

    if (error) {
      sreLogger.error('Error fetching messages', { component: 'chatService' }, error);
      return { success: false, error: error.message };
    }

    return { success: true, messages: (data ?? []) as Message[] };
  } catch (err) {
    sreLogger.error('Exception fetching messages', { component: 'chatService' }, err as Error);
    return { success: false, error: 'Failed to fetch messages' };
  }
}

// ============= SEND MESSAGE =============

export async function sendMessage(params: SendMessageParams): Promise<SendMessageResult> {
  const { conversationId, senderId, content } = params;

  if (!conversationId || !senderId || !content) {
    return { success: false, error: 'Missing required parameters' };
  }

  sreLogger.info('Sending message', { component: 'chatService', conversationId });

  try {
    // Get the booking_id from the conversation (may be null for networking chats)
    const { data: conversationData, error: convError } = await supabase
      .from("conversations")
      .select("booking_id")
      .eq("id", conversationId)
      .single();

    if (convError) {
      sreLogger.error('Error fetching conversation', { component: 'chatService' }, convError);
      return { success: false, error: 'Could not find conversation' };
    }

    // Use actual booking_id or null - NO FALLBACK UUID
    const bookingId = conversationData?.booking_id || null;

    const { data: insertedMessage, error: insertError } = await supabase
      .from("messages")
      .insert({
        conversation_id: conversationId,
        sender_id: senderId,
        content,
        booking_id: bookingId // Can be null for networking conversations
      })
      .select('id')
      .single();

    if (insertError) {
      sreLogger.error('Error inserting message', { component: 'chatService' }, insertError);
      return { success: false, error: insertError.message };
    }

    // Update conversation metadata
    await supabase
      .from("conversations")
      .update({
        updated_at: new Date().toISOString(),
        last_message: content,
        last_message_at: new Date().toISOString()
      })
      .eq("id", conversationId);

    sreLogger.info('Message sent successfully', { component: 'chatService', messageId: insertedMessage.id });
    return { success: true, messageId: insertedMessage.id };
  } catch (err) {
    sreLogger.error('Exception sending message', { component: 'chatService' }, err as Error);
    return { success: false, error: 'Failed to send message' };
  }
}

// ============= DELETE MESSAGE =============

export async function deleteMessage(messageId: string): Promise<{ success: boolean; error?: string }> {
  if (!messageId) {
    return { success: false, error: 'Message ID is required' };
  }

  try {
    const { error } = await supabase.from("messages").delete().eq("id", messageId);
    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err) {
    return { success: false, error: 'Failed to delete message' };
  }
}

// ============= ARCHIVE CONVERSATION =============

export async function archiveConversation(
  conversationId: string, 
  userId: string
): Promise<{ success: boolean; error?: string }> {
  if (!conversationId || !userId) {
    return { success: false, error: 'Missing required parameters' };
  }

  try {
    const { error } = await supabase
      .from("conversation_participants")
      .update({ archived_at: new Date().toISOString() })
      .eq("conversation_id", conversationId)
      .eq("user_id", userId);

    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err) {
    return { success: false, error: 'Failed to archive conversation' };
  }
}

// ============= MARK CONVERSATION UNREAD =============

export async function markConversationUnread(
  conversationId: string, 
  userId: string
): Promise<{ success: boolean; error?: string }> {
  if (!conversationId || !userId) {
    return { success: false, error: 'Missing required parameters' };
  }

  try {
    const { error } = await supabase
      .from("conversation_participants")
      .update({ last_read_at: null })
      .eq("conversation_id", conversationId)
      .eq("user_id", userId);

    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err) {
    return { success: false, error: 'Failed to mark conversation unread' };
  }
}
```

#### 1.2 Update useChat Hook

**Modify:** `src/hooks/chat/useChat.ts`

Refactor to use the new chatService instead of direct Supabase calls:

```typescript
// Before (line 82-108):
const { data, error } = await supabase
  .from("conversations")
  .select(...)

// After:
import * as chatService from '@/services/api/chatService';

const result = await chatService.fetchConversations(user.id);
if (!result.success) {
  toast.error("Impossibile caricare le conversazioni");
  return [];
}
return result.conversations || [];
```

**Critical Fix - Remove Fallback UUID (line 180):**
```typescript
// Before:
const effectiveBookingId = bookingId || "00000000-0000-0000-0000-000000000000";

// After:
// booking_id can be null for networking conversations - this is valid
const { error } = await chatService.sendMessage({
  conversationId: activeConversationId,
  senderId: user.id,
  content
});
```

#### 1.3 Database Schema Update (If Needed)

The `messages.booking_id` column should allow NULL for networking conversations. If it doesn't, create a migration:

```sql
-- Allow NULL booking_id for networking conversations
ALTER TABLE public.messages 
ALTER COLUMN booking_id DROP NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.messages.booking_id IS 
  'Optional: NULL for networking conversations, UUID for booking-related messages';
```

---

### 2. Networking Dashboard (Real Data)

#### 2.1 Create Networking Stats RPC

**New Migration:** `supabase/migrations/YYYYMMDDHHMMSS_add_networking_stats_rpc.sql`

```sql
-- =====================================================
-- NETWORKING STATS RPC
-- Purpose: Efficient aggregated stats for dashboard
-- =====================================================

CREATE OR REPLACE FUNCTION public.get_networking_stats(p_user_id UUID)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  result jsonb;
  messages_count INTEGER;
  profile_views_count INTEGER;
  connection_rate DECIMAL(5,2);
  total_requests INTEGER;
  accepted_requests INTEGER;
BEGIN
  -- 1. Count messages sent/received in last 7 days
  SELECT COUNT(*) INTO messages_count
  FROM messages m
  JOIN conversation_participants cp ON cp.conversation_id = m.conversation_id
  WHERE cp.user_id = p_user_id
    AND m.created_at > NOW() - INTERVAL '7 days';

  -- 2. Get profile views (last 30 days, distinct viewers)
  SELECT COUNT(DISTINCT viewer_id) INTO profile_views_count
  FROM profile_views
  WHERE profile_id = p_user_id
    AND viewed_at > NOW() - INTERVAL '30 days'
    AND viewer_id IS NOT NULL;

  -- 3. Calculate connection acceptance rate
  -- Requests sent by user
  SELECT COUNT(*) INTO total_requests
  FROM connections
  WHERE sender_id = p_user_id;

  SELECT COUNT(*) INTO accepted_requests
  FROM connections
  WHERE sender_id = p_user_id AND status = 'accepted';

  IF total_requests > 0 THEN
    connection_rate := (accepted_requests::DECIMAL / total_requests) * 100;
  ELSE
    connection_rate := 0;
  END IF;

  result := jsonb_build_object(
    'messagesThisWeek', COALESCE(messages_count, 0),
    'profileViews', COALESCE(profile_views_count, 0),
    'connectionRate', ROUND(COALESCE(connection_rate, 0))
  );

  RETURN result;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.get_networking_stats(UUID) TO authenticated;
```

#### 2.2 Create useNetworkingStats Hook

**New File:** `src/hooks/useNetworkingStats.ts`

```typescript
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/auth/useAuth';

interface NetworkingStats {
  messagesThisWeek: number;
  profileViews: number;
  connectionRate: number;
}

export const useNetworkingStats = () => {
  const { authState } = useAuth();

  return useQuery({
    queryKey: ['networking-stats', authState.user?.id],
    queryFn: async (): Promise<NetworkingStats> => {
      if (!authState.user?.id) {
        return { messagesThisWeek: 0, profileViews: 0, connectionRate: 0 };
      }

      const { data, error } = await supabase.rpc('get_networking_stats', {
        p_user_id: authState.user.id
      });

      if (error) {
        console.error('Error fetching networking stats:', error);
        return { messagesThisWeek: 0, profileViews: 0, connectionRate: 0 };
      }

      return {
        messagesThisWeek: data?.messagesThisWeek ?? 0,
        profileViews: data?.profileViews ?? 0,
        connectionRate: data?.connectionRate ?? 0
      };
    },
    enabled: !!authState.user?.id,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};
```

#### 2.3 Update Networking Page

**Modify:** `src/pages/Networking.tsx`

Replace mock data with real data:

```typescript
// Add import
import { useNetworkingStats } from '@/hooks/useNetworkingStats';

// Inside component
const { data: networkingStats } = useNetworkingStats();

// Replace mock dashboardStats (lines 37-44)
const dashboardStats = {
  totalConnections: getActiveConnections().length,
  pendingRequests: getReceivedRequests().length,
  messagesThisWeek: networkingStats?.messagesThisWeek ?? 0,
  profileViews: networkingStats?.profileViews ?? 0,
  connectionRate: networkingStats?.connectionRate ?? 0
};
```

---

### 3. Search Map (Real Location)

#### 3.1 Create useUserLocation Hook

**New File:** `src/hooks/useUserLocation.ts`

Centralized geolocation logic with proper error handling:

```typescript
import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { sreLogger } from '@/lib/sre-logger';

interface Coordinates {
  lat: number;
  lng: number;
}

interface UseUserLocationResult {
  userLocation: Coordinates | null;
  isLoading: boolean;
  error: string | null;
  getUserLocation: () => Promise<Coordinates | null>;
}

// Default fallback: Milan, Italy
const DEFAULT_LOCATION: Coordinates = { lat: 45.4642, lng: 9.1900 };

export const useUserLocation = (): UseUserLocationResult => {
  const [userLocation, setUserLocation] = useState<Coordinates | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getUserLocation = useCallback(async (): Promise<Coordinates | null> => {
    setIsLoading(true);
    setError(null);

    if (!navigator.geolocation) {
      const errorMsg = 'Geolocalizzazione non supportata dal browser';
      setError(errorMsg);
      toast.error(errorMsg);
      setIsLoading(false);
      return null;
    }

    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 600000 // 10 minutes cache
        });
      });

      const coords: Coordinates = {
        lat: position.coords.latitude,
        lng: position.coords.longitude
      };

      setUserLocation(coords);
      setIsLoading(false);
      sreLogger.info('User location obtained', { component: 'useUserLocation', coords });
      return coords;

    } catch (geoError: any) {
      let errorMessage = 'Errore nel recupero della posizione';
      
      switch (geoError.code) {
        case geoError.PERMISSION_DENIED:
          errorMessage = 'Accesso alla posizione negato';
          toast.warning('Accesso alla posizione negato. Mostro risultati da Milano.');
          break;
        case geoError.POSITION_UNAVAILABLE:
          errorMessage = 'Posizione non disponibile';
          toast.warning('Posizione non disponibile. Mostro risultati da Milano.');
          break;
        case geoError.TIMEOUT:
          errorMessage = 'Timeout nel recupero della posizione';
          toast.warning('Timeout posizione. Mostro risultati da Milano.');
          break;
      }

      setError(errorMessage);
      setUserLocation(DEFAULT_LOCATION); // Set default location on error
      setIsLoading(false);
      
      sreLogger.warn('Geolocation failed, using default', { 
        component: 'useUserLocation',
        errorCode: geoError.code,
        fallback: DEFAULT_LOCATION
      });
      
      return DEFAULT_LOCATION;
    }
  }, []);

  return {
    userLocation,
    isLoading,
    error,
    getUserLocation
  };
};
```

#### 3.2 Update Search Page

**Modify:** `src/pages/Search.tsx`

```typescript
// Add imports
import { useUserLocation } from '@/hooks/useUserLocation';
import { useEffect } from 'react';

// Inside component, add hook
const { userLocation, getUserLocation, isLoading: isGettingLocation } = useUserLocation();

// Add useEffect to get location on mount (optional - or trigger via button)
useEffect(() => {
  // Optionally auto-request location on page load
  // getUserLocation();
}, []);

// Update LazySpaceMap (line 184-189):
<LazySpaceMap
  spaces={spaces}
  userLocation={userLocation}
  onSpaceClick={(id: string) => navigate(`/space/${id}`)}
/>

// Add "Near Me" button in the search bar section:
<Button 
  type="button" 
  variant="outline" 
  onClick={getUserLocation}
  disabled={isGettingLocation}
  className="h-12"
>
  <MapPin className="h-4 w-4 mr-2" />
  {isGettingLocation ? 'Localizzazione...' : 'Vicino a me'}
</Button>
```

---

### 4. Availability Conflicts (Real Logic)

#### 4.1 Add getBookingsForSpace to bookingService

**Modify:** `src/services/api/bookingService.ts`

Add a new method to fetch bookings for a specific space:

```typescript
// ============= TYPES =============

export interface SpaceBooking {
  id: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  status: string;
  guests_count: number;
}

export interface GetSpaceBookingsResult {
  success: boolean;
  bookings?: SpaceBooking[];
  error?: string;
}

// ============= GET BOOKINGS FOR SPACE =============

/**
 * Fetches all active bookings for a specific space.
 * Used by the availability scheduler to detect conflicts.
 * 
 * @param spaceId - The space ID to fetch bookings for
 * @returns Result with bookings on success, or error details on failure
 */
export async function getBookingsForSpace(spaceId: string): Promise<GetSpaceBookingsResult> {
  if (!spaceId) {
    return { success: false, error: 'Space ID is required' };
  }

  sreLogger.info('Fetching bookings for space', { component: 'bookingService', spaceId });

  try {
    const { data, error } = await supabase
      .from('bookings')
      .select('id, booking_date, start_time, end_time, status, guests_count')
      .eq('space_id', spaceId)
      .in('status', ['pending', 'confirmed'])
      .is('deleted_at', null)
      .gte('booking_date', new Date().toISOString().split('T')[0]) // Only future bookings
      .order('booking_date', { ascending: true });

    if (error) {
      sreLogger.error('Error fetching space bookings', { component: 'bookingService' }, error);
      return { success: false, error: error.message };
    }

    return { success: true, bookings: data || [] };
  } catch (err) {
    sreLogger.error('Exception fetching space bookings', { component: 'bookingService' }, err as Error);
    return { success: false, error: 'Failed to fetch bookings' };
  }
}
```

#### 4.2 Update Service Barrel Export

**Modify:** `src/services/api/index.ts`

Add the new export:

```typescript
export {
  reserveSlot,
  createCheckoutSession,
  getBookingsForSpace,  // Add this
  type ReserveSlotParams,
  type ReserveSlotResult,
  type CreateCheckoutSessionResult,
  type SpaceBooking,      // Add this
  type GetSpaceBookingsResult  // Add this
} from './bookingService';
```

#### 4.3 Update RefactoredAvailabilityScheduler

**Modify:** `src/components/spaces/RefactoredAvailabilityScheduler.tsx`

```typescript
// Add imports
import { useQuery } from '@tanstack/react-query';
import { getBookingsForSpace } from '@/services/api/bookingService';

// Add props interface
interface RefactoredAvailabilitySchedulerProps {
  spaceId?: string; // Optional - undefined for new spaces
}

export const RefactoredAvailabilityScheduler = ({ spaceId }: RefactoredAvailabilitySchedulerProps) => {
  const form = useFormContext<SpaceFormData>();
  const [viewMode, setViewMode] = useState<'basic' | 'advanced'>('basic');

  // Fetch real bookings for the space (only in edit mode)
  const { data: bookingsData } = useQuery({
    queryKey: ['space-bookings', spaceId],
    queryFn: async () => {
      if (!spaceId) return [];
      const result = await getBookingsForSpace(spaceId);
      return result.success ? result.bookings || [] : [];
    },
    enabled: !!spaceId && viewMode === 'advanced',
    staleTime: 1000 * 60 * 2, // 2 minutes
  });

  const spaceBookings = bookingsData || [];

  // ... existing code ...

  // Update ConflictManagementSystem and AdvancedCalendarView:
  <ConflictManagementSystem
    availability={normalizeAvailabilityData(field.value)}
    bookings={spaceBookings}  // Real bookings now!
    onConflictResolved={(bookingId, action) => {
      sreLogger.info('Conflict resolved', { 
        context: 'RefactoredAvailabilityScheduler',
        bookingId, 
        action 
      });
    }}
  />
  
  <AdvancedCalendarView
    availability={normalizeAvailabilityData(field.value)}
    onAvailabilityChange={...}
    spaceId={spaceId || 'new-space'}
    bookings={spaceBookings}  // Real bookings now!
  />
```

#### 4.4 Update RefactoredSpaceForm

**Modify:** `src/components/spaces/RefactoredSpaceForm.tsx`

Pass the spaceId to the scheduler:

```typescript
interface RefactoredSpaceFormProps {
  initialData?: Space;
  isEdit?: boolean;
}

const RefactoredSpaceForm = ({ initialData, isEdit = false }: RefactoredSpaceFormProps) => {
  // ... existing code ...

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(submitSpace)} className="space-y-8">
        <RefactoredBasicInformation />
        <RefactoredSpaceDetails />
        <RefactoredLocationPricing />
        <RefactoredAvailabilityScheduler spaceId={initialData?.id} /> {/* Pass spaceId */}
        <RefactoredPhotos ... />
        <RefactoredPublishingOptions />
        ...
      </form>
    </Form>
  );
};
```

---

## Files Summary

### Files to Create

| File | Description |
|------|-------------|
| `src/services/api/chatService.ts` | Chat service with all messaging logic |
| `src/hooks/useNetworkingStats.ts` | Hook for real networking statistics |
| `src/hooks/useUserLocation.ts` | Centralized geolocation hook |
| `supabase/migrations/YYYYMMDDHHMMSS_add_networking_stats_rpc.sql` | RPC for networking stats |

### Files to Modify

| File | Changes |
|------|---------|
| `src/hooks/chat/useChat.ts` | Use chatService, remove fallback UUID |
| `src/pages/Networking.tsx` | Replace mock data with useNetworkingStats |
| `src/pages/Search.tsx` | Add useUserLocation, update LazySpaceMap |
| `src/services/api/bookingService.ts` | Add getBookingsForSpace method |
| `src/services/api/index.ts` | Export new chatService and booking methods |
| `src/components/spaces/RefactoredAvailabilityScheduler.tsx` | Accept spaceId prop, fetch real bookings |
| `src/components/spaces/RefactoredSpaceForm.tsx` | Pass spaceId to scheduler |

---

## Database Changes (If Required)

If `messages.booking_id` is NOT NULL:

```sql
-- Migration: Allow NULL booking_id for networking conversations
ALTER TABLE public.messages 
ALTER COLUMN booking_id DROP NOT NULL;
```

---

## Technical Verification Checklist

After implementation:
- [ ] Chat messages send without fallback UUID
- [ ] Networking conversations work (booking_id = null)
- [ ] `get_networking_stats` RPC returns real counts
- [ ] Dashboard shows real `messagesThisWeek`
- [ ] Dashboard shows real `profileViews`
- [ ] Dashboard shows real `connectionRate`
- [ ] Search page requests geolocation
- [ ] Map shows user location marker
- [ ] Permission denied shows Milan fallback with toast
- [ ] Availability scheduler fetches real bookings in edit mode
- [ ] Conflict detector shows actual booking conflicts
- [ ] `npm run build` succeeds

---

## Vaporware Elimination Summary

| Component | Before | After |
|-----------|--------|-------|
| Chat booking_id | Fallback to `00000000...` | NULL for networking chats |
| messagesThisWeek | Hardcoded `24` | Real count from RPC |
| profileViews | Hardcoded `89` | Real count from RPC |
| connectionRate | Hardcoded `78` | Real calculation |
| Search userLocation | `null` | Browser Geolocation + fallback |
| Scheduler bookings | Empty array `[]` | Real space bookings |
| **Tech Purity Score** | **~60%** | **100%** |
