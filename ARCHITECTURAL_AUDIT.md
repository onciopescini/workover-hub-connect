# Architectural Audit & Roadmap: Checkout Flow

## 1. Analysis of Current State ("Vibecoding Smells")

### Inconsistency in API Calls
- **Mixed Abstractions:** The `useCheckout` hook mixes `supabase.rpc` (client SDK) for slot reservation with `supabase.functions.invoke` (client SDK abstraction for Edge Functions) for payment session creation.
- **Direct Implementation Dependency:** The hook is tightly coupled to the Supabase Client SDK. Changing the transport layer (e.g., to native `fetch` for better debugging or CORS control) requires rewriting the hook logic.
- **Error Handling Fragmentation:** Error parsing logic is embedded directly in the hook. Specifically, the logic to extract error messages from `FunctionsHttpError` (lines 132-152) is verbose and pollutes the business logic.

### Type Safety Gaps
- **"Any" Casting:** The booking creation response is cast unsafely: `const dataObj = rpcData as any;` (Line 95). This bypasses TypeScript's compile-time checks, risking runtime errors if the RPC response shape changes.
- **Loose Error Types:** The catch block treats errors generically, often losing the specific "code" or structured data returned by the backend, flattening everything into a string message.

### Test Fragility
- **Implementation Coupling:** `useCheckout.test.ts` mocks `@/integrations/supabase/client` directly.
  ```typescript
  jest.mock('@/integrations/supabase/client', () => ({
    supabase: { rpc: jest.fn(), functions: { invoke: jest.fn() } }
  }));
  ```
- **Consequence:** If we switch the implementation to use `fetch` (as requested) or a Service Layer, all tests will fail because they are asserting that `supabase.functions.invoke` was called, not that "a checkout session was requested". The tests verify *how* it works, not *what* it does.

### State Management
- **Atomicity:** The reservation (RPC) and payment (Edge Function) are two distinct network calls. If step 2 fails, the slot remains reserved (`pending_payment`).
- **Resolution:** As per requirements, we accept this state. The frontend does not attempt rollback. The backend cron (`booking-expiry-check`) is the source of truth for cleaning up stale pending bookings. This keeps the frontend resilient to network crashes during the critical path.

---

## 2. Target Architecture

We will introduce a **Service Layer Pattern** to decouple the UI (Hooks) from the Data Source (API).

### Key Components

1.  **`src/services/bookingService.ts`**:
    -   **Responsibility**: Encapsulate all network communication related to bookings.
    -   **Implementation**: Internally uses `fetch` for Edge Functions (allowing granular control over headers/debugging) and `supabase` client for RPC (auth handling is easier).
    -   **Interface**: Exposes typed methods returning `Promise<Result<T, E>>` or throwing typed errors.

2.  **`useCheckout` (Refactored)**:
    -   **Responsibility**: Manage UI state (`isLoading`, `error`) and coordinate the flow.
    -   **Implementation**: Calls `BookingService.reserveSlot(...)` and `BookingService.createCheckoutSession(...)`.
    -   **Benefit**: The hook becomes a pure orchestrator. It doesn't know *how* the API is called.

3.  **Tests**:
    -   **Strategy**: Mock `BookingService`.
    -   **Benefit**: Tests verify that "when user clicks, `BookingService.reserveSlot` is called". If we change `BookingService` to use GraphQL or SOAP later, the Hook tests **do not change**.

---

## 3. Implementation Roadmap

### Phase 1: Create the Service Layer
Create `src/services/bookingService.ts`.

**Proposed Signature:**
```typescript
export const bookingService = {
  async reserveSlot(params: ReservationParams): Promise<ReservationResponse> {
    // Calls supabase.rpc('validate_and_reserve_slot')
    // Validates response with Zod or strict typing
    // Returns typed Booking object
  },

  async createCheckoutSession(bookingId: string, returnUrl: string): Promise<CheckoutSessionResponse> {
    // Uses native fetch to call 'create-checkout-v3'
    // Handles 4xx/5xx errors and parses JSON
    // Returns { url: string }
  }
};
```

### Phase 2: Refactor `useCheckout`
Modify `src/hooks/checkout/useCheckout.ts` to consume the service.

**Changes:**
- Remove `supabase` imports.
- Import `bookingService`.
- Replace direct calls with service method calls.
- Simplify error handling (Service throws standardized errors).

### Phase 3: Refactor Tests
Modify `src/hooks/checkout/__tests__/useCheckout.test.ts`.

**Changes:**
- Stop mocking `supabase`.
- Mock `src/services/bookingService`.
- Example:
  ```typescript
  import { bookingService } from '@/services/bookingService';
  jest.mock('@/services/bookingService');

  // Test
  (bookingService.reserveSlot as jest.Mock).mockResolvedValue({ id: '123' });
  ```

### Phase 4: Verification
- Run `npm test src/hooks/checkout` to ensure the new abstraction holds.
- Verify the "native fetch" implementation in `bookingService` correctly propagates Auth headers (using `supabase.auth.getSession()`).
