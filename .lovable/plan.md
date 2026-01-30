

# Fix Plan: 404 on Host Actions (Routing Mismatch)

## Routing Integrity Matrix

| Function | Folder Name | Config Entry | Frontend Call | Status |
|:---------|:------------|:-------------|:--------------|:-------|
| **Approve** | `host-approve-booking/` | `[functions.host-approve-booking]` ✅ | `invoke('host-approve-booking')` | 🟢 MATCH |
| **Reject** | `host-reject-booking/` | `[functions.host-reject-booking]` ✅ | `invoke('host-reject-booking')` | 🟢 MATCH |

---

## Root Cause: CORS Headers Missing Required Fields

The 404 is likely a **CORS preflight rejection** being reported as 404. Both functions use incomplete CORS headers:

```typescript
// CURRENT (line 5-8 in both functions)
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
```

The Supabase JS client sends additional headers that are NOT in the allow-list:
- `x-supabase-client-platform`
- `x-supabase-client-platform-version`  
- `x-supabase-client-runtime`
- `x-supabase-client-runtime-version`

When the browser's preflight (`OPTIONS`) request asks for permission to send these headers, the function denies them, causing a CORS failure that may manifest as a 404.

---

## Fix 1: Update CORS Headers

**Files:** 
- `supabase/functions/host-approve-booking/index.ts` (lines 5-8)
- `supabase/functions/host-reject-booking/index.ts` (lines 5-8)

**Change:**

```typescript
// BEFORE
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// AFTER
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS, PUT, DELETE",
};
```

---

## Fix 2: Schema Mismatch in Space Query (Secondary Bug)

Both functions have a schema query bug identical to the webhook issue. Line 98-100 in `host-approve-booking/index.ts` and line 97-101 in `host-reject-booking/index.ts`:

```typescript
// CURRENT (BROKEN)
.select("host_id, title:name")  // ← "name" column doesn't exist!

// FIXED
.select("host_id, title")  // ← Use actual column name
```

This bug would cause a silent failure when fetching the space, returning `space` as null even when the space exists.

---

## Summary of Changes

| File | Line | Change | Priority |
|:-----|:-----|:-------|:---------|
| `host-approve-booking/index.ts` | 5-8 | Add missing CORS headers | **CRITICAL** |
| `host-approve-booking/index.ts` | 98 | Fix `title:name` → `title` | **CRITICAL** |
| `host-reject-booking/index.ts` | 5-8 | Add missing CORS headers | **CRITICAL** |
| `host-reject-booking/index.ts` | 99 | Fix `title:name` → `title` | **CRITICAL** |

---

## Deployment Order

1. Apply CORS fix and schema fix to both functions
2. Deploy `host-approve-booking` and `host-reject-booking`
3. Test approve/reject actions from the host dashboard

---

## Expected Behavior After Fix

| Action | Before Fix | After Fix |
|:-------|:-----------|:----------|
| **Host clicks "Approve"** | 404 Not Found | 200 OK - Booking confirmed, funds captured |
| **Host clicks "Reject"** | 404 Not Found | 200 OK - Booking cancelled, funds released |

