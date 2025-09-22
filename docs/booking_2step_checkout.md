# 2-Step Booking Checkout Demo

## GIF/Video Demonstration

**File Location**: `docs/booking_2step_checkout.gif` (to be added to PR)

### Demo Flow Sequence

The demonstration GIF should showcase the complete booking flow:

1. **📅 DATE Selection**
   - User clicks on date picker trigger
   - Calendar opens with past dates disabled
   - User selects a future date (e.g., next week)
   - Date is confirmed and displayed

2. **🕐 TIME Selection** 
   - Time slots grid loads with availability
   - User clicks on start time (e.g., 10:00)
   - User clicks on end time (e.g., 14:00) 
   - Range selection is highlighted
   - Pricing calculation shows: "4h × €15/h = €60"

3. **📋 SUMMARY Review**
   - Detailed price breakdown displayed:
     - Base: €60.00
     - Service Fee (12%): €7.20  
     - VAT (22%): €14.78
     - Total: €81.98
   - "Conferma" button is enabled

4. **💳 STRIPE Redirect**
   - User clicks "Conferma" 
   - Loading spinner appears with "Prenotando..."
   - Success toast: "Slot riservato! Reindirizzamento al pagamento..."
   - Browser redirects to Stripe Checkout page

### Key Features Highlighted

✅ **Real-time availability**: Slots show green (available) vs gray (booked)  
✅ **Dynamic pricing**: Automatic hourly/daily rate switching  
✅ **Concurrency protection**: Slot locking prevents conflicts  
✅ **Mobile responsive**: Touch-friendly slot selection  
✅ **Accessibility**: Keyboard navigation and screen reader support  
✅ **Error handling**: Lock conflicts and payment errors shown  

### Technical Implementation

- **Frontend**: React + TypeScript with shadcn/ui components
- **Backend**: Supabase Edge Functions with Stripe Connect  
- **Database**: PostgreSQL with Row Level Security policies
- **Testing**: E2E tests with Playwright covering all scenarios

---

**Note**: Add the actual GIF file to this location when creating the PR to provide visual documentation of the complete user journey.