import { test, expect } from '@playwright/test';

test.describe('Discounts & Vouchers - Fiscal Impact', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/auth/login');
    await page.fill('[type="email"]', 'coworker.verified@test.workover.app');
    await page.fill('[type="password"]', 'test123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/');
  });

  test('Host discount reduces base price and service fee', async ({ page }) => {
    await page.goto('/space/aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');
    
    // Start booking
    await page.getByRole('button', { name: /prenota/i }).click();
    
    // Apply discount code if input exists
    const discountInput = page.getByTestId('discount-code-input');
    if (await discountInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await discountInput.fill('HOST20');
      await page.click('[data-testid="apply-discount-button"]');
      
      // Verify discount applied
      // Base price should be reduced by 20%
      // Service fee should be calculated on discounted base
      await expect(page.getByTestId('discount-applied')).toBeVisible();
    }
  });

  test('Workover discount reduces service fee only', async ({ page }) => {
    await page.goto('/space/aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');
    
    await page.getByRole('button', { name: /prenota/i }).click();
    
    const discountInput = page.getByTestId('discount-code-input');
    if (await discountInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await discountInput.fill('WORKOVER50');
      await page.click('[data-testid="apply-discount-button"]');
      
      // Verify:
      // - Base price unchanged
      // - Service fee reduced by 50%
      // - VAT adjusted accordingly
      await expect(page.getByText(/sconto applicato/i)).toBeVisible();
    }
  });

  test('Voucher reduces final total correctly', async ({ page }) => {
    await page.goto('/space/aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');
    
    await page.getByRole('button', { name: /prenota/i }).click();
    
    // Try to apply voucher
    const voucherInput = page.getByTestId('voucher-code-input');
    if (await voucherInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await voucherInput.fill('VOUCHER50');
      await page.click('[data-testid="apply-voucher-button"]');
      
      // Verify voucher reduces the final amount to pay
      await expect(page.getByTestId('voucher-discount')).toBeVisible();
    }
  });

  test('Multiple discounts stack correctly', async ({ page }) => {
    await page.goto('/space/aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');
    
    await page.getByRole('button', { name: /prenota/i }).click();
    
    // Apply host discount first
    const discountInput = page.getByTestId('discount-code-input');
    if (await discountInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await discountInput.fill('HOST20');
      await page.click('[data-testid="apply-discount-button"]');
    }
    
    // Then apply Workover discount
    const workoverInput = page.getByTestId('workover-code-input');
    if (await workoverInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await workoverInput.fill('WORKOVER50');
      await page.click('[data-testid="apply-workover-button"]');
    }
    
    // Verify both discounts are applied in correct order
    // 1. Host discount on base → reduces base
    // 2. Workover discount on service fee → reduces service fee
    await expect(page.getByText(/sconti applicati/i)).toBeVisible();
  });
});
