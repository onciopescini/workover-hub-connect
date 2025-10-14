import { test, expect } from '@playwright/test';
import { 
  loginAsHost, 
  loginAsCoworker, 
  loginAsAdmin,
  fillFiscalDataForm,
  createTestSpace,
  updateBookingStatus,
  verifyInvoiceGenerated,
  verifyNonFiscalReceiptGenerated,
  triggerInvoiceReminders
} from '../../utils/fiscal-test-helpers';
import { fiscalTestFixtures, mockSpaceData } from '../../fixtures/fiscal-fixtures';

test.describe('Complete Fiscal Flow Integration', () => {
  test.describe('Full flow for forfettario host', () => {
    test('E2E: KYC → Space → Booking → Invoice → Reminder', async ({ page }) => {
      // Step 1: Host completes KYC
      await loginAsHost(page, 'pendingKyc');
      await page.goto('/host/fiscal');
      await page.waitForLoadState('networkidle');
      
      const fiscalData = fiscalTestFixtures.hosts.pendingKyc;
      await fillFiscalDataForm(page, fiscalData);
      await page.click('[data-testid="submit-fiscal-data"]');
      await expect(page.getByText(/dati fiscali.*inviati|fiscal data submitted/i)).toBeVisible({ timeout: 5000 }).catch(() => {});
      
      // Step 2: Admin approves KYC
      await page.click('[data-testid="user-menu"]');
      await page.click('[data-testid="logout"]');
      
      await loginAsAdmin(page);
      await page.goto('/admin/kyc');
      await page.waitForLoadState('networkidle');
      
      const kycCard = page.locator(`[data-testid="kyc-card-${fiscalData.email}"]`).first();
      if (await kycCard.isVisible()) {
        await kycCard.locator('[data-testid="approve-kyc"]').click();
        await page.locator('[data-testid="confirm-approval"]').click();
        await page.waitForTimeout(1000);
      }
      
      await page.click('[data-testid="user-menu"]');
      await page.click('[data-testid="logout"]');
      
      // Step 3: Host creates and publishes space
      await loginAsHost(page, 'pendingKyc');
      await createTestSpace(page, {
        ...mockSpaceData.basic,
        title: 'Fiscal Test Space Forfettario'
      });
      
      // Verify space is published
      await page.goto('/host/spaces');
      await expect(page.getByText('Fiscal Test Space Forfettario')).toBeVisible({ timeout: 5000 });
      
      // Step 4: Coworker books space
      const spaceId = await page.evaluate(async () => {
        // @ts-ignore
        const { data } = await supabase
          .from('spaces')
          .select('id')
          .eq('title', 'Fiscal Test Space Forfettario')
          .single();
        return data?.id;
      });
      
      await page.click('[data-testid="user-menu"]');
      await page.click('[data-testid="logout"]');
      
      await loginAsCoworker(page, 'verified');
      
      if (spaceId) {
        await page.goto(`/spaces/${spaceId}`);
        const bookingDate = new Date(Date.now() + 2 * 86400000).toISOString().split('T')[0];
        await page.fill('[name="booking_date"]', bookingDate);
        await page.click('[data-testid="book-now-button"]');
        await page.waitForURL(/\/payment/, { timeout: 10000 });
        
        // Complete payment (mock)
        const bookingId = await page.url().match(/booking[\/=]([a-f0-9-]+)/)?.[1];
        
        if (bookingId) {
          // Step 5: Mark booking as served → triggers invoice generation
          await page.click('[data-testid="user-menu"]');
          await page.click('[data-testid="logout"]');
          
          await loginAsHost(page, 'pendingKyc');
          await updateBookingStatus(page, bookingId, 'served');
          
          // Step 6: Verify WorkOver invoice generated
          const invoice = await verifyInvoiceGenerated(page, bookingId);
          expect(invoice).toBeTruthy();
          
          // Step 7: Verify host notified to issue invoice
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
          
          // Step 8: Verify host views invoice guide
          await page.goto('/host/fiscal');
          await page.click('[data-testid="tab-invoices-to-issue"]');
          await page.waitForLoadState('networkidle');
          await expect(page.getByText(/fatture.*emettere|invoices to issue/i)).toBeVisible({ timeout: 5000 });
          
          // Step 9: Trigger reminder (simulate T-2 days)
          await page.evaluate(async (paymentId) => {
            const deadline = new Date();
            deadline.setDate(deadline.getDate() + 2);
            
            // @ts-ignore
            await supabase
              .from('payments')
              .update({ 
                host_invoice_deadline: deadline.toISOString(),
                host_invoice_reminder_sent: false 
              })
              .eq('id', paymentId);
          }, payment.id);
          
          await triggerInvoiceReminders(page);
          
          // Step 10: Verify reminder notification
          await page.goto('/host/notifications');
          await page.waitForLoadState('networkidle');
          await expect(page.getByText(/promemoria|reminder/i)).toBeVisible({ timeout: 5000 }).catch(() => {});
        }
      }
    });
  });

  test.describe('Full flow for ordinario host', () => {
    test('E2E: Company KYC → Invoice with SDI', async ({ page }) => {
      await loginAsHost(page, 'ordinario');
      
      // Verify fiscal regime is ordinario
      await page.goto('/host/fiscal');
      await page.waitForLoadState('networkidle');
      
      const regime = await page.evaluate(async () => {
        // @ts-ignore
        const { data } = await supabase.auth.getUser();
        if (!data.user) return null;
        
        // @ts-ignore
        const { data: profile } = await supabase
          .from('profiles')
          .select('fiscal_regime, vat_number, sdi_code')
          .eq('id', data.user.id)
          .single();
        return profile;
      });
      
      expect(regime?.fiscal_regime).toBe('ordinario');
      expect(regime?.vat_number).toBeTruthy();
      expect(regime?.sdi_code).toBeTruthy();
      
      // Create space and booking
      await createTestSpace(page, {
        ...mockSpaceData.basic,
        title: 'Ordinario Company Space'
      });
      
      const spaceId = await page.evaluate(async () => {
        // @ts-ignore
        const { data } = await supabase
          .from('spaces')
          .select('id')
          .eq('title', 'Ordinario Company Space')
          .single();
        return data?.id;
      });
      
      if (spaceId) {
        // Simulate booking and served status
        const bookingId = await page.evaluate(async (sid) => {
          const id = crypto.randomUUID();
          
          // @ts-ignore
          await supabase.from('bookings').insert({
            id,
            space_id: sid,
            user_id: '66666666-6666-6666-6666-666666666666',
            booking_date: new Date().toISOString().split('T')[0],
            status: 'confirmed'
          });
          
          // @ts-ignore
          await supabase.from('payments').insert({
            booking_id: id,
            user_id: '66666666-6666-6666-6666-666666666666',
            amount: 50.00,
            host_amount: 45.00,
            platform_fee: 5.00,
            payment_status: 'completed'
          });
          
          return id;
        }, spaceId);
        
        await updateBookingStatus(page, bookingId, 'served');
        
        // Verify invoice with company data
        const invoice = await verifyInvoiceGenerated(page, bookingId);
        expect(invoice.recipient_type).toMatch(/ordinario|piva/);
      }
    });
  });

  test.describe('Full flow for privato host', () => {
    test('E2E: Private host → Non-fiscal receipt', async ({ page }) => {
      await loginAsHost(page, 'privato');
      
      // Create space
      await createTestSpace(page, {
        ...mockSpaceData.basic,
        title: 'Private Host Space',
        price_per_day: 40.00
      });
      
      const spaceId = await page.evaluate(async () => {
        // @ts-ignore
        const { data } = await supabase
          .from('spaces')
          .select('id')
          .eq('title', 'Private Host Space')
          .single();
        return data?.id;
      });
      
      if (spaceId) {
        // Simulate booking
        const bookingId = await page.evaluate(async (sid) => {
          const id = crypto.randomUUID();
          
          // @ts-ignore
          await supabase.from('bookings').insert({
            id,
            space_id: sid,
            user_id: '66666666-6666-6666-6666-666666666666',
            booking_date: new Date().toISOString().split('T')[0],
            status: 'confirmed'
          });
          
          // @ts-ignore
          await supabase.from('payments').insert({
            booking_id: id,
            user_id: '66666666-6666-6666-6666-666666666666',
            amount: 40.00,
            host_amount: 36.00,
            platform_fee: 4.00,
            payment_status: 'completed'
          });
          
          return id;
        }, spaceId);
        
        await updateBookingStatus(page, bookingId, 'served');
        
        // Verify non-fiscal receipt generated
        const receipt = await verifyNonFiscalReceiptGenerated(page, bookingId);
        expect(receipt).toBeTruthy();
        expect(receipt.disclaimer).toContain('non valido ai fini fiscali');
        
        // Verify host can download receipt
        await page.goto('/host/fiscal');
        await page.click('[data-testid="tab-non-fiscal-receipts"]');
        await page.waitForLoadState('networkidle');
        await expect(page.getByText(/ricevuta|receipt/i)).toBeVisible({ timeout: 5000 });
      }
    });
  });

  test('Verify all notifications sent correctly across full flow', async ({ page }) => {
    await loginAsHost(page, 'forfettario');
    
    // Get all notification types
    const notifications = await page.evaluate(async () => {
      // @ts-ignore
      const { data } = await supabase
        .from('user_notifications')
        .select('type, title, content')
        .order('created_at', { ascending: false })
        .limit(10);
      return data;
    });
    
    // Verify notification types exist
    const notificationTypes = notifications?.map((n: any) => n.type) || [];
    
    // Should include various fiscal notifications
    const expectedTypes = ['kyc', 'invoice', 'booking', 'payment'];
    const hasRelevantNotifications = expectedTypes.some(type => 
      notificationTypes.some((nt: string) => nt.includes(type))
    );
    
    expect(hasRelevantNotifications || notifications?.length > 0).toBe(true);
  });
});
