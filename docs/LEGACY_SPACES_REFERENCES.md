# Legacy 'spaces' Table Reference Report

The following files and locations were found to still reference the legacy `spaces` table (via `.from('spaces')` or `.from("spaces")`). These should be prioritized for migration to the new `workspaces` table.

## Source Code

### Hooks
*   `src/hooks/useHostProgress.ts`
*   `src/hooks/useSpaceRevisionStatus.ts`
*   `src/hooks/admin/useRealtimeAdminData.ts`
*   `src/hooks/admin/useAdminPrefetch.ts`

### Components & Pages
*   `src/components/layout/AdminLayout.tsx`
*   `src/pages/UserProfileView.tsx`
*   `src/pages/host/HostCalendar.tsx`

### Utilities
*   `src/lib/booking-reservation-utils.ts`
*   `src/lib/space-utils.ts`
*   `src/lib/regression-validation.ts`
*   `src/lib/host-utils.ts`
*   `src/lib/secure-data-utils.ts`
*   `src/lib/admin/admin-space-utils.ts`
*   `src/lib/admin/admin-stats-utils.ts`

## Edge Functions
*   `supabase/functions/storage-cleanup/index.ts`
*   `supabase/functions/restore-space/index.ts`
*   `supabase/functions/generate-gdpr-export/index.ts`
*   `supabase/functions/admin-security/index.ts`

## Tests
*   `src/tests/integration/payment-publish-flow.test.ts`
*   `tests/e2e/fiscal/complete-fiscal-flow.spec.ts`
*   `tests/security/rls-policies.test.ts`

## Notes
*   Found `spaces_public_safe` view usage in `src/pages/SpaceDetail.tsx` (Note: `spaces_public_safe` view likely queries `workspaces` now, but explicit `from('spaces')` calls are definitely legacy).
*   Documentation files were excluded from the above list but contain numerous references.
