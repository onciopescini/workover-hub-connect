# Security & Performance Audit Report

## 1. High Priority: Security Vulnerabilities (FIXED)

### Profile PII Exposure
**Severity:** Critical
**Status:** Fixed
**Description:**
The application was using `.select('*')` on the `profiles` table in `src/lib/profile-access-utils.ts`, which is the core utility for profile access.
This table contains sensitive PII including:
- `fiscal_code`
- `vat_number`
- `billing_address`
- `email` (potentially duplicated from auth)
- `phone_number`

Even though the UI might filter what is displayed, the full data object was being sent over the network, allowing an attacker to inspect the response and view sensitive data.

**Fix Applied:**
Refactored `fetchUserProfileWithAccess` in `src/lib/profile-access-utils.ts` to explicitly select only safe, public fields:
- `id`, `first_name`, `last_name`, `profile_photo_url`, `bio`
- Professional info (`job_title`, `profession`, `location`, `skills`, etc.)
- Social links
- Networking preferences (`collaboration_*`)

This ensures that sensitive columns are never queried from the database for public/connected views.

## 2. Medium Priority: Inconsistencies

### Input Sanitization Consistency
**Severity:** Medium
**Status:** Open (Report Only)
**Description:**
The project has a robust sanitization library (`src/lib/input-sanitization.ts`) with Zod schemas for `securitySchemas`.
However, the main booking form `TwoStepBookingForm.tsx` (and potentially other forms) defines its own local Zod schemas or relies on basic type checking rather than importing the centralized security schemas.
- **Risk:** Inconsistent validation rules. If `input-sanitization.ts` is updated to block a new XSS vector, `TwoStepBookingForm` might remain vulnerable.
- **Recommendation:** Refactor forms to import schemas from `input-sanitization.ts`. (e.g., use `securitySchemas.futureDate` instead of local date checks).

## 3. Performance Findings

### N+1 Query Pattern in Search
**Severity:** Medium/High
**Status:** Open (Report Only)
**Description:**
The `Search.tsx` page fetches a list of spaces (`fetchSpaces` / `useQuery`).
For *each* space rendered in the grid, the `SpaceCard` component calls `useSpaceReviews(space.id)`.
- **Impact:** If 12 spaces are shown, this triggers:
  - 1 query for spaces list
  - 12 separate RPC calls for reviews (`get_space_reviews`)
  - 12 separate RPC calls for weighted ratings (`calculate_space_weighted_rating`)
  - **Total:** 25 network requests per search page load.
- **Recommendation:**
  - Create a new RPC `search_spaces_with_stats` that joins reviews/ratings on the server side.
  - OR use a `View` that pre-calculates average ratings.
  - OR fetch reviews in bulk for the list of IDs.

### Large Component: `TwoStepBookingForm`
**Severity:** Low (Maintenance/Bundle Size)
**Status:** Open
**Description:**
`TwoStepBookingForm.tsx` is approximately 500 lines of code handling:
- UI State (Steps)
- Availability Logic (Date/Time parsing)
- Fiscal Data logic
- Booking Submission
This makes it harder to maintain and test.
- **Recommendation:** Extract the "Availability Logic" into a custom hook `useAvailabilityCalculator` and the "Fiscal Logic" into `useFiscalForm`.

### Good Practices Observed
- **Lazy Loading:** Excellent usage of `React.lazy` in `AppRoutes.tsx` for almost all routes.
- **Date-fns:** Efficient imports (`import { format } from 'date-fns'`) allowing tree-shaking.
