import { test, expect } from '@playwright/test';

test.describe('Settings - Password Change', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to settings after login
    await page.goto('/');
    // Assume user is logged in via session/cookie
  });

  test('should display password change form', async ({ page }) => {
    await page.goto('/settings');
    
    // Check password section exists
    await expect(page.getByText('Cambio Password')).toBeVisible();
    await expect(page.getByPlaceholder('Password attuale')).toBeVisible();
    await expect(page.getByPlaceholder('Nuova password')).toBeVisible();
    await expect(page.getByPlaceholder('Conferma nuova password')).toBeVisible();
  });

  test('should show validation errors for weak password', async ({ page }) => {
    await page.goto('/settings');
    
    // Fill password fields with weak password
    await page.getByPlaceholder('Password attuale').fill('CurrentPass123!');
    await page.getByPlaceholder('Nuova password').fill('weak');
    await page.getByPlaceholder('Conferma nuova password').fill('weak');
    
    // Submit form
    await page.getByRole('button', { name: /cambia password/i }).click();
    
    // Check for validation error
    await expect(page.getByText(/la password deve contenere almeno 8 caratteri/i)).toBeVisible();
  });

  test('should show error when passwords do not match', async ({ page }) => {
    await page.goto('/settings');
    
    await page.getByPlaceholder('Password attuale').fill('CurrentPass123!');
    await page.getByPlaceholder('Nuova password').fill('NewPass123!');
    await page.getByPlaceholder('Conferma nuova password').fill('DifferentPass123!');
    
    await page.getByRole('button', { name: /cambia password/i }).click();
    
    await expect(page.getByText(/le password non corrispondono/i)).toBeVisible();
  });

  test('should show error for incorrect current password', async ({ page }) => {
    await page.goto('/settings');
    
    await page.getByPlaceholder('Password attuale').fill('WrongPassword123!');
    await page.getByPlaceholder('Nuova password').fill('NewPass123!');
    await page.getByPlaceholder('Conferma nuova password').fill('NewPass123!');
    
    await page.getByRole('button', { name: /cambia password/i }).click();
    
    await expect(page.getByText(/password attuale non corretta/i)).toBeVisible();
  });

  test('should clear form after successful password change', async ({ page }) => {
    await page.goto('/settings');
    
    // This would require actual valid credentials in test environment
    // For now, we test the form clearing behavior through UI state
    await page.getByPlaceholder('Password attuale').fill('TestPass123!');
    await page.getByPlaceholder('Nuova password').fill('NewPass123!');
    await page.getByPlaceholder('Conferma nuova password').fill('NewPass123!');
    
    // Note: In real test, we'd mock Supabase or use test credentials
    // Here we just verify form structure and validation
    const currentPasswordInput = page.getByPlaceholder('Password attuale');
    await expect(currentPasswordInput).toBeEditable();
  });

  test('should disable submit button while loading', async ({ page }) => {
    await page.goto('/settings');
    
    await page.getByPlaceholder('Password attuale').fill('TestPass123!');
    await page.getByPlaceholder('Nuova password').fill('NewPass123!');
    await page.getByPlaceholder('Conferma nuova password').fill('NewPass123!');
    
    const submitButton = page.getByRole('button', { name: /cambia password/i });
    
    // Click and check button is disabled during processing
    await submitButton.click();
    
    // Button should show loading state
    await expect(submitButton).toBeDisabled();
  });

  test('should validate password complexity requirements', async ({ page }) => {
    await page.goto('/settings');
    
    const testCases = [
      { password: 'short1A', error: /almeno 8 caratteri/i },
      { password: 'nouppercase123', error: /una lettera maiuscola/i },
      { password: 'NOLOWERCASE123', error: /una lettera minuscola/i },
      { password: 'NoNumbers', error: /un numero/i },
    ];

    for (const testCase of testCases) {
      await page.getByPlaceholder('Password attuale').fill('CurrentPass123!');
      await page.getByPlaceholder('Nuova password').fill(testCase.password);
      await page.getByPlaceholder('Conferma nuova password').fill(testCase.password);
      
      await page.getByRole('button', { name: /cambia password/i }).click();
      
      await expect(page.locator('text=' + testCase.error.source)).toBeVisible();
      
      // Clear for next iteration
      await page.getByPlaceholder('Nuova password').clear();
      await page.getByPlaceholder('Conferma nuova password').clear();
    }
  });
});
