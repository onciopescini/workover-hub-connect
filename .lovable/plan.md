
# Fix Infinite Re-render Loop in Location Filter

## Problem Analysis

When a user clicks "Use my location" on the Spaces Search page, the application enters an infinite re-render loop causing a crash. I've traced the issue through multiple components and identified **three interconnected root causes**.

---

## Root Cause Identification

### Root Cause #1: Cyclic State-URL Synchronization

**Location:** `src/hooks/usePublicSpacesLogic.ts` (lines 383-403 & 720-727)

The `useEffect` at line 383 syncs URL parameters to internal filter state:

```text
useEffect → reads initialCoordinates from URL → updates filters state
```

But `getUserLocation()` at line 720 does the reverse:

```text
getUserLocation → updates filters state → calls syncFiltersToUrl → updates URL
```

**The Loop:**
1. User clicks "Use my location"
2. `getUserLocation()` gets coordinates and calls `setFilters()` with new coordinates
3. `setFilters()` triggers `syncFiltersToUrl()` which updates the URL
4. URL change triggers `useLocationParams()` to return new `initialCoordinates`
5. The `useEffect` at line 383 sees `initialCoordinates` changed and calls `setFilters()` again
6. The cycle repeats indefinitely

### Root Cause #2: Unstable Object Reference in Dependencies

**Location:** `src/hooks/useLocationParams.ts` (lines 25-28)

```typescript
const initialCoordinates = (latParam && lngParam) ? {
  lat: parseFloat(latParam),
  lng: parseFloat(lngParam)
} : null;
```

This creates a **new object reference** on every render, even when lat/lng values are identical. When used in the `useEffect` dependency array in `usePublicSpacesLogic.ts` (line 403), React sees it as a new dependency every time and re-runs the effect.

### Root Cause #3: Missing Equality Check Before State Update

**Location:** `src/hooks/usePublicSpacesLogic.ts` (lines 383-398)

The `setFilters()` call inside `useEffect` always updates state without checking if values actually changed:

```typescript
setFilters(prev => ({
  ...prev,
  coordinates: initialCoordinates || prev.coordinates, // No equality check!
  // ... other fields
}));
```

Even if `initialCoordinates` has the same lat/lng values, a new object triggers re-render.

---

## Solution Implementation

### Fix 1: Memoize Coordinates in useLocationParams

Stabilize the coordinate object reference using `useMemo`:

```typescript
// src/hooks/useLocationParams.ts

import { useSearchParams, useMemo } from 'react-router-dom';

// Replace lines 25-28 with:
const initialCoordinates = useMemo(() => {
  if (latParam && lngParam) {
    return {
      lat: parseFloat(latParam),
      lng: parseFloat(lngParam)
    };
  }
  return null;
}, [latParam, lngParam]); // Only recreate when URL params actually change
```

### Fix 2: Add Coordinate Equality Check in usePublicSpacesLogic

Prevent unnecessary state updates by comparing coordinate values:

```typescript
// src/hooks/usePublicSpacesLogic.ts

// Add helper function after line 25:
const areCoordinatesEqual = (
  a: { lat: number; lng: number } | null,
  b: { lat: number; lng: number } | null
): boolean => {
  if (a === null && b === null) return true;
  if (a === null || b === null) return false;
  return a.lat === b.lat && a.lng === b.lng;
};

// Modify the useEffect at lines 383-403:
useEffect(() => {
  setFilters(prev => {
    // Skip update if coordinates are already equal
    const shouldUpdateCoords = !areCoordinatesEqual(initialCoordinates, prev.coordinates);
    
    // Only update if there are actual changes
    if (!shouldUpdateCoords && 
        (initialCity || '') === prev.location &&
        // ... other equality checks
    ) {
      return prev; // Return previous state, no re-render
    }
    
    return {
      ...prev,
      location: initialCity || prev.location,
      coordinates: shouldUpdateCoords ? initialCoordinates : prev.coordinates,
      // ... rest of fields
    };
  });

  if (initialCoordinates && !areCoordinatesEqual(initialCoordinates, userLocation)) {
    setUserLocation(initialCoordinates);
  }
}, [initialCity, initialCoordinates, /* ... */]);
```

### Fix 3: Guard getUserLocation Against Redundant Updates

Add equality check before updating state:

```typescript
// src/hooks/usePublicSpacesLogic.ts (lines 720-731)

if (locationResult) {
  info('User location obtained successfully');
  
  // Only update if coordinates actually changed
  if (!areCoordinatesEqual(locationResult, userLocation)) {
    setUserLocation(locationResult);
    setFilters(prev => {
      // Double-check: don't update if already equal
      if (areCoordinatesEqual(locationResult, prev.coordinates)) {
        return prev;
      }
      const next = { ...prev, coordinates: locationResult };
      syncFiltersToUrl(next, radiusKm);
      return next;
    });
  }
}
```

### Fix 4: Stabilize syncFiltersToUrl Reference

Wrap `syncFiltersToUrl` in `useCallback` to prevent recreation:

```typescript
// src/hooks/usePublicSpacesLogic.ts

const syncFiltersToUrl = useCallback((newFilters: SpaceFilters, radius: number) => {
  updateLocationParam(
    newFilters.location,
    newFilters.coordinates || undefined,
    radius,
    {
      category: newFilters.category,
      priceRange: newFilters.priceRange,
      workEnvironment: newFilters.workEnvironment,
      amenities: newFilters.amenities,
      minCapacity: newFilters.capacity[0],
      date: newFilters.startDate,
      startTime: newFilters.startTime,
      endTime: newFilters.endTime
    }
  );
}, [updateLocationParam]);
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/hooks/useLocationParams.ts` | Add `useMemo` for `initialCoordinates` to stabilize object reference |
| `src/hooks/usePublicSpacesLogic.ts` | Add `areCoordinatesEqual` helper, guard `useEffect` and `getUserLocation` against redundant updates, wrap `syncFiltersToUrl` in `useCallback` |

---

## Technical Details

### Why This Happens in React

React's `useEffect` uses `Object.is()` for dependency comparison. Since objects are compared by reference (not value), `{ lat: 45.0, lng: 9.0 } !== { lat: 45.0, lng: 9.0 }` even though their contents are identical.

### State Update Flow (After Fix)

```text
User clicks "Use my location"
    ↓
getUserLocation() obtains coordinates
    ↓
areCoordinatesEqual(newCoords, currentCoords)?
    ↓
NO → Update state, sync to URL, useEffect skips (memoized)
YES → Skip update entirely (loop broken)
```

---

## Additional Recommendation

Consider using React Query's mutation pattern for geolocation instead of direct state updates, which provides built-in deduplication:

```typescript
const locationMutation = useMutation({
  mutationKey: ['user-location'],
  mutationFn: getUserLocationAsync,
  onSuccess: (coords) => {
    // Single controlled update point
  }
});
```

This would centralize location updates and prevent race conditions.
