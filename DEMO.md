# 2-Step Booking Demo

## Flow Demonstration

This demo shows the complete 2-step booking flow with Stripe Checkout integration:

### Step 1: Date Selection
- User selects a booking date from the calendar
- Past dates are automatically disabled
- Selected date is displayed with confirmation

### Step 2: Time Selection  
- Time slots are generated based on `slotInterval` (15 or 30 minutes)
- Real-time availability checking via `get_space_availability_optimized` RPC
- Click-and-drag or click-twice selection for time ranges
- Dynamic pricing calculation (hourly vs daily rates at 8h threshold)
- Visual feedback for selected ranges

### Step 3: Summary & Checkout
- Detailed price breakdown with service fees and VAT
- Slot reservation via `validate_and_reserve_slot` RPC (prevents conflicts)
- Stripe Checkout session creation with Connect integration
- Redirect to Stripe for secure payment processing

## Key Features Demonstrated

✅ **Concurrency Protection**: Slot locking prevents double bookings  
✅ **Price Consistency**: Server validates client-side calculations  
✅ **Tax Flexibility**: Supports both manual VAT and Stripe Tax modes  
✅ **Error Handling**: Lock conflicts, payment errors, validation failures  
✅ **Accessibility**: ARIA labels, keyboard navigation, screen reader support  
✅ **Mobile Responsive**: Touch-friendly slot selection on mobile devices  

## Testing Coverage

- **Unit Tests**: Pricing calculations, edge cases, rounding precision
- **E2E Tests**: Complete booking flows, tax modes, error scenarios
- **Testid Coverage**: All interactive elements have stable test identifiers

## GIF Demo Location

A demonstration GIF showing the complete flow (DATE → TIME → SUMMARY → Stripe) should be attached to the PR showcasing:

1. Calendar date selection
2. Time slot range selection (e.g., 10:00-14:00)
3. Price breakdown in summary
4. Confirmation and redirect to Stripe Checkout

---

*This completes the 2-step booking implementation with production-ready error handling, accessibility, and payment integration.*