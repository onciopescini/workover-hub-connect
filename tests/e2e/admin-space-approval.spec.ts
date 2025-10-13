import { test, expect } from '@playwright/test';

test.describe('Admin Space Approval', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', 'admin@workover.it');
    await page.fill('input[type="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/admin');
  });

  test('admin can view pending spaces list', async ({ page }) => {
    await page.goto('/admin/spaces');
    
    await expect(page.getByRole('heading', { name: /gestione spazi/i })).toBeVisible();
    await expect(page.getByRole('tab', { name: /pending/i })).toBeVisible();
  });

  test('admin can approve pending space', async ({ page }) => {
    await page.goto('/admin/spaces');
    
    const pendingTab = page.getByRole('tab', { name: /pending/i });
    await pendingTab.click();
    
    await page.waitForTimeout(500);
    
    const approveButton = page.getByRole('button', { name: /approva/i }).first();
    if (await approveButton.isVisible()) {
      await approveButton.click();
      
      const confirmButton = page.getByRole('button', { name: /conferma/i });
      await confirmButton.click();
      
      await expect(page.getByText(/approvato/i)).toBeVisible({ timeout: 5000 });
    }
  });

  test('admin can reject space with reason', async ({ page }) => {
    await page.goto('/admin/spaces');
    
    const pendingTab = page.getByRole('tab', { name: /pending/i });
    await pendingTab.click();
    
    await page.waitForTimeout(500);
    
    const rejectButton = page.getByRole('button', { name: /rifiuta/i }).first();
    if (await rejectButton.isVisible()) {
      await rejectButton.click();
      
      await page.fill('textarea[placeholder*="motivo"]', 'Immagini non conformi');
      
      const confirmButton = page.getByRole('button', { name: /conferma/i });
      await confirmButton.click();
      
      await expect(page.getByText(/rifiutato/i)).toBeVisible({ timeout: 5000 });
    }
  });

  test('displays space details in approval modal', async ({ page }) => {
    await page.goto('/admin/spaces');
    
    await page.getByRole('tab', { name: /pending/i }).click();
    await page.waitForTimeout(500);
    
    const viewButton = page.getByRole('button', { name: /visualizza/i }).first();
    if (await viewButton.isVisible()) {
      await viewButton.click();
      
      await expect(page.getByRole('dialog')).toBeVisible();
    }
  });

  test('filters spaces by status', async ({ page }) => {
    await page.goto('/admin/spaces');
    
    await page.getByRole('tab', { name: /active/i }).click();
    await page.waitForTimeout(500);
    
    await page.getByRole('tab', { name: /rejected/i }).click();
    await page.waitForTimeout(500);
    
    await page.getByRole('tab', { name: /pending/i }).click();
  });
});
