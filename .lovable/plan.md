

# SERVERLESS HEALTH REPORT
## Workover Hub Connect - Compute Layer Audit

---

## EXECUTIVE SUMMARY

| Metric | Score | Status |
|--------|-------|--------|
| **Resilience Score** | **7.5/10** | Good with idempotency gaps |
| **Security Score** | **8.0/10** | Solid, one credential exposure |
| **Performance Score** | **8.5/10** | Well-optimized imports |
| **Logging Score** | **7.0/10** | Mixed structured/emoji logging |

**Overall Serverless Health: 7.8/10** - Production-ready with recommended hardening

---

## 1. ERROR HANDLING & RETRIES ANALYSIS

### 1.1 Idempotency Implementation

| Function | Idempotency Key | Implementation | Grade |
|----------|----------------|----------------|-------|
| `execute-payout` | `payout_${booking.id}` | Stripe API level | A |
| `create-checkout-v3` | Header `Idempotency-Key` | DB lookup + Stripe API | A+ |
| `stripe-webhooks` (main) | None | **MISSING** | D |
| `stripe-webhooks` (handlers) | `stripe_event_id` column | DB-level check | A |
| `host-approve-booking` | None | Compensating transaction | B |
| `cancel-booking` | PI status check | Stripe state-based | B+ |
| `admin-process-refund` | `charge_already_refunded` check | Error handling | B |

**Critical Finding**: The main `stripe-webhooks/index.ts` (35 lines) is a **SIMPLIFIED STUB** that bypasses the enhanced handlers with idempotency. If Stripe sends the same `checkout.session.completed` event twice, the booking could be double-confirmed.

**Evidence** (stripe-webhooks/index.ts lines 19-29):
```typescript
if (event.type === "checkout.session.completed") {
  const session = event.data.object;
  const booking_id = session.metadata?.booking_id;
  if (booking_id) {
    await supabase
      .from("bookings")
      .update({ status: "confirmed", payment_status: "succeeded" })
      .eq("id", booking_id);  // NO idempotency check!
  }
}
```

**Contrast with Enhanced Handler** (handlers/enhanced-checkout-handlers.ts lines 23-34):
```typescript
// IDEMPOTENCY CHECK: Previene doppi pagamenti
if (eventId) {
  const { data: existingPayment } = await supabaseAdmin
    .from('payments')
    .select('id')
    .eq('stripe_event_id', eventId)
    .maybeSingle();
  
  if (existingPayment) {
    return { success: true, message: 'Duplicate event ignored' };
  }
}
```

### 1.2 HTTP Status Code Usage

| Function | 4xx (Client Error) | 5xx (Server Error) | Grade |
|----------|-------------------|-------------------|-------|
| `create-checkout-v3` | 400, 401, 405 | 500 | A |
| `cancel-booking` | 400, 401, 403, 404, 405 | 500 | A |
| `host-approve-booking` | 400, 401, 403, 404, 405 | 500 | A |
| `stripe-webhooks` | 400 only | None | C |
| `generate-invoice-pdf` | None | 500 only | C |
| `send-email` | None | 500 only | C |

**Issue**: Several functions return 500 for all errors, making it impossible for clients to distinguish retryable vs non-retryable failures.

### 1.3 Retry Mechanism

The `retry-failed-webhooks` function implements proper retry logic:
- Max 3 retries per event
- Incremental retry count via RPC
- Error logging to `webhook_events` table
- 10-event batch limit

**Grade: A**

---

## 2. SECRET MANAGEMENT ANALYSIS

### 2.1 Environment Variable Usage

| Secret | Deno.env.get() | Grade |
|--------|---------------|-------|
| `STRIPE_SECRET_KEY` | Yes | A |
| `STRIPE_WEBHOOK_SECRET` | Yes | A |
| `RESEND_API_KEY` | Yes | A |
| `MAPBOX_ACCESS_TOKEN` | Yes | A |
| `SUPABASE_URL` | Yes | A |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | A |

### 2.2 CRITICAL: Hardcoded Fallback Credentials

**File**: `supabase/functions/send-email/index.ts` (lines 43-45)

```typescript
const supabase = createClient(
  Deno.env.get('SUPABASE_URL') || 'https://khtqwzvrxzsgfhsslwyz.supabase.co',
  Deno.env.get('SUPABASE_ANON_KEY') || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  ...
);
```

**Risk**: The anon key is exposed in the codebase. While anon keys are technically "publishable", this is a bad practice for Edge Functions because:
1. It creates confusion about which key should be used
2. If env vars fail, the function silently uses the hardcoded key
3. Code reviews may miss the embedded credential

**Recommendation**: Remove fallback values; fail fast if env vars are missing.

### 2.3 Secrets Inventory vs Usage

| Configured Secret | Used In Functions |
|-------------------|-------------------|
| `STRIPE_SECRET_KEY` | 12+ functions |
| `STRIPE_WEBHOOK_SECRET` | stripe-webhooks |
| `RESEND_API_KEY` | send-email |
| `MAPBOX_ACCESS_TOKEN` | get-mapbox-token |
| `SERVICE_ROLE_KEY` | All admin functions |

**Missing Configuration Check**: None of the functions validate that required secrets are present at startup. They fail at runtime when the secret is first accessed.

---

## 3. PERFORMANCE ANALYSIS (COLD STARTS)

### 3.1 Import Efficiency

| Function | Heavy Libraries | Import Method | Grade |
|----------|----------------|---------------|-------|
| `create-checkout-v3` | None (uses fetch) | Native | A+ |
| `execute-payout` | Stripe SDK | Top-level | B |
| `stripe-webhooks` | Stripe SDK | Top-level | B |
| `generate-invoice-pdf` | None (text only) | N/A | A |
| `image-optimizer` | ImageScript | Dynamic import | A+ |
| `send-email` | Resend, Zod | Top-level | B |

**Best Practice Example** (image-optimizer/index.ts line 186):
```typescript
// Dynamic import - only loaded when needed
const { Image } = await import('https://deno.land/x/imagescript@1.2.15/mod.ts')
```

### 3.2 Timeout Risks

| Function | Potential Long Operation | Timeout Risk |
|----------|------------------------|--------------|
| `generate-gdpr-export` | 14+ sequential DB queries | HIGH |
| `generate-dac7-report` | Loop over all hosts | MEDIUM |
| `execute-payout` | 50 Stripe API calls in loop | HIGH |
| `reconcile-payments` | Loop over all connected hosts | MEDIUM |
| `image-optimizer` | Image processing | LOW (async) |

**Critical Pattern in generate-gdpr-export** (lines 25-267):
The function makes 14 sequential database queries with checkpoint logging. Each query is wrapped in try/catch but executed serially, leading to cumulative latency.

**Recommendation**: Use `Promise.all()` or `Promise.allSettled()` for independent queries.

### 3.3 Async Processing Pattern

**Good Example** (image-optimizer/index.ts lines 68-70):
```typescript
// Start background processing
// Process image asynchronously
processImageAsync(supabaseClient, jobId, filePath, user.id).catch(console.error)
```

The function returns immediately with a job ID while heavy processing continues in the background.

---

## 4. LOGGING ANALYSIS (SRE READINESS)

### 4.1 Logging Patterns Inventory

| Pattern | Example | Functions Using | SRE Grade |
|---------|---------|-----------------|-----------|
| Emoji console.log | `console.log('✅ ...')` | 15+ | C |
| Structured JSON | `console.error(JSON.stringify({...}))` | ErrorHandler | B+ |
| Tagged prefix | `[EXECUTE-PAYOUT]` | 10+ | B |
| No logging | (silent functions) | 3-4 | F |

### 4.2 ErrorHandler Implementation

**File**: `supabase/functions/shared/error-handler.ts`

```typescript
static logError(context: string, error: any, metadata?: Record<string, any>) {
  const errorData = {
    context,
    error: error?.message || error,
    timestamp: new Date().toISOString(),
    ...metadata
  };
  
  if (this.isProduction) {
    console.error(JSON.stringify(errorData));  // Structured for production
  } else {
    console.error(`🔴 ${context}:`, error);    // Human-readable for dev
  }
}
```

**Good**: Production/dev mode separation
**Missing**: Correlation ID, request tracing, log levels

### 4.3 Functions Without ErrorHandler

| Function | Logging Method | Issue |
|----------|---------------|-------|
| `stripe-webhooks/index.ts` | Plain console.log | No structure |
| `freeze-bookings` | None | Silent failures |
| `schedule-payouts` | Plain console.log | No error details |
| `generate-dac7-report` | Plain console.log | No structure |

---

## 5. THE "FRAGILE" LIST

### 5.1 Functions That May Crash Under Load

| Function | Risk Factor | Impact | Mitigation |
|----------|-------------|--------|------------|
| `stripe-webhooks/index.ts` | No idempotency | Double payments | Route to enhanced handlers |
| `execute-payout` | 50 Stripe calls sequential | Timeout | Batch/queue processing |
| `generate-gdpr-export` | 14 sequential queries | Timeout | Parallelize queries |
| `reconcile-payments` | N Stripe balance calls | Rate limiting | Add delays/batching |
| `booking-expiry-check` | Unbatched Stripe calls | Timeout | Add pagination |

### 5.2 Race Condition Risks

| Function | Scenario | Current Protection |
|----------|----------|-------------------|
| `host-approve-booking` | Two hosts approve same booking | Status check, compensating refund |
| `cancel-booking` | Guest and host cancel simultaneously | DB status as source of truth |
| `validate_and_reserve_slot` | Two users book same slot | Advisory lock (fixed in DB audit) |

---

## 6. SECURITY RISKS

### 6.1 Exposed Credentials

| File | Issue | Severity |
|------|-------|----------|
| `send-email/index.ts` | Hardcoded anon key fallback | MEDIUM |

### 6.2 CORS Configuration

All functions use permissive CORS:
```typescript
'Access-Control-Allow-Origin': '*'
```

**Assessment**: Acceptable for public API functions. The enhanced security headers in `_shared/security-headers.ts` provide additional protection.

### 6.3 Authorization Patterns

| Pattern | Functions Using | Grade |
|---------|-----------------|-------|
| Bearer token → getUser() | 20+ | A |
| Service role for cron jobs | reconcile-payments, schedule-payouts | A |
| Admin role check via RPC | admin-*, monitoring-report | A |
| No auth (public) | health-check, generate-sitemap | A (by design) |

---

## 7. THE "REFACTOR" PLAN

### Priority 1: Critical - Webhook Idempotency (Day 1)

**Problem**: Main webhook handler lacks idempotency protection.

**Solution**: Route the main handler to use `EnhancedCheckoutHandlers`:

```typescript
// supabase/functions/stripe-webhooks/index.ts
import { EnhancedCheckoutHandlers } from "./handlers/enhanced-checkout-handlers.ts";

Deno.serve(async (req: Request) => {
  // ... signature validation ...
  
  if (event.type === "checkout.session.completed") {
    const result = await EnhancedCheckoutHandlers.handleCheckoutSessionCompleted(
      event.data.object,
      supabase,
      event.id  // Pass event ID for idempotency
    );
    
    if (!result.success) {
      return new Response(JSON.stringify({ error: result.error }), { status: 400 });
    }
  }
  
  return new Response(JSON.stringify({ received: true }), { status: 200 });
});
```

### Priority 2: High - Remove Hardcoded Credentials (Day 1)

**File**: `supabase/functions/send-email/index.ts`

**Change**:
```typescript
// BEFORE (lines 43-45)
const supabase = createClient(
  Deno.env.get('SUPABASE_URL') || 'https://khtqwzvrxzsgfhsslwyz.supabase.co',
  Deno.env.get('SUPABASE_ANON_KEY') || 'eyJhbGciOiJIUzI1NiIsInR5cCI6...',

// AFTER
const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY');
if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing required environment variables: SUPABASE_URL, SUPABASE_ANON_KEY');
}
const supabase = createClient(supabaseUrl, supabaseKey,
```

### Priority 3: Medium - Parallelize GDPR Export (Week 1)

**File**: `supabase/functions/generate-gdpr-export/index.ts`

**Change**: Replace sequential queries with parallel execution:

```typescript
// BEFORE: 14 sequential queries (lines 48-257)
const { data: profile } = await supabase.from('profiles')...
const { data: bookings } = await supabase.from('bookings')...
// ...etc

// AFTER: Parallel queries
const [
  profileResult,
  bookingsResult,
  spacesResult,
  messagesResult,
  reviewsGivenResult,
  reviewsReceivedResult,
  connectionsResult,
  paymentsResult,
  notificationsResult,
  gdprRequestsResult
] = await Promise.allSettled([
  supabase.from('profiles').select('*').eq('id', userId).single(),
  supabase.from('bookings').select('*').eq('user_id', userId),
  supabase.from('spaces').select('*').eq('host_id', userId),
  supabase.from('messages').select('*').eq('sender_id', userId),
  supabase.from('booking_reviews').select('*').eq('author_id', userId),
  supabase.from('booking_reviews').select('*').eq('target_id', userId),
  supabase.from('connections').select('*').or(`sender_id.eq.${userId},receiver_id.eq.${userId}`),
  supabase.from('payments').select('*').eq('user_id', userId),
  supabase.from('user_notifications').select('*').eq('user_id', userId),
  supabase.from('gdpr_requests').select('*').eq('user_id', userId)
]);
```

### Priority 4: Medium - Standardize Error Logging (Week 1)

**Action**: Create and enforce use of a standardized logger wrapper:

```typescript
// supabase/functions/_shared/sre-logger.ts
export class SRELogger {
  private static correlationId: string | null = null;
  
  static setCorrelationId(id: string) {
    this.correlationId = id;
  }
  
  static log(level: 'info' | 'warn' | 'error', message: string, data?: Record<string, any>) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      correlationId: this.correlationId,
      ...data
    };
    
    const output = JSON.stringify(logEntry);
    
    switch (level) {
      case 'error': console.error(output); break;
      case 'warn': console.warn(output); break;
      default: console.log(output);
    }
  }
}
```

### Priority 5: Low - Add Batching to Payout Execution (Week 2)

**File**: `supabase/functions/execute-payout/index.ts`

**Change**: Add delay between Stripe calls to avoid rate limiting:

```typescript
// Add after line 86 (after stripe.transfers.create)
await new Promise(resolve => setTimeout(resolve, 100)); // 100ms delay between calls
```

---

## 8. VERIFICATION CHECKLIST

After implementing fixes:

- [ ] Send duplicate webhook event to stripe-webhooks - verify only one payment created
- [ ] Remove env vars from send-email - verify function throws clear error
- [ ] Run generate-gdpr-export with large dataset - verify completes under 30s
- [ ] Check Edge Function logs for JSON-structured output
- [ ] Trigger execute-payout with 50+ bookings - verify no Stripe rate limiting

---

## 9. FILES TO MODIFY

| File | Priority | Change Summary |
|------|----------|----------------|
| `supabase/functions/stripe-webhooks/index.ts` | P1 | Route to enhanced handlers with idempotency |
| `supabase/functions/send-email/index.ts` | P2 | Remove hardcoded credentials, fail fast |
| `supabase/functions/generate-gdpr-export/index.ts` | P3 | Parallelize queries with Promise.allSettled |
| `supabase/functions/_shared/sre-logger.ts` | P4 | Create standardized SRE logging utility |
| `supabase/functions/execute-payout/index.ts` | P5 | Add rate limiting delays |

---

## 10. SUMMARY SCORECARD

| Category | Issue | Impact | Effort | Priority |
|----------|-------|--------|--------|----------|
| Webhook Idempotency | Main handler bypasses protection | Double payments | Low | P1 |
| Hardcoded Credentials | Anon key in send-email | Security hygiene | Low | P2 |
| Sequential Queries | GDPR export timeout risk | User experience | Medium | P3 |
| Mixed Logging | Inconsistent log formats | SRE debugging | Medium | P4 |
| Rate Limiting | execute-payout may hit limits | Payout delays | Low | P5 |

**Post-Refactor Target Score: 9.0/10**

