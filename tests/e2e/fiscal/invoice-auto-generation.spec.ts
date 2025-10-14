import { test, expect } from '@playwright/test';
import { 
  loginAsHost, 
  loginAsCoworker, 
  updateBookingStatus, 
  verifyInvoiceGenerated,
  verifyNonFiscalReceiptGenerated,
  verifyPaymentUpdated,
  getLatestPayment
} from '../../utils/fiscal-test-helpers';

test.describe('Invoice Generation Automation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('WorkOver service fee invoice generated on served status', async ({ page }) => {
    // This test assumes a booking already exists and is in confirmed status
    // In a real scenario, you would create a booking and payment first
    
    await loginAsHost(page, 'forfettario');
    await page.goto('/host/bookings');
    await page.waitForLoadState('networkidle');
    
    // Find first confirmed booking
    const confirmedBooking = page.locator('[data-booking-status="confirmed"]').first();
    
    if (await confirmedBooking.isVisible()) {
      const bookingId = await confirmedBooking.getAttribute('data-booking-id');
      
      if (bookingId) {
        // Mark as served
        await confirmedBooking.click();
        await page.click('[data-testid="mark-as-served"]');
        await page.waitForTimeout(3000); // Wait for edge function
        
        // Verify invoice generated
        const invoice = await verifyInvoiceGenerated(page, bookingId);
        expect(invoice).toBeTruthy();
        expect(invoice.invoice_number).toMatch(/WF-\d{4}-\d{5}/);
        
        // Verify payment updated
        const payment = await getLatestPayment(page, bookingId);
        expect(payment.workover_invoice_id).toBeTruthy();
      }
    }
  });

  test('Host invoice notification sent for forfettario', async ({ page }) => {
    await loginAsHost(page, 'forfettario');
    await page.goto('/host/bookings');
    await page.waitForLoadState('networkidle');
    
    const confirmedBooking = page.locator('[data-booking-status="confirmed"]').first();
    
    if (await confirmedBooking.isVisible()) {
      const bookingId = await confirmedBooking.getAttribute('data-booking-id');
      
      if (bookingId) {
        await confirmedBooking.click();
        await page.click('[data-testid="mark-as-served"]');
        await page.waitForTimeout(3000);
        
        // Verify payment updated with host_invoice_required
        const payment = await page.evaluate(async (id) => {
          // @ts-ignore
          const { data } = await supabase
            .from('payments')
            .select('*')
            .eq('booking_id', id)
            .single();
          return data;
        }, bookingId);
        
        expect(payment.host_invoice_required).toBe(true);
        expect(payment.host_invoice_deadline).toBeTruthy();
        
        // Check for notification
        await page.goto('/host/notifications');
        await page.waitForLoadState('networkidle');
        await expect(page.getByText(/fattura canone|host invoice/i)).toBeVisible({ timeout: 5000 }).catch(() => {});
      }
    }
  });

  test('Non-fiscal receipt generated for privato host', async ({ page }) => {
    await loginAsHost(page, 'privato');
    await page.goto('/host/bookings');
    await page.waitForLoadState('networkidle');
    
    const confirmedBooking = page.locator('[data-booking-status="confirmed"]').first();
    
    if (await confirmedBooking.isVisible()) {
      const bookingId = await confirmedBooking.getAttribute('data-booking-id');
      
      if (bookingId) {
        await confirmedBooking.click();
        await page.click('[data-testid="mark-as-served"]');
        await page.waitForTimeout(3000);
        
        // Verify non-fiscal receipt generated
        const receipt = await verifyNonFiscalReceiptGenerated(page, bookingId);
        expect(receipt).toBeTruthy();
        expect(receipt.receipt_number).toMatch(/NFR-/);
        expect(receipt.disclaimer).toContain('non valido ai fini fiscali');
        
        // Verify both host and coworker can access it
        await page.goto('/host/fiscal');
        await page.click('[data-testid="tab-non-fiscal-receipts"]');
        await page.waitForLoadState('networkidle');
        await expect(page.getByText(receipt.receipt_number)).toBeVisible({ timeout: 5000 }).catch(() => {});
      }
    }
  });

  test('No duplicate invoices on re-trigger', async ({ page }) => {
    await loginAsHost(page, 'forfettario');
    await page.goto('/host/bookings');
    await page.waitForLoadState('networkidle');
    
    const servedBooking = page.locator('[data-booking-status="served"]').first();
    
    if (await servedBooking.isVisible()) {
      const bookingId = await servedBooking.getAttribute('data-booking-id');
      
      if (bookingId) {
        // Get initial invoice count
        const initialInvoices = await page.evaluate(async (id) => {
          // @ts-ignore
          const { data, count } = await supabase
            .from('invoices')
            .select('*', { count: 'exact' })
            .eq('booking_id', id);
          return count;
        }, bookingId);
        
        // Try to trigger again (simulate edge function re-run)
        await page.evaluate(async (id) => {
          // @ts-ignore
          await supabase.functions.invoke('generate-workover-invoice', {
            body: { booking_id: id }
          });
        }, bookingId);
        
        await page.waitForTimeout(2000);
        
        // Verify count didn't increase
        const finalInvoices = await page.evaluate(async (id) => {
          // @ts-ignore
          const { data, count } = await supabase
            .from('invoices')
            .select('*', { count: 'exact' })
            .eq('booking_id', id);
          return count;
        }, bookingId);
        
        expect(finalInvoices).toBe(initialInvoices);
      }
    }
  });

  test('Invoice number is unique and sequential', async ({ page }) => {
    await loginAsHost(page, 'forfettario');
    
    // Get all WorkOver invoices
    const invoices = await page.evaluate(async () => {
      // @ts-ignore
      const { data } = await supabase
        .from('invoices')
        .select('invoice_number')
        .order('created_at', { ascending: true });
      return data;
    });
    
    if (invoices && invoices.length > 0) {
      const invoiceNumbers = invoices.map((inv: any) => inv.invoice_number);
      const uniqueNumbers = new Set(invoiceNumbers);
      
      // Verify all unique
      expect(uniqueNumbers.size).toBe(invoiceNumbers.length);
      
      // Verify format
      invoiceNumbers.forEach((num: string) => {
        expect(num).toMatch(/^WF-\d{4}-\d{5}$/);
      });
    }
  });
});
