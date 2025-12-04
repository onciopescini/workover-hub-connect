# Legacy Reference Audit: Migration from `spaces` to `workspaces`

## Executive Summary
This report identifies all legacy references to the `spaces` table within the codebase and database schema. The primary issue causing empty public listings and host permission errors is that the active application logic and database views are still targeting the deprecated `spaces` table, while new data is being written to the manually created `workspaces` table.

## 1. Critical Findings: Infrastructure & RLS
**Severity:** Critical
**Status:** Manual / Missing from Codebase

The `workspaces` table exists in the production database but is **not defined** in the `supabase/migrations` codebase. This has led to a lack of visibility into its RLS (Row Level Security) policies, causing the reported "Host cannot edit" permission issues.

### Remediation: SQL Migration Snippet
To sync the codebase with the current manual state and fix RLS, the following migration should be applied:

```sql
-- Create workspaces table (sync with current state)
CREATE TABLE IF NOT EXISTS public.workspaces (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    host_id UUID NOT NULL REFERENCES public.profiles(id),
    name TEXT NOT NULL,
    description TEXT,
    address TEXT NOT NULL,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    category public.space_category NOT NULL,
    work_environment public.work_environment,
    max_capacity INTEGER NOT NULL,
    price_per_hour NUMERIC,
    price_per_day NUMERIC,
    photos TEXT[] DEFAULT '{}',
    features TEXT[] DEFAULT '{}', -- Maps to 'workspace_features'
    amenities TEXT[] DEFAULT '{}',
    seating_types TEXT[] DEFAULT '{}',
    ideal_guest_tags TEXT[] DEFAULT '{}',
    event_friendly_tags TEXT[] DEFAULT '{}',
    rules TEXT,
    availability JSONB,
    cancellation_policy public.cancellation_policy,
    confirmation_type public.confirmation_type,
    published BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;

-- Policy 1: Public Read Access (Fixes Listing Visibility)
CREATE POLICY "Public can view published workspaces"
ON public.workspaces FOR SELECT
USING (published = true);

-- Policy 2: Host Update Access (Fixes "Host cannot edit")
CREATE POLICY "Hosts can insert their own workspaces"
ON public.workspaces FOR INSERT
WITH CHECK (auth.uid() = host_id);

CREATE POLICY "Hosts can update their own workspaces"
ON public.workspaces FOR UPDATE
USING (auth.uid() = host_id);

CREATE POLICY "Hosts can delete their own workspaces"
ON public.workspaces FOR DELETE
USING (auth.uid() = host_id);

CREATE POLICY "Hosts can view their own workspaces (even unpublished)"
ON public.workspaces FOR SELECT
USING (auth.uid() = host_id);
```

## 2. Files to Fix: Active Data Fetching
These components are currently fetching dead data from `spaces` and must be updated to query `workspaces`.

### Database Views & RPCs (High Priority)
*   **`supabase/migrations/...` (View: `spaces_public_safe`)**: Defined as `SELECT ... FROM public.spaces`. Must be updated to `FROM public.workspaces`.
*   **`supabase/migrations/...` (RPC: `search_spaces_by_radius`)**: Queries `public.spaces`. Must be updated to `public.workspaces`.
*   **`supabase/migrations/...` (RPC: `search_spaces_by_location_text`)**: Queries `public.spaces`. Must be updated to `public.workspaces`.

### React Hooks (Frontend)
*   **`src/hooks/usePublicSpacesLogic.ts`**:
    *   Uses `search_spaces_by_radius` (RPC) -> Targets `spaces`.
    *   Uses `search_spaces_by_location_text` (RPC) -> Targets `spaces`.
    *   Fallback query `.from('spaces_public_safe')` -> Targets `spaces`.
*   **`src/lib/space-utils.ts`**:
    *   Function `getHostSpaces` calls `.from('spaces')`.
*   **`src/hooks/queries/useSpaceMetrics.ts`**:
    *   Function `useSpaceMetrics` attempts RPC but falls back to `.from('bookings')` joined with `spaces`.

## 3. Booking Logic Risk (High Priority / Breaking Change)
**Severity:** High
**Issue:** Foreign Key Dependency

The `bookings` table logic is tightly coupled to `spaces`.
*   **Code File:** `src/hooks/queries/bookings/useBookingDataFetcher.ts`
*   **Problem:** The `fetchCoworkerBookings` and `fetchHostBookings` functions explicitly join the old table:
    ```typescript
    .select(`*, space:spaces (...)`)
    ```
*   **Database Risk:** The `bookings.space_id` column likely has a Foreign Key constraint referencing `public.spaces.id`.
*   **Action Required:**
    1.  Update `bookings` table to reference `public.workspaces(id)` instead of `spaces`.
    2.  Update `useBookingDataFetcher.ts` to join `space:workspaces (...)`.

## 4. Type Mismatches
**Severity:** Medium
**Status:** Workaround in place (`as any`)

New code is forcing `workspaces` data into the system using unsafe casting because the Supabase types (`Database` interface) do not include `workspaces`.

*   **Files using `as any` casting:**
    *   `src/hooks/useSpaceEdit.ts`
    *   `src/pages/SpacesManage.tsx`
    *   `src/pages/SpaceDetail.tsx`
*   **Missing Type Definition:** `src/integrations/supabase/types.ts` is missing `workspaces`.
