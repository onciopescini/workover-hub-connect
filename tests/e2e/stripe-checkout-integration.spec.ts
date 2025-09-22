import { test, expect } from '@playwright/test';

test.describe('Stripe Checkout Integration', () => {
  test.beforeEach(async ({ page }) => {
    // Set feature flag for two-step booking
    await page.addInitScript(() => {
      localStorage.setItem('enable-two-step-booking', 'true');
    });
    
    // Navigate to space detail page
    await page.goto('/space/1');
    
    // Click booking button to start flow
    await page.getByRole('button', { name: /prenota/i }).first().click();
  });

  test('should complete booking flow to Stripe Checkout with Tax OFF', async ({ page }) => {
    // Set environment to simulate Tax OFF
    await page.addInitScript(() => {
      localStorage.setItem('ENABLE_STRIPE_TAX', 'false');
    });

    // Step 1: Select tomorrow's date
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    await page.getByTestId('date-picker-trigger').click();
    await page.getByTestId('date-picker-calendar').getByRole('gridcell', { name: tomorrow.getDate().toString() }).click();
    await page.getByTestId('date-step-continue').click();

    // Step 2: Select time range (10:00-13:00)
    await page.getByTestId('time-slot-10_00').click();
    await page.getByTestId('time-slot-13_00').click();
    await page.getByRole('button', { name: /continua/i }).click();

    // Step 3: Verify pricing display shows VAT percentage
    await expect(page.locator('text=/IVA \\(22%\\)/')).toBeVisible();

    // Mock the payment session creation
    await page.route('**/functions/v1/create-payment-session', async route => {
      const request = route.request();
      const postData = request.postDataJSON();
      
      // Verify request contains required fields
      expect(postData.space_id).toBeDefined();
      expect(postData.durationHours).toBe(3);
      expect(postData.pricePerHour).toBeDefined();
      expect(postData.pricePerDay).toBeDefined();
      expect(postData.host_stripe_account_id).toBeDefined();

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          url: 'https://stripe.test/session/tax-off',
          serverTotals: {
            base: 45,
            serviceFee: 5.4,
            vat: 11.09,
            total: 61.49,
            stripeTaxEnabled: false,
            unitAmount: 61.49
          }
        })
      });
    });

    // Click confirm button
    await page.getByRole('button', { name: /conferma/i }).click();

    // Verify loading state
    await expect(page.getByTestId('checkout-loading-spinner')).toBeVisible();

    // Verify redirect to Stripe
    await expect(page).toHaveURL('https://stripe.test/session/tax-off');
  });

  test('should complete booking flow to Stripe Checkout with Tax ON', async ({ page }) => {
    // Set environment to simulate Tax ON
    await page.addInitScript(() => {
      localStorage.setItem('ENABLE_STRIPE_TAX', 'true');
    });

    // Complete booking flow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    await page.getByTestId('date-picker-trigger').click();
    await page.getByTestId('date-picker-calendar').getByRole('gridcell', { name: tomorrow.getDate().toString() }).click();
    await page.getByTestId('date-step-continue').click();

    await page.getByTestId('time-slot-10_00').click();
    await page.getByTestId('time-slot-13_00').click();
    await page.getByRole('button', { name: /continua/i }).click();

    // Verify pricing display shows "calculated at checkout"
    await expect(page.locator('text=/calcolata al pagamento/')).toBeVisible();

    // Mock payment session with Tax ON
    await page.route('**/functions/v1/create-payment-session', async route => {
      const postData = route.request().postDataJSON();
      
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          url: 'https://stripe.test/session/tax-on',
          serverTotals: {
            base: 45,
            serviceFee: 5.4,
            vat: 0, // VAT should be 0 when Stripe Tax enabled
            total: 50.4, // Only base + service fee
            stripeTaxEnabled: true,
            unitAmount: 50.4
          }
        })
      });
    });

    await page.getByRole('button', { name: /conferma/i }).click();
    await expect(page).toHaveURL('https://stripe.test/session/tax-on');
  });

  test('should handle payment session creation error', async ({ page }) => {
    // Complete booking flow to summary step
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    await page.getByTestId('date-picker-trigger').click();
    await page.getByTestId('date-picker-calendar').getByRole('gridcell', { name: tomorrow.getDate().toString() }).click();
    await page.getByTestId('date-step-continue').click();

    await page.getByTestId('time-slot-10_00').click();
    await page.getByTestId('time-slot-13_00').click();
    await page.getByRole('button', { name: /continua/i }).click();

    // Mock payment session error
    await page.route('**/functions/v1/create-payment-session', async route => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'Host Stripe account not connected'
        })
      });
    });

    await page.getByRole('button', { name: /conferma/i }).click();

    // Verify error toast appears
    await expect(page.getByTestId('payment-error-toast')).toBeVisible();
    await expect(page.locator('text=/Errore nella creazione della sessione di pagamento/')).toBeVisible();
  });

  test('should handle missing host Stripe account', async ({ page }) => {
    // Mock space data without host_stripe_account_id
    await page.route('**/spaces/*', async route => {
      const originalResponse = await route.fetch();
      const data = await originalResponse.json();
      delete data.host_stripe_account_id;
      
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(data)
      });
    });

    // Complete flow to summary
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    await page.getByTestId('date-picker-trigger').click();
    await page.getByTestId('date-picker-calendar').getByRole('gridcell', { name: tomorrow.getDate().toString() }).click();
    await page.getByTestId('date-step-continue').click();

    await page.getByTestId('time-slot-10_00').click();
    await page.getByTestId('time-slot-13_00').click();
    await page.getByRole('button', { name: /continua/i }).click();

    // Verify confirm button is disabled and hint is shown
    await expect(page.getByRole('button', { name: /conferma/i })).toBeDisabled();
    await expect(page.locator('text=/host non collegato a Stripe/i')).toBeVisible();
  });

  test('should maintain existing lock conflict handling', async ({ page }) => {
    // Complete flow to summary
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    await page.getByTestId('date-picker-trigger').click();
    await page.getByTestId('date-picker-calendar').getByRole('gridcell', { name: tomorrow.getDate().toString() }).click();
    await page.getByTestId('date-step-continue').click();

    await page.getByTestId('time-slot-10_00').click();
    await page.getByTestId('time-slot-13_00').click();
    await page.getByRole('button', { name: /continua/i }).click();

    // Mock slot lock conflict
    await page.route('**/rest/v1/rpc/validate_and_reserve_slot', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'Slot already booked by another user',
          code: 'CONFLICT'
        })
      });
    });

    await page.getByRole('button', { name: /conferma/i }).click();

    // Verify lock error toast appears
    await expect(page.getByTestId('lock-error-toast')).toBeVisible();
    await expect(page.locator('text=/Slot non più disponibile/')).toBeVisible();
    
    // Click refresh button
    await page.getByRole('button', { name: /aggiorna/i }).click();
    
    // Should return to TIME step
    await expect(page.getByTestId('time-slot-10_00')).toBeVisible();
  });
});