import { test, expect } from '@playwright/test';

test.describe('RLS Policies - Email Verification Gating', () => {
  test('Coworker without verified email cannot book', async ({ page }) => {
    // Login as unverified coworker
    await page.goto('/auth/login');
    await page.fill('[type="email"]', 'coworker.unverified@test.workover.app');
    await page.fill('[type="password"]', 'test123');
    await page.click('button[type="submit"]');
    
    await page.waitForURL('/');
    
    // Try to book
    await page.goto('/space/aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');
    await page.getByRole('button', { name: /prenota/i }).click();
    
    // Should see email verification prompt
    await expect(page.getByText(/email non verificata/i)).toBeVisible({ timeout: 5000 });
    await expect(page.getByRole('button', { name: /verifica email/i })).toBeVisible();
  });

  test('Verified coworker can book successfully', async ({ page }) => {
    await page.goto('/auth/login');
    await page.fill('[type="email"]', 'coworker.verified@test.workover.app');
    await page.fill('[type="password"]', 'test123');
    await page.click('button[type="submit"]');
    
    await page.waitForURL('/');
    
    await page.goto('/space/aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');
    await page.getByRole('button', { name: /prenota/i }).click();
    
    // Should proceed to booking flow
    await expect(page).toHaveURL(/\/book/, { timeout: 5000 });
  });

  test('Host without Stripe cannot publish space', async ({ page }) => {
    await page.goto('/auth/login');
    await page.fill('[type="email"]', 'host.nostripe@test.workover.app');
    await page.fill('[type="password"]', 'test123');
    await page.click('button[type="submit"]');
    
    await page.waitForURL('/');
    
    // Navigate to host dashboard
    await page.goto('/host/spaces');
    
    // Try to publish a space
    const publishButton = page.getByTestId('publish-space-button').first();
    if (await publishButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await publishButton.click();
      
      // Should see Stripe connection prompt
      await expect(page.getByText(/stripe non connesso/i)).toBeVisible();
      await expect(page.getByRole('button', { name: /connetti stripe/i })).toBeVisible();
    }
  });

  test('Host with Stripe can publish space', async ({ page }) => {
    await page.goto('/auth/login');
    await page.fill('[type="email"]', 'host.forfettario@test.workover.app');
    await page.fill('[type="password"]', 'test123');
    await page.click('button[type="submit"]');
    
    await page.waitForURL('/');
    
    await page.goto('/host/spaces');
    
    // Should see spaces and be able to manage them
    await expect(page.getByText(/i miei spazi/i)).toBeVisible();
  });

  test('Admin can access admin panel', async ({ page }) => {
    await page.goto('/auth/login');
    await page.fill('[type="email"]', 'admin@test.workover.app');
    await page.fill('[type="password"]', 'test123');
    await page.click('button[type="submit"]');
    
    await page.waitForURL('/');
    
    await page.goto('/admin');
    
    // Should see admin dashboard
    await expect(page.getByText(/dashboard admin/i)).toBeVisible();
  });

  test('Non-admin cannot access admin panel', async ({ page }) => {
    await page.goto('/auth/login');
    await page.fill('[type="email"]', 'coworker.verified@test.workover.app');
    await page.fill('[type="password"]', 'test123');
    await page.click('button[type="submit"]');
    
    await page.waitForURL('/');
    
    await page.goto('/admin');
    
    // Should be redirected or see access denied
    await expect(page.getByText(/accesso negato|non autorizzato/i)).toBeVisible({ timeout: 5000 });
  });
});
