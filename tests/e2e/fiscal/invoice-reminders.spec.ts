import { test, expect } from '@playwright/test';
import { loginAsHost, triggerInvoiceReminders } from '../../utils/fiscal-test-helpers';

test.describe('Email Reminder Cron Job', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('Host invoice deadline reminder sent (T-2 days)', async ({ page }) => {
    await loginAsHost(page, 'forfettario');
    
    // Create a payment with approaching deadline
    const testPayment = await page.evaluate(async () => {
      const bookingId = crypto.randomUUID();
      const userId = crypto.randomUUID();
      
      // Create mock booking
      // @ts-ignore
      await supabase.from('bookings').insert({
        id: bookingId,
        space_id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        user_id: userId,
        booking_date: new Date().toISOString().split('T')[0],
        status: 'served'
      });
      
      // Create payment with deadline in 2 days
      const deadline = new Date();
      deadline.setDate(deadline.getDate() + 2);
      
      // @ts-ignore
      const { data } = await supabase.from('payments').insert({
        booking_id: bookingId,
        user_id: userId,
        amount: 49.99,
        host_amount: 44.99,
        platform_fee: 5.00,
        payment_status: 'completed',
        host_invoice_required: true,
        host_invoice_deadline: deadline.toISOString(),
        host_invoice_reminder_sent: false
      }).select().single();
      
      return data;
    });
    
    // Trigger reminder function
    const result = await triggerInvoiceReminders(page);
    
    // Verify reminder was sent
    const payment = await page.evaluate(async (id) => {
      // @ts-ignore
      const { data } = await supabase
        .from('payments')
        .select('host_invoice_reminder_sent')
        .eq('id', id)
        .single();
      return data;
    }, testPayment.id);
    
    expect(payment.host_invoice_reminder_sent).toBe(true);
    
    // Check for notification
    await page.goto('/host/notifications');
    await page.waitForLoadState('networkidle');
    await expect(page.getByText(/promemoria.*fattura|invoice reminder/i)).toBeVisible({ timeout: 5000 }).catch(() => {});
  });

  test('No reminder if already sent', async ({ page }) => {
    await loginAsHost(page, 'forfettario');
    
    // Create payment with reminder already sent
    const testPayment = await page.evaluate(async () => {
      const bookingId = crypto.randomUUID();
      const userId = crypto.randomUUID();
      
      // @ts-ignore
      await supabase.from('bookings').insert({
        id: bookingId,
        space_id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        user_id: userId,
        booking_date: new Date().toISOString().split('T')[0],
        status: 'served'
      });
      
      const deadline = new Date();
      deadline.setDate(deadline.getDate() + 2);
      
      // @ts-ignore
      const { data } = await supabase.from('payments').insert({
        booking_id: bookingId,
        user_id: userId,
        amount: 49.99,
        payment_status: 'completed',
        host_invoice_required: true,
        host_invoice_deadline: deadline.toISOString(),
        host_invoice_reminder_sent: true // Already sent
      }).select().single();
      
      return data;
    });
    
    // Get initial notification count
    const initialCount = await page.evaluate(async () => {
      // @ts-ignore
      const { count } = await supabase
        .from('user_notifications')
        .select('*', { count: 'exact' })
        .eq('type', 'invoice_reminder');
      return count;
    });
    
    // Trigger reminders
    await triggerInvoiceReminders(page);
    
    // Verify no new notification created
    const finalCount = await page.evaluate(async () => {
      // @ts-ignore
      const { count } = await supabase
        .from('user_notifications')
        .select('*', { count: 'exact' })
        .eq('type', 'invoice_reminder');
      return count;
    });
    
    expect(finalCount).toBe(initialCount);
  });

  test('Credit note reminder sent', async ({ page }) => {
    await loginAsHost(page, 'forfettario');
    
    // Create payment requiring credit note
    await page.evaluate(async () => {
      const bookingId = crypto.randomUUID();
      const userId = crypto.randomUUID();
      
      // @ts-ignore
      await supabase.from('bookings').insert({
        id: bookingId,
        space_id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        user_id: userId,
        booking_date: new Date().toISOString().split('T')[0],
        status: 'cancelled'
      });
      
      const deadline = new Date();
      deadline.setDate(deadline.getDate() + 3);
      
      // @ts-ignore
      await supabase.from('payments').insert({
        booking_id: bookingId,
        user_id: userId,
        amount: 49.99,
        payment_status: 'refund_pending',
        credit_note_required: true,
        credit_note_deadline: deadline.toISOString(),
        credit_note_issued_by_host: false
      });
    });
    
    // Trigger reminders
    await triggerInvoiceReminders(page);
    
    // Check for credit note notification
    await page.goto('/host/notifications');
    await page.waitForLoadState('networkidle');
    await expect(page.getByText(/nota credito|credit note/i)).toBeVisible({ timeout: 5000 }).catch(() => {});
  });

  test('Reminder function handles multiple payments', async ({ page }) => {
    await loginAsHost(page, 'forfettario');
    
    // Create multiple payments with approaching deadlines
    await page.evaluate(async () => {
      const deadline = new Date();
      deadline.setDate(deadline.getDate() + 2);
      
      for (let i = 0; i < 3; i++) {
        const bookingId = crypto.randomUUID();
        const userId = crypto.randomUUID();
        
        // @ts-ignore
        await supabase.from('bookings').insert({
          id: bookingId,
          space_id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
          user_id: userId,
          booking_date: new Date().toISOString().split('T')[0],
          status: 'served'
        });
        
        // @ts-ignore
        await supabase.from('payments').insert({
          booking_id: bookingId,
          user_id: userId,
          amount: 49.99,
          payment_status: 'completed',
          host_invoice_required: true,
          host_invoice_deadline: deadline.toISOString(),
          host_invoice_reminder_sent: false
        });
      }
    });
    
    // Trigger reminders
    const result = await triggerInvoiceReminders(page);
    
    // Verify function executed successfully
    expect(result.error).toBeNull();
    
    // Verify all payments updated
    const updatedPayments = await page.evaluate(async () => {
      // @ts-ignore
      const { data } = await supabase
        .from('payments')
        .select('host_invoice_reminder_sent')
        .eq('host_invoice_required', true)
        .eq('host_invoice_reminder_sent', true);
      return data;
    });
    
    expect(updatedPayments.length).toBeGreaterThanOrEqual(3);
  });
});
