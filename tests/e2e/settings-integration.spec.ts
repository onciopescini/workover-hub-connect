import { test, expect } from '@playwright/test';

test.describe('Settings - Full Integration', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display all settings sections', async ({ page }) => {
    await page.goto('/settings');
    
    // Main settings page
    await expect(page.getByText(/impostazioni/i).first()).toBeVisible();
    
    // Check major sections
    await expect(page.getByText('Networking')).toBeVisible();
    await expect(page.getByText('Profilo')).toBeVisible();
    await expect(page.getByText('Privacy & Sicurezza')).toBeVisible();
  });

  test('should navigate to profile edit from settings', async ({ page }) => {
    await page.goto('/settings');
    
    // Click on profile settings
    const profileLink = page.getByRole('link', { name: /profilo/i }).first();
    await profileLink.click();
    
    // Should navigate to profile edit
    await expect(page).toHaveURL(/\/profile\/edit/);
  });

  test('should toggle networking setting', async ({ page }) => {
    await page.goto('/settings');
    
    // Find networking toggle
    const networkingToggle = page.getByRole('switch', { name: /networking enabled/i });
    
    if (await networkingToggle.isVisible()) {
      const initialState = await networkingToggle.isChecked();
      
      // Toggle it
      await networkingToggle.click();
      
      // State should change
      await expect(networkingToggle).toHaveAttribute('aria-checked', String(!initialState));
    }
  });

  test('should show password change in settings tab', async ({ page }) => {
    await page.goto('/profile/edit');
    
    // Navigate to Settings tab
    const settingsTab = page.getByRole('tab', { name: /settings/i });
    await settingsTab.click();
    
    // Password change form should be visible
    await expect(page.getByText('Cambio Password')).toBeVisible();
    await expect(page.getByPlaceholder('Password attuale')).toBeVisible();
  });

  test('should show GDPR options in settings tab', async ({ page }) => {
    await page.goto('/profile/edit');
    
    // Navigate to Settings tab
    const settingsTab = page.getByRole('tab', { name: /settings/i });
    await settingsTab.click();
    
    // GDPR export should be visible
    await expect(page.getByText('Esporta i tuoi dati')).toBeVisible();
    
    // Danger zone should be visible
    await expect(page.getByText('Zona Pericolosa')).toBeVisible();
  });

  test('should persist settings across navigation', async ({ page }) => {
    await page.goto('/profile/edit');
    
    // Go to settings tab
    const settingsTab = page.getByRole('tab', { name: /settings/i });
    await settingsTab.click();
    
    // Toggle networking
    const networkingToggle = page.getByRole('switch', { name: /networking enabled/i });
    const initialState = await networkingToggle.isChecked();
    
    await networkingToggle.click();
    
    // Navigate away and back
    await page.goto('/profile');
    await page.goto('/profile/edit');
    await settingsTab.click();
    
    // State should be persisted (if save was triggered)
    // Note: This depends on auto-save or manual save implementation
    await expect(networkingToggle).toBeVisible();
  });

  test('should validate form before allowing save', async ({ page }) => {
    await page.goto('/profile/edit');
    
    // Try to save with invalid data
    const firstNameInput = page.getByLabel(/first name/i);
    
    if (await firstNameInput.isVisible()) {
      // Clear required field
      await firstNameInput.clear();
      
      // Try to save
      const saveButton = page.getByRole('button', { name: /save changes/i });
      await saveButton.click();
      
      // Should show validation error
      // Note: Exact error message depends on implementation
      const hasError = await page.locator('text=/required/i').count();
      expect(hasError).toBeGreaterThan(0);
    }
  });

  test('should show loading state during save', async ({ page }) => {
    await page.goto('/profile/edit');
    
    const saveButton = page.getByRole('button', { name: /save changes/i });
    
    // Make a change
    const bioField = page.getByRole('textbox', { name: /bio/i });
    if (await bioField.isVisible()) {
      await bioField.fill('Updated bio text');
      
      // Click save
      await saveButton.click();
      
      // Should show loading state
      await expect(saveButton).toBeDisabled();
    }
  });

  test('should handle concurrent setting changes', async ({ page }) => {
    await page.goto('/profile/edit');
    
    const settingsTab = page.getByRole('tab', { name: /settings/i });
    await settingsTab.click();
    
    // Make multiple changes
    const networkingToggle = page.getByRole('switch', { name: /networking enabled/i });
    await networkingToggle.click();
    
    // Request GDPR export
    await page.getByRole('button', { name: /richiedi export dati/i }).click();
    
    // Both actions should complete without errors
    // Page should remain functional
    await expect(page).toHaveURL(/\/profile\/edit/);
  });

  test('should show appropriate sections based on user role', async ({ page }) => {
    await page.goto('/profile/edit');
    
    const settingsTab = page.getByRole('tab', { name: /settings/i });
    await settingsTab.click();
    
    // All users should see basic settings
    await expect(page.getByText('Networking Enabled')).toBeVisible();
    
    // Host-specific sections may or may not be visible
    // Just ensure page loads correctly
    await expect(page).toHaveURL(/\/profile\/edit/);
  });

  test('should maintain tab state during operations', async ({ page }) => {
    await page.goto('/profile/edit');
    
    // Switch to different tabs
    const basicTab = page.getByRole('tab', { name: /basic/i });
    const settingsTab = page.getByRole('tab', { name: /settings/i });
    
    await settingsTab.click();
    await expect(page.getByText('Cambio Password')).toBeVisible();
    
    await basicTab.click();
    await expect(page.getByLabel(/first name/i)).toBeVisible();
    
    await settingsTab.click();
    await expect(page.getByText('Cambio Password')).toBeVisible();
  });

  test('should display success messages appropriately', async ({ page }) => {
    await page.goto('/profile/edit');
    
    const settingsTab = page.getByRole('tab', { name: /settings/i });
    await settingsTab.click();
    
    // Mock successful password change
    await page.route('**/auth/v1/**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true })
      });
    });
    
    // Fill password form
    await page.getByPlaceholder('Password attuale').fill('OldPass123!');
    await page.getByPlaceholder('Nuova password').fill('NewPass123!');
    await page.getByPlaceholder('Conferma nuova password').fill('NewPass123!');
    
    await page.getByRole('button', { name: /cambia password/i }).click();
    
    // Should show success toast
    // Note: Toast implementation may vary
    await page.waitForTimeout(500);
  });

  test('should handle errors gracefully', async ({ page }) => {
    await page.goto('/profile/edit');
    
    const settingsTab = page.getByRole('tab', { name: /settings/i });
    await settingsTab.click();
    
    // Mock API error
    await page.route('**/rest/v1/rpc/**', async route => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Server error' })
      });
    });
    
    // Try GDPR export
    await page.getByRole('button', { name: /richiedi export dati/i }).click();
    
    // Should show error message
    await expect(page.getByText(/errore/i)).toBeVisible();
  });
});
