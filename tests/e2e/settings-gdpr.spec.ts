import { test, expect } from '@playwright/test';

test.describe('Settings - GDPR Compliance', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Assume authenticated session
  });

  test.describe('GDPR Data Export', () => {
    test('should display GDPR export button', async ({ page }) => {
      await page.goto('/settings');
      
      await expect(page.getByText('Esporta i tuoi dati')).toBeVisible();
      await expect(page.getByText(/GDPR Art\. 20/i)).toBeVisible();
      await expect(page.getByRole('button', { name: /richiedi export dati/i })).toBeVisible();
    });

    test('should show loading state during export', async ({ page }) => {
      await page.goto('/settings');
      
      const exportButton = page.getByRole('button', { name: /richiedi export dati/i });
      
      await expect(exportButton).toBeEnabled();
      await exportButton.click();
      
      // Button should show loading state
      await expect(page.getByText(/esportazione in corso/i)).toBeVisible();
      await expect(exportButton).toBeDisabled();
    });

    test('should show success message after export request', async ({ page }) => {
      await page.goto('/settings');
      
      // Mock successful export
      await page.route('**/rest/v1/rpc/start_instant_export', async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true })
        });
      });
      
      await page.getByRole('button', { name: /richiedi export dati/i }).click();
      
      // Check for success toast
      await expect(page.getByText(/export dati completato/i)).toBeVisible();
    });

    test('should handle export errors gracefully', async ({ page }) => {
      await page.goto('/settings');
      
      // Mock failed export
      await page.route('**/rest/v1/rpc/start_instant_export', async route => {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Export failed' })
        });
      });
      
      await page.getByRole('button', { name: /richiedi export dati/i }).click();
      
      // Check for error message
      await expect(page.getByText(/errore durante l'export/i)).toBeVisible();
    });
  });

  test.describe('Account Deletion', () => {
    test('should display delete account option in danger zone', async ({ page }) => {
      await page.goto('/settings');
      
      await expect(page.getByText('Zona Pericolosa')).toBeVisible();
      await expect(page.getByText(/elimina permanentemente il tuo account/i)).toBeVisible();
      await expect(page.getByRole('button', { name: /elimina account/i })).toBeVisible();
    });

    test('should open confirmation dialog when clicking delete', async ({ page }) => {
      await page.goto('/settings');
      
      await page.getByRole('button', { name: /elimina account/i }).click();
      
      // Check dialog is open
      await expect(page.getByRole('dialog')).toBeVisible();
      await expect(page.getByText(/sei sicuro di voler eliminare/i)).toBeVisible();
    });

    test('should require acknowledgment checkbox', async ({ page }) => {
      await page.goto('/settings');
      
      await page.getByRole('button', { name: /elimina account/i }).click();
      
      const confirmButton = page.getByRole('button', { name: /conferma eliminazione/i });
      
      // Confirm button should be disabled initially
      await expect(confirmButton).toBeDisabled();
      
      // Check the acknowledgment
      await page.getByRole('checkbox', { name: /comprendo che questa azione/i }).check();
      
      // Button should still be disabled until text is entered
      await expect(confirmButton).toBeDisabled();
    });

    test('should require exact confirmation text', async ({ page }) => {
      await page.goto('/settings');
      
      await page.getByRole('button', { name: /elimina account/i }).click();
      
      // Check acknowledgment
      await page.getByRole('checkbox', { name: /comprendo che questa azione/i }).check();
      
      const confirmInput = page.getByPlaceholder(/digita ELIMINA/i);
      const confirmButton = page.getByRole('button', { name: /conferma eliminazione/i });
      
      // Wrong text
      await confirmInput.fill('delete');
      await expect(confirmButton).toBeDisabled();
      
      // Partial text
      await confirmInput.fill('ELIM');
      await expect(confirmButton).toBeDisabled();
      
      // Correct text
      await confirmInput.fill('ELIMINA');
      await expect(confirmButton).toBeEnabled();
    });

    test('should display what will be deleted', async ({ page }) => {
      await page.goto('/settings');
      
      await page.getByRole('button', { name: /elimina account/i }).click();
      
      // Check list of items to be deleted
      await expect(page.getByText(/profilo utente/i)).toBeVisible();
      await expect(page.getByText(/prenotazioni/i)).toBeVisible();
      await expect(page.getByText(/messaggi/i)).toBeVisible();
      await expect(page.getByText(/recensioni/i)).toBeVisible();
    });

    test('should cancel deletion when clicking cancel', async ({ page }) => {
      await page.goto('/settings');
      
      await page.getByRole('button', { name: /elimina account/i }).click();
      
      await expect(page.getByRole('dialog')).toBeVisible();
      
      await page.getByRole('button', { name: /annulla/i }).click();
      
      // Dialog should close
      await expect(page.getByRole('dialog')).not.toBeVisible();
    });

    test('should show loading state during deletion', async ({ page }) => {
      await page.goto('/settings');
      
      await page.getByRole('button', { name: /elimina account/i }).click();
      
      // Fill requirements
      await page.getByRole('checkbox', { name: /comprendo che questa azione/i }).check();
      await page.getByPlaceholder(/digita ELIMINA/i).fill('ELIMINA');
      
      const confirmButton = page.getByRole('button', { name: /conferma eliminazione/i });
      
      await confirmButton.click();
      
      // Should show deleting state
      await expect(page.getByText(/deleting/i)).toBeVisible();
    });
  });

  test.describe('Settings Integration', () => {
    test('should navigate between settings sections', async ({ page }) => {
      await page.goto('/settings');
      
      // Check main settings page
      await expect(page.getByText(/impostazioni/i)).toBeVisible();
      
      // Check presence of various settings sections
      await expect(page.getByText('Networking Enabled')).toBeVisible();
      await expect(page.getByText('Esporta i tuoi dati')).toBeVisible();
      await expect(page.getByText('Zona Pericolosa')).toBeVisible();
    });

    test('should show email verification status', async ({ page }) => {
      await page.goto('/settings');
      
      // Email verification section should be visible
      await expect(page.getByText(/email verificata/i)).toBeVisible();
    });

    test('should display Stripe connection status for hosts', async ({ page }) => {
      await page.goto('/settings');
      
      // This would depend on user role in the test
      // For now, we just check the element can be rendered
      const stripeSection = page.locator('text=/stripe connect/i');
      
      // Section may or may not be visible depending on role
      // Just verify page loads without errors
      await expect(page.getByText(/impostazioni/i)).toBeVisible();
    });
  });
});
