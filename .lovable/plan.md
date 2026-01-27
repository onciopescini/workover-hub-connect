
# Day 2: Utility Consolidation - Implementation Plan

## Overview

This task creates a centralized formatting library (`src/lib/format.ts`) and migrates all duplicate implementations across the codebase. This is a critical DRY (Don't Repeat Yourself) refactoring that will prevent future copy-paste programming and ensure consistent formatting across the entire application.

---

## Current State Analysis

### Duplicate `formatCurrency` Implementations Found: 10+

| File | Implementation Type | Issue |
|------|---------------------|-------|
| `src/pages/admin/AdminRevenue.tsx:31-36` | `Intl.NumberFormat('it-IT')` | Local function |
| `src/pages/admin/AdminDashboard.tsx:65-70` | `Intl.NumberFormat('it-IT')` | Local function |
| `src/pages/admin/AdminBookingsPage.tsx:92-96` | `Intl.NumberFormat` + `/100` | Assumes cents |
| `src/components/host/fiscal/DAC7ReportCard.tsx:19-24` | `Intl.NumberFormat('it-IT')` | Local function |
| `src/pages/SpaceRecap.tsx:83-88` | `Intl.NumberFormat('it-IT')` | Local function |
| `src/components/payments/PaymentListItem.tsx:31` | Template literal `€${amount.toFixed(2)}` | Inconsistent format |
| `src/components/payments/PaymentStats.tsx:19` | Template literal `€${amount.toFixed(2)}` | Inconsistent format |
| `src/components/host/fiscal/FiscalDashboardContainer.tsx:60` | `€${value.toLocaleString('it-IT')}` | Manual prefix |
| `src/components/host/fiscal/HostInvoicesReceived.tsx:97-99` | `€${Number(val).toFixed(2)}` | Manual prefix |
| `src/components/host/fiscal/HostNonFiscalReceipts.tsx:106-110` | `€${Number(val).toFixed(2)}` | Manual prefix |

### Duplicate `cn` Function

| File | Issue |
|------|-------|
| `src/lib/utils.ts:4-6` | Original, using `clsx` + `twMerge` |
| `src/lib/booking-calculator-utils.ts:88-91` | Duplicate, simplified version |

### Existing Date Formatting

The codebase already has a robust `src/lib/date-time/index.ts` with:
- `formatUtcDateForDisplay()`
- `formatBookingDateTime()`
- `formatRelativeDate()`
- `formatAbsoluteDate()`

The new `formatDate()` in `format.ts` will be a thin wrapper for simpler use cases.

---

## Implementation Steps

### Step 1: Create `src/lib/format.ts`

Create the centralized formatting library:

```typescript
/**
 * Centralized formatting utilities for Workover Hub Connect
 * 
 * USAGE:
 * import { formatCurrency, formatDate, formatPercentage } from '@/lib/format';
 * 
 * formatCurrency(1234.56)           // → "€ 1.234,56"
 * formatCurrency(12345, { cents: true }) // → "€ 123,45" (Stripe cents)
 * formatDate('2024-01-15')          // → "15/01/2024"
 * formatDate('2024-01-15', 'MMMM yyyy') // → "gennaio 2024"
 */

import { format, parseISO } from 'date-fns';
import { it } from 'date-fns/locale';

/**
 * Formats a number as EUR currency using Italian locale.
 * @param amount - The amount to format.
 * @param options.cents - If true, divides amount by 100 (for Stripe cents). Default: false.
 * @returns Formatted currency string (e.g., "€ 1.234,56")
 */
export const formatCurrency = (
  amount: number | null | undefined,
  options?: { cents?: boolean }
): string => {
  if (amount === null || amount === undefined) return '€ 0,00';
  
  const value = options?.cents ? amount / 100 : amount;
  
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);
};

/**
 * Formats a date string or Date object.
 * @param date - The date to format (ISO string, Date object, null, or undefined).
 * @param formatStr - Optional format string (default: 'dd/MM/yyyy').
 * @returns Formatted date string, or '-' if date is invalid/null.
 */
export const formatDate = (
  date: string | Date | null | undefined,
  formatStr: string = 'dd/MM/yyyy'
): string => {
  if (!date) return '-';
  
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    return format(dateObj, formatStr, { locale: it });
  } catch {
    return '-';
  }
};

/**
 * Formats a number as percentage.
 * @param value - The value to format (0.15 → "15%", 15 → "15%").
 * @param options.decimal - If true, treats value as decimal (0.15 → 15%). Default: false.
 * @returns Formatted percentage string.
 */
export const formatPercentage = (
  value: number | null | undefined,
  options?: { decimal?: boolean }
): string => {
  if (value === null || value === undefined) return '0%';
  
  const percentage = options?.decimal ? value * 100 : value;
  
  return new Intl.NumberFormat('it-IT', {
    style: 'percent',
    minimumFractionDigits: 0,
    maximumFractionDigits: 1
  }).format(percentage / 100);
};

/**
 * Formats a number with thousands separator (Italian locale).
 * @param value - The number to format.
 * @returns Formatted number string (e.g., "1.234.567").
 */
export const formatNumber = (value: number | null | undefined): string => {
  if (value === null || value === undefined) return '0';
  
  return new Intl.NumberFormat('it-IT').format(value);
};
```

---

### Step 2: Migrate Admin Pages

**File: `src/pages/admin/AdminRevenue.tsx`**

| Line | Before | After |
|------|--------|-------|
| 31-36 | Local `formatCurrency` function | Delete function |
| 1 | - | Add `import { formatCurrency } from '@/lib/format';` |
| All usages | `formatCurrency(row.gross_volume)` | (unchanged - same signature) |

**File: `src/pages/admin/AdminDashboard.tsx`**

| Line | Before | After |
|------|--------|-------|
| 65-70 | Local `formatCurrency` function | Delete function |
| 1 | - | Add `import { formatCurrency } from '@/lib/format';` |

**File: `src/pages/admin/AdminBookingsPage.tsx`**

| Line | Before | After |
|------|--------|-------|
| 92-103 | Complex local function with `/100` and comments | Delete function |
| 1 | - | Add `import { formatCurrency } from '@/lib/format';` |
| Usages | `formatCurrency(payment.amount)` | `formatCurrency(payment.amount, { cents: true })` |

---

### Step 3: Migrate Payment Components

**File: `src/components/payments/PaymentListItem.tsx`**

| Line | Before | After |
|------|--------|-------|
| 31 | `const formatCurrency = (amount: number) => \`€${amount.toFixed(2)}\`;` | Delete line |
| 1 | - | Add `import { formatCurrency } from '@/lib/format';` |

**File: `src/components/payments/PaymentStats.tsx`**

| Line | Before | After |
|------|--------|-------|
| 19 | `const formatCurrency = (amount: number) => \`€${amount.toFixed(2)}\`;` | Delete line |
| 1 | - | Add `import { formatCurrency } from '@/lib/format';` |

---

### Step 4: Migrate Fiscal Components

**File: `src/components/host/fiscal/DAC7ReportCard.tsx`**

| Line | Before | After |
|------|--------|-------|
| 19-24 | Local `formatCurrency` function | Delete function |
| 1 | - | Add `import { formatCurrency } from '@/lib/format';` |

**File: `src/components/host/fiscal/FiscalDashboardContainer.tsx`**

| Line | Before | After |
|------|--------|-------|
| 60 | `€{thresholdQuery.data.total_income.toLocaleString('it-IT')}` | `{formatCurrency(thresholdQuery.data.total_income)}` |
| 1 | - | Add `import { formatCurrency } from '@/lib/format';` |

**File: `src/components/host/fiscal/HostInvoicesReceived.tsx`**

| Lines | Before | After |
|-------|--------|-------|
| 97 | `Imponibile: €${Number(invoice.base_amount).toFixed(2)}` | `Imponibile: {formatCurrency(invoice.base_amount)}` |
| 98 | `IVA: €${Number(invoice.vat_amount).toFixed(2)}` | `IVA: {formatCurrency(invoice.vat_amount)}` |
| 99 | `Totale: €${Number(invoice.total_amount).toFixed(2)}` | `Totale: {formatCurrency(invoice.total_amount)}` |
| 1 | - | Add `import { formatCurrency } from '@/lib/format';` |

**File: `src/components/host/fiscal/HostNonFiscalReceipts.tsx`**

| Lines | Before | After |
|-------|--------|-------|
| 106-110 | Manual `€${Number(val).toFixed(2)}` | `{formatCurrency(val)}` |
| 1 | - | Add `import { formatCurrency } from '@/lib/format';` |

---

### Step 5: Migrate SpaceRecap Page

**File: `src/pages/SpaceRecap.tsx`**

| Line | Before | After |
|------|--------|-------|
| 83-88 | Local `formatCurrency` function | Delete function |
| 1 | - | Add `import { formatCurrency } from '@/lib/format';` |

---

### Step 6: Remove Duplicate `cn` Function

**File: `src/lib/booking-calculator-utils.ts`**

| Line | Action |
|------|--------|
| 88-91 | Delete the duplicate `cn` function |
| 1 | Add `import { cn } from '@/lib/utils';` |

Verify any internal usages in this file still work with the imported version.

---

### Step 7: Update Barrel Export

**File: `src/lib/index.ts`** (create if not exists)

```typescript
// Re-export commonly used utilities
export { cn } from './utils';
export { formatCurrency, formatDate, formatPercentage, formatNumber } from './format';
```

---

## Files to Create

| File | Description |
|------|-------------|
| `src/lib/format.ts` | Centralized formatting utilities |

## Files to Modify

| File | Changes |
|------|---------|
| `src/pages/admin/AdminRevenue.tsx` | Remove local formatCurrency, import from @/lib/format |
| `src/pages/admin/AdminDashboard.tsx` | Remove local formatCurrency, import from @/lib/format |
| `src/pages/admin/AdminBookingsPage.tsx` | Remove local function, use `{ cents: true }` option |
| `src/components/payments/PaymentListItem.tsx` | Remove local function, import from @/lib/format |
| `src/components/payments/PaymentStats.tsx` | Remove local function, import from @/lib/format |
| `src/components/host/fiscal/DAC7ReportCard.tsx` | Remove local function, import from @/lib/format |
| `src/components/host/fiscal/FiscalDashboardContainer.tsx` | Replace inline formatting |
| `src/components/host/fiscal/HostInvoicesReceived.tsx` | Replace inline formatting |
| `src/components/host/fiscal/HostNonFiscalReceipts.tsx` | Replace inline formatting |
| `src/pages/SpaceRecap.tsx` | Remove local function, import from @/lib/format |
| `src/lib/booking-calculator-utils.ts` | Remove duplicate `cn`, import from utils |

---

## Technical Notes

### Why `options.cents`?

Stripe stores amounts in the smallest currency unit (cents for EUR). The `{ cents: true }` option handles this conversion cleanly:

```typescript
// Stripe payment amount (in cents)
formatCurrency(12345, { cents: true }) // → "€ 123,45"

// Database amount (in euros)
formatCurrency(123.45) // → "€ 123,45"
```

### Null/Undefined Handling

The new functions handle edge cases gracefully:

```typescript
formatCurrency(null)      // → "€ 0,00"
formatCurrency(undefined) // → "€ 0,00"
formatDate(null)          // → "-"
formatDate(undefined)     // → "-"
```

### Locale Consistency

All functions use `it-IT` locale for:
- Number formatting: `1.234,56` (dot for thousands, comma for decimals)
- Currency symbol: `€` with proper spacing
- Date formatting: Italian month/day names

---

## Verification Checklist

After implementation, verify:

1. All admin pages display currency correctly
2. Payment components show proper EUR formatting
3. Fiscal reports maintain Italian locale
4. No TypeScript errors related to formatting
5. Build completes successfully

---

## Expected Outcome

| Metric | Before | After |
|--------|--------|-------|
| `formatCurrency` implementations | 10+ | 1 |
| Duplicate `cn` functions | 2 | 1 |
| Lines of duplicate code | ~50 | 0 |
| Consistency | Mixed formats | Uniform `it-IT` |
