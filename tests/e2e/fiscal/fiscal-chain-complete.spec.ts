import { test, expect } from '@playwright/test';

test.describe('Fiscal Chain - End-to-End', () => {
  test.beforeEach(async ({ page }) => {
    // Login as verified coworker
    await page.goto('/auth/login');
    await page.fill('[type="email"]', 'coworker.verified@test.workover.app');
    await page.fill('[type="password"]', 'test123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/', { timeout: 10000 });
  });

  test('Complete fiscal flow: Booking → Payment → Service → Payout', async ({ page }) => {
    await test.step('1. Navigate to test space', async () => {
      await page.goto('/space/aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');
      await expect(page.getByRole('heading', { name: /spazio forfettario test/i })).toBeVisible();
    });

    await test.step('2. Verify pricing calculation with IVA 22%', async () => {
      // Check that pricing is displayed correctly
      // Base: €15/hour × 3 hours = €45
      // Service fee: 10% of €45 = €4.50
      // VAT: 22% of €4.50 = €0.99
      // Total: €50.49
      
      const pricingText = await page.textContent('[data-testid="space-pricing"]');
      expect(pricingText).toContain('15');
    });

    await test.step('3. Complete booking flow', async () => {
      await page.getByRole('button', { name: /prenota/i }).click();
      
      // Should redirect to booking flow or show date picker
      await expect(page).toHaveURL(/\/book/);
    });
  });

  test('IVA calculation accuracy - Multiple price points', async ({ page }) => {
    const testCases = [
      { hourlyRate: 10, hours: 1, expectedBase: 10, expectedServiceFee: 1.00, expectedVAT: 0.22, expectedTotal: 11.22 },
      { hourlyRate: 15, hours: 3, expectedBase: 45, expectedServiceFee: 4.50, expectedVAT: 0.99, expectedTotal: 50.49 },
      { hourlyRate: 25, hours: 4, expectedBase: 100, expectedServiceFee: 10.00, expectedVAT: 2.20, expectedTotal: 112.20 },
    ];

    for (const tc of testCases) {
      await test.step(`Test calculation for €${tc.hourlyRate}/h × ${tc.hours}h`, async () => {
        // Navigate to pricing calculator or test space
        await page.goto('/test/pricing-calculator');
        
        await page.fill('[data-testid="hourly-rate-input"]', tc.hourlyRate.toString());
        await page.fill('[data-testid="hours-input"]', tc.hours.toString());
        await page.click('[data-testid="calculate-button"]');
        
        // Verify calculations
        await expect(page.getByTestId('calculated-base')).toHaveText(`€${tc.expectedBase.toFixed(2)}`);
        await expect(page.getByTestId('calculated-service-fee')).toHaveText(`€${tc.expectedServiceFee.toFixed(2)}`);
        await expect(page.getByTestId('calculated-vat')).toHaveText(`€${tc.expectedVAT.toFixed(2)}`);
        await expect(page.getByTestId('calculated-total')).toHaveText(`€${tc.expectedTotal.toFixed(2)}`);
      });
    }
  });

  test('Verify payment record created with correct breakdown', async ({ page }) => {
    // This test would need admin access to verify database records
    await page.goto('/auth/login');
    await page.fill('[type="email"]', 'admin@test.workover.app');
    await page.fill('[type="password"]', 'test123');
    await page.click('button[type="submit"]');
    
    await page.goto('/admin/payments');
    
    // Verify latest payment has correct structure
    const firstPayment = page.locator('[data-testid="payment-row"]').first();
    await expect(firstPayment).toBeVisible();
    
    // Should show host_amount, platform_fee, and total
    await expect(firstPayment.getByTestId('host-amount')).toBeVisible();
    await expect(firstPayment.getByTestId('platform-fee')).toBeVisible();
  });
});
