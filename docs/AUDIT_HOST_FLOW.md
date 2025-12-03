# Host Flow Deep Code Audit & Stabilization Plan

**Date:** October 26, 2023
**Author:** Lead Software Architect (Agent)
**Scope:** Host Flow (Listing Management)
**Status:** DRAFT

## Executive Summary

This audit focuses on stabilizing the **Host Flow** (listing creation and editing) for market launch. We have identified critical architectural inconsistencies in state management, data fetching, and media handling that currently threaten application stability. This document outlines the specific issues and the mandated architectural fixes to ensure a robust MVP.

---

## 1. Form Architecture & State Management

### The Issue: Split Sources of Truth
Currently, there is a fundamental conflict in how form state is managed:
*   **`src/components/spaces/RefactoredSpaceForm.tsx`** initializes its own local state using `react-hook-form` and manages data mapping internally.
*   **`src/hooks/useSpaceFormState.ts`** exists but is largely ignored or duplicated by the component.

This duplication leads to:
*   Inconsistent data initialization (empty fields like `category` or `published`).
*   Fragile mapping logic when the DB schema (`workspaces`) differs from the frontend types.
*   Difficulty in testing business logic isolated from the UI.

### The Fix: Centralized State Hook
**Decision:** `useSpaceFormState.ts` must be the **single source of truth**.

**Action Plan:**
1.  **Refactor `useSpaceFormState.ts`:** Update it to fully handle the initialization logic, type mapping (DB -> Frontend), and state updates.
2.  **Strip `RefactoredSpaceForm.tsx`:** Remove local `useForm` initialization logic that duplicates the hook. The component should become a "dumb" view that receives `formData`, `handlers`, and `errors` as props from the hook.
3.  **Explicit Mapping:** The hook must explicitly map legacy/DB fields (e.g., `workspace_features` vs `features`, `title` vs `name`) to ensure no field arrives as `null`.

---

## 2. Data Fetching Strategy

### The Issue: Fragmented Data Access
*   **`src/pages/SpaceEdit.tsx`** currently performs an **inline** fetch directly from the new `workspaces` table.
*   **`src/hooks/useSpaceEdit.ts`** exists but fetches from the legacy `spaces` table.

This fragmentation makes the code hard to maintain and update. If the schema changes, we have to hunt down inline queries.

### The Fix: Unified Data Layer
**Decision:** Centralize data fetching logic.

**Action Plan:**
1.  **Update `useSpaceEdit.ts`:** Rewrite this hook to target the **`workspaces`** table. It should handle the specific field selection and error handling.
2.  **Refactor `SpaceEdit.tsx`:** Remove the inline `supabase` query. Replace it with a call to the updated `useSpaceEdit` hook.
3.  **Outcome:** The page component focuses on layout/loading states, while the hook handles *how* we get the data.

---

## 3. UI/Media & The "Blob" Conflict

### The Issue: Persisting Temporary Blobs
In `RefactoredSpaceForm.tsx`, when a user selects a photo:
1.  A local `blob:` URL is generated for preview.
2.  This `blob:` URL is immediately pushed to the form's `photos` array.
3.  The upload happens asynchronously.
4.  **Failure Mode:** If the user saves the form before the upload completes (or if the upload fails silently/is unhandled), the `blob:` URL is saved to the Postgres database.
5.  **Impact:** Other users cannot see these images (blobs are local to the browser session), and it causes crashes when the app tries to load them.

### The Fix: Strict URL Handling & Data Cleanup
**Decision:** Fix the code to prevent saving blobs and clean up existing bad data.

**Action Plan (Code):**
1.  Modify the upload logic to keep `blob:` URLs in a separate "preview only" state.
2.  Only update the final `formData.photos` array with the **public URL** returned from Supabase Storage after a successful upload.
3.  Filter out any `blob:` strings during the `onSubmit` handler as a failsafe.

**Action Plan (Data Cleanup):**
Run the following SQL check to identify and eventually remove bad entries:
```sql
-- Identify workspaces with blob URLs in their photos array
SELECT id, name, photos
FROM workspaces
WHERE EXISTS (
  SELECT 1
  FROM jsonb_array_elements_text(photos) as photo_url
  WHERE photo_url LIKE 'blob:%'
);

-- Strategy: Update these rows to remove the specific array elements that start with 'blob:'
-- (Requires a specific Postgres function or manual cleanup script)
```

---

## 4. Image Optimization

### The Issue: Blocking the User Interface
The code currently calls `await startImageOptimization(...)` inside the photo upload loop.
*   This is a blocking call to an external Edge Function.
*   If the function is cold, times out, or errors (as seen in recent logs), the entire upload process hangs or crashes.

### The Fix: Disable for MVP
**Decision:** Disable blocking optimization.

**Action Plan:**
1.  **Comment out/Remove** the `await startImageOptimization` line in `RefactoredSpaceForm.tsx`.
2.  We will re-introduce image optimization later as a completely asynchronous background trigger (e.g., using Supabase Database Webhooks) that does not block the UI client.
