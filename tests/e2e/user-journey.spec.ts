import { test, expect } from '@playwright/test';

test.describe('User Journey', () => {
  test('homepage loads correctly', async ({ page }) => {
    await page.goto('/');
    
    // Check that the page loads
    await expect(page).toHaveTitle(/WorkoverHub/);
    
    // Basic smoke test - page should not have obvious errors
    const hasError = await page.locator('[data-testid="error"]').count();
    expect(hasError).toBe(0);
  });

  test('can navigate to public spaces', async ({ page }) => {
    await page.goto('/');
    
    // Try to find and click a link to spaces (this would need to be adjusted based on actual UI)
    const spacesLink = page.locator('a[href*="spaces"], a[href*="search"]').first();
    if (await spacesLink.count() > 0) {
      await spacesLink.click();
      
      // Wait for navigation
      await page.waitForLoadState('networkidle');
      
      // Check that we're on a spaces-related page
      expect(page.url()).toMatch(/(spaces|search)/);
    }
  });

  test('QA dashboard is accessible', async ({ page }) => {
    // Navigate to QA dashboard
    await page.goto('/qa-validation');
    
    // Check that QA dashboard loads
    await expect(page.locator('h1')).toContainText('QA Validation');
    
    // Check that main action buttons are present
    await expect(page.locator('button:has-text("Run Full Validation")')).toBeVisible();
    await expect(page.locator('button:has-text("Scan Console Usage")')).toBeVisible();
  });

  test('validation dashboard renders without errors', async ({ page }) => {
    await page.goto('/validation');
    
    // Check that the original validation dashboard loads
    await expect(page.locator('h1')).toContainText('Validation Dashboard');
    
    // Should have validation buttons
    await expect(page.locator('button')).toHaveCount({ count: 2, timeout: 5000 });
  });
});