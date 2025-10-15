import { test, expect } from '@playwright/test';

/**
 * E2E Tests: Host Fiscal Onboarding
 * 
 * Tests the complete flow of host fiscal regime selection and validation
 * Scenarios:
 * - Private individual (no P.IVA)
 * - Regime Forfettario (simplified VAT)
 * - Regime Ordinario (standard VAT)
 */

test.describe('Host Fiscal Onboarding', () => {
  test.beforeEach(async ({ page }) => {
    // Mock authenticated host user
    await page.goto('/profile/edit');
    await page.waitForLoadState('networkidle');
  });

  test('should show fiscal regime selector with default private option', async ({ page }) => {
    // Check fiscal regime dropdown exists
    const fiscalRegimeSelect = page.locator('select[name="fiscal_regime"], [id*="fiscal"][id*="regime"]');
    await expect(fiscalRegimeSelect.first()).toBeVisible();

    // Check "Privato" option is available
    const privateOption = page.getByText(/privato/i).or(page.getByText(/no p\.iva/i));
    await expect(privateOption.first()).toBeVisible();
  });

  test('should hide P.IVA fields for private individual', async ({ page }) => {
    // Select private regime (if not default)
    const fiscalRegimeSelect = page.locator('select[name="fiscal_regime"]').first();
    if (await fiscalRegimeSelect.isVisible()) {
      await fiscalRegimeSelect.selectOption({ label: /privato/i });
    }

    // Verify P.IVA field is NOT visible
    const vatField = page.getByLabel(/p\.iva/i);
    await expect(vatField).not.toBeVisible();
  });

  test('should show required fields for Regime Forfettario', async ({ page }) => {
    // Select Regime Forfettario
    const fiscalRegimeSelect = page.locator('select[name="fiscal_regime"]').first();
    await fiscalRegimeSelect.selectOption({ label: /forfettario/i });

    // Wait for conditional fields to appear
    await page.waitForTimeout(500);

    // Check P.IVA field is visible and required
    const vatField = page.getByLabel(/p\.iva/i);
    await expect(vatField).toBeVisible();

    // Check Codice Fiscale field is visible
    const taxCodeField = page.getByLabel(/codice fiscale/i);
    await expect(taxCodeField).toBeVisible();
  });

  test('should validate P.IVA format (11 digits)', async ({ page }) => {
    // Select Regime Forfettario
    const fiscalRegimeSelect = page.locator('select[name="fiscal_regime"]').first();
    await fiscalRegimeSelect.selectOption({ label: /forfettario/i });
    await page.waitForTimeout(500);

    // Enter invalid P.IVA (too short)
    const vatField = page.getByLabel(/p\.iva/i);
    await vatField.fill('123456');
    
    // Try to save
    const saveButton = page.getByRole('button', { name: /salva/i }).or(page.getByRole('button', { name: /aggiorna/i }));
    await saveButton.click();

    // Check for validation error
    const errorMessage = page.getByText(/11 cifre/i).or(page.getByText(/non valida/i));
    await expect(errorMessage).toBeVisible({ timeout: 5000 });
  });

  test('should validate Codice Fiscale format (16 characters)', async ({ page }) => {
    // Select Regime Forfettario
    const fiscalRegimeSelect = page.locator('select[name="fiscal_regime"]').first();
    await fiscalRegimeSelect.selectOption({ label: /forfettario/i });
    await page.waitForTimeout(500);

    // Enter invalid CF (too short)
    const taxCodeField = page.getByLabel(/codice fiscale/i);
    await taxCodeField.fill('ABC123');
    
    // Try to save
    const saveButton = page.getByRole('button', { name: /salva/i }).or(page.getByRole('button', { name: /aggiorna/i }));
    await saveButton.click();

    // Check for validation error
    const errorMessage = page.getByText(/16 caratteri/i).or(page.getByText(/non valido/i));
    await expect(errorMessage).toBeVisible({ timeout: 5000 });
  });

  test('should show VAT rate field for Regime Ordinario', async ({ page }) => {
    // Select Regime Ordinario
    const fiscalRegimeSelect = page.locator('select[name="fiscal_regime"]').first();
    await fiscalRegimeSelect.selectOption({ label: /ordinario/i });
    await page.waitForTimeout(500);

    // Check VAT rate field is visible
    const vatRateField = page.getByLabel(/aliquota iva/i).or(page.getByLabel(/iva %/i));
    await expect(vatRateField).toBeVisible();
  });

  test('should successfully save valid fiscal data for Regime Forfettario', async ({ page }) => {
    // Mock successful API response
    await page.route('**/rest/v1/profiles*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          fiscal_regime: 'forfettario',
          vat_number: '12345678901',
          tax_code: 'RSSMRA80A01H501U',
          updated_at: new Date().toISOString()
        })
      });
    });

    // Select Regime Forfettario
    const fiscalRegimeSelect = page.locator('select[name="fiscal_regime"]').first();
    await fiscalRegimeSelect.selectOption({ label: /forfettario/i });
    await page.waitForTimeout(500);

    // Fill valid data
    const vatField = page.getByLabel(/p\.iva/i);
    await vatField.fill('12345678901');

    const taxCodeField = page.getByLabel(/codice fiscale/i);
    await taxCodeField.fill('RSSMRA80A01H501U');

    // Save
    const saveButton = page.getByRole('button', { name: /salva/i }).or(page.getByRole('button', { name: /aggiorna/i }));
    await saveButton.click();

    // Check for success message
    const successMessage = page.getByText(/salvat/i).or(page.getByText(/aggiornat/i));
    await expect(successMessage).toBeVisible({ timeout: 5000 });
  });

  test('should save fiscal data to database', async ({ page }) => {
    let capturedRequestBody: any = null;

    // Intercept and capture the update request
    await page.route('**/rest/v1/profiles*', async (route) => {
      const request = route.request();
      if (request.method() === 'PATCH') {
        capturedRequestBody = await request.postDataJSON();
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true })
      });
    });

    // Select and fill Regime Forfettario
    const fiscalRegimeSelect = page.locator('select[name="fiscal_regime"]').first();
    await fiscalRegimeSelect.selectOption({ label: /forfettario/i });
    await page.waitForTimeout(500);

    await page.getByLabel(/p\.iva/i).fill('12345678901');
    await page.getByLabel(/codice fiscale/i).fill('RSSMRA80A01H501U');

    // Save
    const saveButton = page.getByRole('button', { name: /salva/i }).or(page.getByRole('button', { name: /aggiorna/i }));
    await saveButton.click();

    // Wait for request to complete
    await page.waitForTimeout(1000);

    // Verify request body contains fiscal data
    expect(capturedRequestBody).toBeTruthy();
    expect(capturedRequestBody.fiscal_regime).toBe('forfettario');
  });
});
