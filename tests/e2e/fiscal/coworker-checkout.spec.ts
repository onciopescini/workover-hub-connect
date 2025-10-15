import { test, expect } from '@playwright/test';

/**
 * E2E Tests: Coworker Checkout with Fiscal Fields
 * 
 * Tests the booking checkout flow with optional fiscal data collection
 * Scenarios:
 * - Booking from private host (no fiscal fields)
 * - Booking from P.IVA host (with invoice request toggle)
 * - CF vs P.IVA validation
 * - PEC/SDI conditional requirements
 */

test.describe('Coworker Checkout with Fiscal Fields', () => {
  test.beforeEach(async ({ page }) => {
    // Mock authenticated coworker user
    await page.addInitScript(() => {
      window.localStorage.setItem('auth-user', JSON.stringify({
        id: 'coworker-123',
        email: 'coworker@test.com',
        role: 'coworker'
      }));
    });
  });

  test('should hide fiscal fields when booking from private host', async ({ page }) => {
    // Mock space with private host
    await page.route('**/rest/v1/spaces/*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'space-private',
          title: 'Private Host Space',
          host: {
            fiscal_regime: 'private'
          }
        })
      });
    });

    await page.goto('/spaces/space-private');
    
    // Navigate to booking
    const bookButton = page.getByRole('button', { name: /prenota/i });
    if (await bookButton.isVisible()) {
      await bookButton.click();
    }

    // Verify fiscal toggle is NOT present
    const invoiceToggle = page.getByText(/richiedo fattura/i);
    await expect(invoiceToggle).not.toBeVisible();
  });

  test('should show fiscal toggle for P.IVA host bookings', async ({ page }) => {
    // Mock space with P.IVA host
    await page.route('**/rest/v1/spaces/*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'space-piva',
          title: 'P.IVA Host Space',
          host: {
            fiscal_regime: 'forfettario',
            vat_number: '12345678901'
          }
        })
      });
    });

    await page.goto('/spaces/space-piva');
    
    // Navigate to booking summary step
    const bookButton = page.getByRole('button', { name: /prenota/i });
    if (await bookButton.isVisible()) {
      await bookButton.click();
    }

    // Wait for checkout page
    await page.waitForLoadState('networkidle');

    // Verify fiscal toggle IS present
    const invoiceToggle = page.getByText(/richiedo fattura/i).or(page.getByText(/fattura elettronica/i));
    await expect(invoiceToggle.first()).toBeVisible({ timeout: 5000 });
  });

  test('should show fiscal fields when invoice toggle is enabled', async ({ page }) => {
    // Setup P.IVA host space
    await page.route('**/rest/v1/spaces/*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'space-piva',
          host: { fiscal_regime: 'forfettario' }
        })
      });
    });

    await page.goto('/spaces/space-piva');
    await page.getByRole('button', { name: /prenota/i }).click();
    await page.waitForLoadState('networkidle');

    // Enable invoice request
    const invoiceCheckbox = page.locator('input[type="checkbox"]').filter({ hasText: /fattura/i }).or(
      page.getByRole('checkbox', { name: /fattura/i })
    );
    await invoiceCheckbox.first().check();

    // Wait for conditional fields
    await page.waitForTimeout(500);

    // Verify CF/P.IVA field appears
    const taxIdField = page.getByLabel(/codice fiscale/i).or(page.getByLabel(/p\.iva/i));
    await expect(taxIdField.first()).toBeVisible();
  });

  test('should validate Codice Fiscale format (16 characters)', async ({ page }) => {
    await page.route('**/rest/v1/spaces/*', async (route) => {
      await route.fulfill({
        status: 200,
        body: JSON.stringify({ id: 'space-piva', host: { fiscal_regime: 'forfettario' } })
      });
    });

    await page.goto('/spaces/space-piva');
    await page.getByRole('button', { name: /prenota/i }).click();
    
    // Enable invoice
    const invoiceCheckbox = page.locator('input[type="checkbox"]').first();
    await invoiceCheckbox.check();
    await page.waitForTimeout(500);

    // Enter invalid CF
    const taxIdField = page.getByLabel(/codice fiscale/i).or(page.locator('input[name*="tax"]')).first();
    await taxIdField.fill('INVALID123');

    // Try to confirm booking
    const confirmButton = page.getByRole('button', { name: /conferma/i });
    await confirmButton.click();

    // Check for validation error
    const errorMessage = page.getByText(/16 caratteri/i).or(page.getByText(/formato/i));
    await expect(errorMessage).toBeVisible({ timeout: 3000 });
  });

  test('should validate P.IVA format (11 digits)', async ({ page }) => {
    await page.route('**/rest/v1/spaces/*', async (route) => {
      await route.fulfill({
        status: 200,
        body: JSON.stringify({ id: 'space-piva', host: { fiscal_regime: 'forfettario' } })
      });
    });

    await page.goto('/spaces/space-piva');
    await page.getByRole('button', { name: /prenota/i }).click();
    
    // Enable invoice and select business
    await page.locator('input[type="checkbox"]').first().check();
    await page.waitForTimeout(500);

    // Select "P.IVA" option
    const businessCheckbox = page.getByLabel(/azienda/i).or(page.getByLabel(/p\.iva/i));
    if (await businessCheckbox.isVisible()) {
      await businessCheckbox.check();
    }

    // Enter invalid P.IVA (too short)
    const vatField = page.locator('input[name*="tax"]').first();
    await vatField.fill('12345');

    // Try to confirm
    await page.getByRole('button', { name: /conferma/i }).click();

    // Check for validation error
    const errorMessage = page.getByText(/11 cifre/i).or(page.getByText(/non valid/i));
    await expect(errorMessage).toBeVisible({ timeout: 3000 });
  });

  test('should require PEC or SDI for business P.IVA', async ({ page }) => {
    await page.route('**/rest/v1/spaces/*', async (route) => {
      await route.fulfill({
        status: 200,
        body: JSON.stringify({ id: 'space-piva', host: { fiscal_regime: 'forfettario' } })
      });
    });

    await page.goto('/spaces/space-piva');
    await page.getByRole('button', { name: /prenota/i }).click();
    
    // Enable invoice and select business
    await page.locator('input[type="checkbox"]').first().check();
    await page.waitForTimeout(500);

    const businessCheckbox = page.getByLabel(/azienda/i).or(page.getByText(/p\.iva/i));
    if (await businessCheckbox.isVisible()) {
      await businessCheckbox.click();
      await page.waitForTimeout(500);
    }

    // Fill P.IVA but NOT PEC/SDI
    const vatField = page.locator('input[name*="tax"]').first();
    await vatField.fill('12345678901');

    // Try to confirm
    await page.getByRole('button', { name: /conferma/i }).click();

    // Check for PEC/SDI requirement error
    const errorMessage = page.getByText(/pec.*sdi/i).or(page.getByText(/obbligatorio/i));
    await expect(errorMessage).toBeVisible({ timeout: 3000 });
  });

  test('should save fiscal data to booking metadata', async ({ page }) => {
    let capturedMetadata: any = null;

    // Intercept booking creation
    await page.route('**/functions/v1/create-payment-session', async (route) => {
      const request = route.request();
      const body = await request.postDataJSON();
      capturedMetadata = body.metadata;
      
      await route.fulfill({
        status: 200,
        body: JSON.stringify({ url: 'https://checkout.stripe.com/mock' })
      });
    });

    await page.route('**/rest/v1/spaces/*', async (route) => {
      await route.fulfill({
        status: 200,
        body: JSON.stringify({ id: 'space-piva', host: { fiscal_regime: 'forfettario' } })
      });
    });

    await page.goto('/spaces/space-piva');
    await page.getByRole('button', { name: /prenota/i }).click();
    
    // Enable invoice and fill data
    await page.locator('input[type="checkbox"]').first().check();
    await page.waitForTimeout(500);

    await page.locator('input[name*="tax"]').first().fill('RSSMRA80A01H501U');
    await page.getByLabel(/indirizzo/i).fill('Via Test 123');
    await page.getByLabel(/città/i).fill('Milano');
    await page.getByLabel(/cap/i).fill('20100');

    // Confirm booking
    await page.getByRole('button', { name: /conferma/i }).click();
    await page.waitForTimeout(1000);

    // Verify metadata was sent
    expect(capturedMetadata).toBeTruthy();
    expect(capturedMetadata.fiscal_data).toBeTruthy();
  });

  test('should allow checkout without fiscal data (toggle OFF)', async ({ page }) => {
    await page.route('**/rest/v1/spaces/*', async (route) => {
      await route.fulfill({
        status: 200,
        body: JSON.stringify({ id: 'space-piva', host: { fiscal_regime: 'forfettario' } })
      });
    });

    await page.route('**/functions/v1/create-payment-session', async (route) => {
      await route.fulfill({
        status: 200,
        body: JSON.stringify({ url: 'https://checkout.stripe.com/mock' })
      });
    });

    await page.goto('/spaces/space-piva');
    await page.getByRole('button', { name: /prenota/i }).click();
    
    // Do NOT enable invoice toggle
    // Directly try to confirm booking
    const confirmButton = page.getByRole('button', { name: /conferma/i });
    await confirmButton.click();

    // Should redirect to Stripe without errors
    await expect(page).toHaveURL(/checkout\.stripe\.com/, { timeout: 5000 });
  });
});
