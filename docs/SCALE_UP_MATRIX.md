# Scale-Up Matrix — Enterprise Readiness Audit (10k MAU)

## 1) 🐌 Performance Bottlenecks

| Severity | Component | Finding | Evidence | Proposed Fix |
|---|---|---|---|---|
| High | Frontend + DB | Search fallback fetches **all published spaces** and then applies filtering client-side (including availability post-processing), which does not scale linearly at 10k MAU. | `usePublicSpacesLogic` fallback path: `.from('spaces').select(SPACES_SELECT).eq('published', true)` + client-side filters. | Move all filter predicates server-side (RPC/view), add cursor pagination, and return only visible page payload. |
| Medium | Frontend | Radius/text RPC search has hard `p_limit: 100` and no incremental pagination/infinite cursor; this can inflate payload size and render cost for dense cities. | `usePublicSpacesLogic` sets `p_limit: 100` for both radius and location text search. | Implement cursor-based pagination (`p_cursor`, `p_page_size`) and virtualized list rendering. |
| Medium | Frontend | `Bookings` page is eagerly imported in route config while many other routes are lazy-loaded, increasing initial bundle pressure. | `AppRoutes.tsx` imports `Bookings` eagerly (`import Bookings from "@/pages/Bookings"`). | Convert `Bookings` to lazy import and prefetch only after auth/dashboard intent. |
| Medium | Frontend | Some space cards still use raw `<img>` instead of `OptimizedImage`, bypassing optimization pipeline (format/size hints). | `EnhancedSpaceManagementCard.tsx` uses raw `<img src={space.photos[0]}>`. | Replace with `OptimizedImage` and enforce responsive `srcset` + WebP/AVIF variants from optimizer edge function. |
| Medium | React Runtime | Performance monitoring component adds global listeners/observers without cleanup in hooks, risking long-session memory growth. | `PerformanceMonitor.tsx` attaches `window.addEventListener(...)` and observers, but no return cleanup from effect path. | Add deterministic cleanup for listeners/observers and guard against duplicate subscriptions. |

## 2) 🛡️ Security & Compliance (Investor Risks)

| Severity | Component | Finding | Evidence | Proposed Fix |
|---|---|---|---|---|
| Critical | DB / RLS | Profiles are readable by **all authenticated users** (`USING (true)`), while profile schema includes sensitive columns (phone, legal/tax fields). | Migration enables broad read policy on `public.profiles`; generated DB types show sensitive fields in `profiles` row (`phone`, `tax_id`, `iban`, etc.). | Replace with least-privilege model: expose a `profiles_public_safe` view for social data, keep sensitive columns private, and gate full profile read to owner/admin only. |
| High | Frontend/API usage | Multiple profile fetches use `select('*')`, making accidental PII over-exposure likely when RLS is permissive. | Example: `profileService.getProfile` uses `.from('profiles').select('*')`. | Replace wildcard selects with explicit column allowlists and central DTO mappers. |
| High | GDPR Process | Account deletion flow is implemented as Edge Functions and partial anonymization/deletion, not a single audited DB RPC transaction with full dependency graph guarantees. | `process-account-deletion` does stepwise updates/deletes and `auth.admin.deleteUser`, with no DB-level transactional RPC over full related entities. | Introduce a single SQL RPC (`delete_account_cascade`) with audited transaction, deterministic anonymization map, and legal-retention partitions. |
| Medium | Domain Consistency / Security | `workspaces` vs `spaces` naming still appears in migrations and comments, increasing migration drift risk and policy misalignment. | Several migrations still reference `public.workspaces` while app code targets `spaces`. | Complete singularity migration: remove/alias legacy table references, regenerate types, add CI guard banning new `workspaces` references. |

## 3) 🏗️ Infrastructure & Reliability

| Severity | Component | Finding | Evidence | Proposed Fix |
|---|---|---|---|---|
| High | Webhook Reliability | Stripe webhook handler fails hard if booking record does not yet exist; no durable retry queue / reconciliation handoff for out-of-order events. | `enhanced-checkout-handlers` returns error when booking lookup by metadata `booking_id` is missing. | Persist unmatched webhook events in `webhook_dead_letter` table + scheduled reconciler keyed by Stripe IDs. |
| High | Type Safety | Widespread `any` usage in critical paths (auth, performance, webhook services) undermines runtime safety and migration resilience. | Multiple `any` occurrences across `src/` and `supabase/functions/`, including webhook service signatures and auth helpers. | Enforce `no-explicit-any` in strict config, migrate to `unknown` + schema narrowing (Zod), and add typed Supabase query wrappers. |
| Medium | Reliability / Observability | In-process event listeners in performance/security components are not uniformly cleaned up; this can lead to duplicate telemetry in long-lived sessions. | `PerformanceMonitor.tsx` and similar components add global listeners via inline callbacks. | Standardize listener lifecycle via reusable `useGlobalListener` hook with cleanup. |
| Medium | Data Contract Integrity | Deletion function references profile fields (`email`, `avatar_url`, `phone_number`, `website_url`) inconsistent with generated profile schema (`profile_photo_url`, `phone`, etc.), indicating contract drift risk. | `process-account-deletion` updates legacy column names not aligned with generated profile row typing. | Align schema + function payload contracts; add migration tests that validate function column references against introspected schema. |

---

## Immediate 30-60-90 Day Roadmap (Suggested)

- **30 days (Risk containment):** lock down profile RLS, remove wildcard profile selects, add webhook dead-letter queue, and introduce `no-explicit-any` CI gate.
- **60 days (Scale path):** ship cursor pagination for search/results + bookings feeds, virtualize long lists, and convert heavy route imports to lazy chunks.
- **90 days (Due diligence hardening):** implement audited GDPR delete RPC transaction, finalize `spaces` naming convergence, and run chaos/replay tests on Stripe webhooks.
