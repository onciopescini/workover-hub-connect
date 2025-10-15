# Security Hardening - React Code Changes

## Overview
This document tracks the React/TypeScript code changes made to complete the security hardening migration that protects:
1. Host GPS coordinates and addresses (only shown after confirmed booking)
2. User personal data in profiles (only safe public data exposed)
3. Rate limits table (admin-only access)

## Changes Made

### 1. New Hook: `useSpaceLocation`
**File:** `src/hooks/queries/useSpaceLocation.ts`

**Purpose:** Fetch precise space location (GPS + full address) only for authorized users:
- Space owner (host_id = auth.uid())
- Users with confirmed booking
- Admins

**Usage:**
```typescript
const { data: preciseLocation } = useSpaceLocation(spaceId);
// Returns null if user doesn't have access
```

**Also includes:**
- `useHasConfirmedBooking(spaceId)` - Check if current user has confirmed booking

### 2. Updated: `secure-data-utils.ts`
**File:** `src/lib/secure-data-utils.ts`

**Changes:**
- `getPublicSpaces()`: Now uses `spaces_public_safe` view (excludes host_id, precise GPS, full address)
- `getPublicProfile()`: Now uses `profiles_public_safe` view (excludes phone, social URLs, etc.)
- `normalizeSpaceData()`: Updated to handle city-level location from secure views

**Before:**
```typescript
.from('spaces')
.select('*, latitude, longitude, address, host_id')
```

**After:**
```typescript
.from('spaces_public_safe')
.select('*') // Only city_name, country_code (no precise GPS)
```

### 3. Updated: `SpaceDetail.tsx`
**File:** `src/pages/SpaceDetail.tsx`

**Changes:**
- Imports new `useSpaceLocation` hook
- Fetches precise location if user has access
- Enhances space data with precise location when available
- Adds metadata flags: `hasPreciseLocation`, `hasConfirmedBooking`

**Flow:**
1. Fetch space details from RPC (uses secure view)
2. Try to fetch precise location (RLS protected)
3. If successful, replace city-level with precise location
4. If failed (no access), keep city-level location

### 4. New Component: `LocationAccessNotice`
**File:** `src/components/spaces/LocationAccessNotice.tsx`

**Purpose:** Inform users about location privacy:
- ✅ **Has Access:** "You can see precise address because you have confirmed booking"
- 🔒 **No Access:** "For host safety, precise address shown only after booking confirmation"

**Props:**
```typescript
interface LocationAccessNoticeProps {
  hasAccess: boolean;
  hasConfirmedBooking?: boolean;
}
```

### 5. Updated: `SpaceDetailContent.tsx`
**File:** `src/components/spaces/SpaceDetailContent.tsx`

**Changes:**
- Added `LocationAccessNotice` component after hero section
- Extended `ExtendedSpace` interface with location access metadata

## Security Benefits

### Before (Vulnerable)
```typescript
// ANY USER could see:
{
  host_id: "uuid-123",
  latitude: 45.464202, // ±10m precision
  longitude: 9.189982,
  address: "Via Roma 123, Apartment 5B, Milano, Italy"
}
```

### After (Secure)
```typescript
// PUBLIC users see:
{
  city_name: "Milano",
  country_code: "IT",
  // NO host_id, NO precise GPS, NO full address
}

// After CONFIRMED BOOKING:
{
  latitude: 45.464202,
  longitude: 9.189982,
  address: "Via Roma 123, Apartment 5B, Milano, Italy"
}
```

## Testing

### Test Case 1: Public User (No Booking)
1. Open space detail page (not logged in)
2. ✅ Should see: "Milano, IT" (city only)
3. ✅ Should see: Blue notice "Precise address shown after booking"
4. ❌ Should NOT see: Full street address or GPS coordinates

### Test Case 2: Logged User (No Booking)
1. Login as coworker
2. Open space detail page
3. ✅ Should see: "Milano, IT" (city only)
4. ✅ Should see: Blue notice "Precise address shown after booking"
5. ❌ Should NOT see: Full street address or GPS coordinates

### Test Case 3: User with Confirmed Booking
1. Login as coworker with confirmed booking for this space
2. Open space detail page
3. ✅ Should see: "Via Roma 123, Milano, IT" (full address)
4. ✅ Should see: Green notice "You can see precise address because you have confirmed booking"
5. ✅ Map should show precise GPS marker

### Test Case 4: Space Owner
1. Login as host (space owner)
2. Open your own space detail page
3. ✅ Should see: Full address and GPS coordinates
4. ✅ Should see: Green notice "You can see precise address because you are the owner"

### Test Case 5: Admin
1. Login as admin
2. Open any space detail page
3. ✅ Should see: Full address and GPS coordinates
4. ✅ Should have full access to space_locations table

## Database Tables Used

### `space_locations` (NEW - RLS Protected)
```sql
- space_id (PK)
- latitude (precise GPS)
- longitude (precise GPS)
- address (full street address)
```

**RLS Policies:**
- Owners can see their own spaces
- Users with confirmed bookings can see
- Admins can see all

### `spaces_public_safe` (NEW - View)
```sql
SELECT 
  id, title, description, photos,
  city_name, country_code, -- Only city-level
  -- EXCLUDED: host_id, latitude, longitude, address
FROM spaces
WHERE published = true
```

### `profiles_public_safe` (NEW - View)
```sql
SELECT 
  id, first_name, last_name, bio, city,
  -- EXCLUDED: phone, email, social URLs, full address
FROM profiles
WHERE networking_enabled = true
```

## Migration Completeness

✅ **SQL Migration:** Complete
✅ **React Hooks:** Complete
✅ **Components Updated:** Complete
✅ **Security Notices:** Complete
⏳ **Map Components:** Need review (if any exist)
⏳ **Admin Components:** Should still have full access

## Next Steps

1. **Review Map Components:** Check if any public maps show space markers with precise GPS
2. **Update Space Forms:** Ensure new spaces save to both `spaces` and `space_locations`
3. **Admin Panels:** Verify admins can still access all location data
4. **Mobile Views:** Test location privacy on mobile devices
5. **Performance:** Monitor RLS policy performance on `space_locations` table

## Rollback Plan

If issues occur, the migration can be rolled back:

1. **Restore old RLS policies on `spaces` table**
2. **Drop views:** `spaces_public_safe`, `profiles_public_safe`
3. **Drop table:** `space_locations`
4. **Revert code:** Restore from `spaces_backup_20250115_security`

## Security Compliance

✅ **GDPR Article 5(1)(c):** Data minimization - only necessary location data exposed
✅ **GDPR Article 25:** Privacy by design - location hidden by default
✅ **OWASP A01:** Broken Access Control - RLS policies prevent unauthorized access
✅ **ISO 27001:** Physical security - host locations protected from stalking/doxxing

---

**Date:** 2025-01-15
**Security Issue Fixed:** Host GPS Coordinates and Addresses Publicly Exposed
**Status:** ✅ Complete (React code changes)
