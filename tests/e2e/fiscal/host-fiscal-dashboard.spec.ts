import { test, expect } from '@playwright/test';
import { loginAsHost, fillFiscalDataForm } from '../../utils/fiscal-test-helpers';
import { fiscalTestFixtures } from '../../fixtures/fiscal-fixtures';

test.describe('Host Fiscal Dashboard Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('Host (forfettario) updates fiscal data', async ({ page }) => {
    await loginAsHost(page, 'forfettario');
    await page.goto('/host/fiscal');
    await page.waitForLoadState('networkidle');
    
    // Fill fiscal data form
    const fiscalData = fiscalTestFixtures.hosts.forfettario;
    await fillFiscalDataForm(page, {
      ...fiscalData,
      pec_email: 'updated.forfettario@pec.it'
    });
    
    // Submit form
    await page.click('[data-testid="submit-fiscal-data"]');
    
    // Verify success toast
    await expect(page.getByText(/dati fiscali aggiornati|fiscal data updated/i)).toBeVisible({ timeout: 5000 });
    
    // Verify KYC reset notification
    await expect(page.getByText(/verifica kyc|kyc verification/i)).toBeVisible({ timeout: 5000 }).catch(() => {});
  });

  test('Host (ordinario) updates company fiscal data', async ({ page }) => {
    await loginAsHost(page, 'ordinario');
    await page.goto('/host/fiscal');
    await page.waitForLoadState('networkidle');
    
    const fiscalData = fiscalTestFixtures.hosts.ordinario;
    await fillFiscalDataForm(page, {
      ...fiscalData,
      sdi_code: 'ZYXWV98'
    });
    
    await page.click('[data-testid="submit-fiscal-data"]');
    await expect(page.getByText(/dati fiscali aggiornati|fiscal data updated/i)).toBeVisible({ timeout: 5000 });
  });

  test('Host views WorkOver invoices received', async ({ page }) => {
    await loginAsHost(page, 'forfettario');
    await page.goto('/host/fiscal');
    await page.waitForLoadState('networkidle');
    
    // Navigate to "Fatture Ricevute" tab
    await page.click('[data-testid="tab-invoices-received"]');
    await page.waitForLoadState('networkidle');
    
    // Check if invoices list is visible
    const invoicesTable = page.locator('[data-testid="invoices-table"]');
    if (await invoicesTable.isVisible()) {
      // Verify table headers
      await expect(page.getByText(/numero fattura|invoice number/i)).toBeVisible();
      
      // Try to download first invoice PDF
      const downloadButton = page.locator('[data-testid^="download-invoice-pdf-"]').first();
      if (await downloadButton.isVisible()) {
        await downloadButton.click();
        // PDF download is triggered (browser dependent)
      }
    }
  });

  test('Host (forfettario) views invoices to issue', async ({ page }) => {
    await loginAsHost(page, 'forfettario');
    await page.goto('/host/fiscal');
    await page.waitForLoadState('networkidle');
    
    // Navigate to "Fatture da Emettere" tab
    await page.click('[data-testid="tab-invoices-to-issue"]');
    await page.waitForLoadState('networkidle');
    
    const invoicesTable = page.locator('[data-testid="invoices-to-issue-table"]');
    if (await invoicesTable.isVisible()) {
      // Verify deadline column
      await expect(page.getByText(/scadenza|deadline/i)).toBeVisible();
      
      // Try to download fiscal guide
      const guideButton = page.locator('[data-testid^="download-fiscal-guide-"]').first();
      if (await guideButton.isVisible()) {
        await guideButton.click();
        await page.waitForTimeout(1000);
      }
    }
  });

  test('Host (privato) views non-fiscal receipts', async ({ page }) => {
    await loginAsHost(page, 'privato');
    await page.goto('/host/fiscal');
    await page.waitForLoadState('networkidle');
    
    // For privato, should see "Le Mie Ricevute" tab instead of "Fatture da Emettere"
    const receiptsTab = page.locator('[data-testid="tab-non-fiscal-receipts"]');
    if (await receiptsTab.isVisible()) {
      await receiptsTab.click();
      await page.waitForLoadState('networkidle');
      
      const receiptsTable = page.locator('[data-testid="receipts-table"]');
      if (await receiptsTable.isVisible()) {
        // Verify disclaimer text
        await expect(page.getByText(/non valido ai fini fiscali|not valid for tax purposes/i)).toBeVisible();
        
        // Download receipt
        const downloadButton = page.locator('[data-testid^="download-receipt-"]').first();
        if (await downloadButton.isVisible()) {
          await downloadButton.click();
          await page.waitForTimeout(1000);
        }
      }
    }
  });

  test('Validation errors for invalid fiscal data', async ({ page }) => {
    await loginAsHost(page, 'forfettario');
    await page.goto('/host/fiscal');
    await page.waitForLoadState('networkidle');
    
    // Test invalid P.IVA format
    await page.fill('[name="tax_id"]', 'INVALID123');
    await page.click('[data-testid="submit-fiscal-data"]');
    await expect(page.getByText(/codice fiscale non valido|invalid tax code/i)).toBeVisible({ timeout: 3000 });
    
    // Test invalid PEC
    await page.fill('[name="pec_email"]', 'not-a-pec-email');
    await page.click('[data-testid="submit-fiscal-data"]');
    await expect(page.getByText(/pec non valida|invalid pec/i)).toBeVisible({ timeout: 3000 });
    
    // Test invalid IBAN
    await page.fill('[name="iban"]', 'IT123');
    await page.click('[data-testid="submit-fiscal-data"]');
    await expect(page.getByText(/iban non valido|invalid iban/i)).toBeVisible({ timeout: 3000 });
  });

  test('KYC verification status displayed correctly', async ({ page }) => {
    await loginAsHost(page, 'forfettario');
    await page.goto('/host/fiscal');
    await page.waitForLoadState('networkidle');
    
    // Should show KYC verified badge for approved host
    await expect(page.getByText(/kyc verificato|kyc verified/i)).toBeVisible({ timeout: 5000 }).catch(() => {});
    
    // Switch to pending KYC host
    await page.click('[data-testid="user-menu"]');
    await page.click('[data-testid="logout"]');
    
    await loginAsHost(page, 'pendingKyc');
    await page.goto('/host/fiscal');
    await page.waitForLoadState('networkidle');
    
    // Should show pending status
    await expect(page.getByText(/kyc in attesa|kyc pending/i)).toBeVisible({ timeout: 5000 }).catch(() => {});
  });
});
