# Frontend Architecture Map: Communication & Maps
**Audit Date:** 2025-02-19
**Auditor:** Jules

## 1. Notification Architecture
**Status:** ✅ Clean & Modern
**Active Table:** `user_notifications`
**Legacy Table:** `notifications` (Unused)

The frontend exclusively interacts with the `user_notifications` table for all notification logic, including fetching unread counts, displaying lists, and realtime subscriptions.

### Key Components & Hooks:
*   `src/hooks/useNotifications.ts`: Main hook for fetching and subscribing to `user_notifications`.
*   `src/hooks/useUnreadCount.ts`: Queries `user_notifications` for the badge count.
*   `src/components/host/BookingApprovalCard.tsx`: Inserts into `user_notifications` for host actions.
*   `src/lib/notification-utils.ts`: Utility functions interacting with `user_notifications`.

### Recommendation:
*   **Action:** The `notifications` table is safe to drop from the backend as the frontend has zero dependencies on it.

## 2. Communication Layer (Email & Messaging)
**Status:** ✅ Secure (Edge Functions)

The frontend adheres to strict security practices by **never** triggering emails directly via client-side SMTP or API keys. All email triggers are proxied through Supabase Edge Functions.

### Email Triggers:
*   **Auth:** Uses `supabase.auth.resend` (Native Supabase Auth).
*   **Support:** Calls `supabase.functions.invoke('send-support-notification')`.
*   **Verification:** `TrustBadgesSection` triggers auth verification emails via Supabase Auth.
*   **Bookings:** No direct frontend triggers found (implied usage of Database Webhooks/Triggers).

### Messaging Logic:
*   **Active Pages:** `ChatThread.tsx` (Conversation Detail), `MessageConversation.tsx` (Booking Context).
*   **Logic:** `src/lib/conversations.ts` handles direct DB inserts to `messages` and fallback notifications.

## 3. Map Architecture
**Status:** ✅ Standardized (`mapbox-gl`)

The application uses the native `mapbox-gl` library. It does **not** use `react-map-gl`.

### Implementation Details:
*   **Library:** `mapbox-gl` (imported directly).
*   **Auth:** Tokens are securely fetched via `supabase.functions.invoke('get-mapbox-token')`.
*   **Context:** `MapboxTokenContext` manages the token lifecycle.
*   **Key Components:**
    *   `src/components/spaces/SpaceMap.tsx`: Main map rendering.
    *   `src/components/spaces/AddressAutocomplete.tsx`: Geocoding logic.
    *   `src/hooks/useMapboxGeocoding.ts`: Hooks for address search.

## 4. Zombie Code Audit
**Status:** ⚠️ Cleanup Required

We identified unused files that duplicate functionality or have been bypassed by newer implementations.

### Confirmed Zombie Code:
*   **File:** `src/pages/Messages.tsx`
*   **Reason:** The route `/messages` in `AppRoutes.tsx` points directly to the component `@/components/messaging/UnifiedMessages`. The page wrapper `Messages.tsx` is completely bypassed and unused.

### Recommendation:
*   **Action:** Delete `src/pages/Messages.tsx` in the next cleanup phase.
