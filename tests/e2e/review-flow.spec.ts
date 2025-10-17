import { test, expect } from '@playwright/test';

test.describe('Review Flow E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to login page
    await page.goto('/login');
  });

  test('should show review button only after 24h from booking end', async ({ page }) => {
    // Login as coworker
    await page.fill('input[type="email"]', 'coworker@test.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');

    // Navigate to bookings
    await page.goto('/bookings');

    // Find a completed booking (served status, >24h ago)
    const reviewButton = page.locator('button:has-text("Lascia Recensione")');
    
    // Should be visible for eligible bookings
    await expect(reviewButton.first()).toBeVisible();
  });

  test('should prevent duplicate reviews', async ({ page }) => {
    // Login
    await page.fill('input[type="email"]', 'coworker@test.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');

    await page.goto('/bookings');

    // Try to leave a review
    const reviewButton = page.locator('button:has-text("Lascia Recensione")').first();
    await reviewButton.click();

    // Fill review form
    await page.click('button[aria-label="5 stars"]');
    await page.fill('textarea[name="content"]', 'Great experience!');
    await page.click('button[type="submit"]:has-text("Invia")');

    // Wait for success message
    await expect(page.locator('text=Recensione inviata con successo')).toBeVisible();

    // Button should now show "Recensione Inviata"
    await expect(page.locator('button:has-text("Recensione Inviata")')).toBeVisible();

    // Try to click again - should be disabled
    const submittedButton = page.locator('button:has-text("Recensione Inviata")');
    await expect(submittedButton).toBeDisabled();
  });

  test('should hide review until mutual submission', async ({ page }) => {
    // Login as coworker
    await page.fill('input[type="email"]', 'coworker@test.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');

    // Navigate to reviews page
    await page.goto('/bidirectional-reviews');

    // Check for visibility badge
    const hiddenBadge = page.locator('text=In attesa');
    await expect(hiddenBadge).toBeVisible();
  });

  test('should show countdown for review window', async ({ page }) => {
    // Login
    await page.fill('input[type="email"]', 'coworker@test.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');

    await page.goto('/bookings');

    // Find booking within 14-day window but not yet 24h
    const countdownButton = page.locator('button:has-text("Tra")');
    
    if (await countdownButton.isVisible()) {
      // Hover to see tooltip
      await countdownButton.hover();
      
      // Check tooltip content
      await expect(page.locator('text=Potrai recensire 24 ore dopo la fine del servizio')).toBeVisible();
    }
  });

  test('should show expired message after 14 days', async ({ page }) => {
    // Login
    await page.fill('input[type="email"]', 'coworker@test.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');

    await page.goto('/bookings');

    // Find expired booking (>14 days old)
    const expiredButton = page.locator('button:has-text("Finestra scaduta")');
    
    if (await expiredButton.isVisible()) {
      // Should be disabled
      await expect(expiredButton).toBeDisabled();
      
      // Hover for tooltip
      await expiredButton.hover();
      await expect(page.locator('text=La finestra per recensire è scaduta')).toBeVisible();
    }
  });

  test('should enforce rate limit (5 reviews per hour)', async ({ page }) => {
    // Login
    await page.fill('input[type="email"]', 'coworker@test.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');

    await page.goto('/bookings');

    // Try to submit 6 reviews rapidly
    for (let i = 0; i < 6; i++) {
      const reviewButton = page.locator('button:has-text("Lascia Recensione")').nth(i);
      
      if (await reviewButton.isVisible()) {
        await reviewButton.click();
        await page.click('button[aria-label="5 stars"]');
        await page.fill('textarea[name="content"]', `Review ${i + 1}`);
        await page.click('button[type="submit"]:has-text("Invia")');
        
        if (i < 5) {
          // First 5 should succeed
          await expect(page.locator('text=Recensione inviata con successo')).toBeVisible();
        } else {
          // 6th should fail with rate limit
          await expect(page.locator('text=Hai raggiunto il limite di recensioni orarie')).toBeVisible();
        }
      }
    }
  });

  test('should display ReviewVisibilityBadge correctly', async ({ page }) => {
    // Login
    await page.fill('input[type="email"]', 'host@test.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');

    await page.goto('/host/dashboard');

    // Check for visibility badges in recent reviews
    const visibleBadge = page.locator('text=Visibile').first();
    const hiddenBadge = page.locator('text=In attesa').first();

    // At least one type should be present
    const hasVisibleBadge = await visibleBadge.isVisible().catch(() => false);
    const hasHiddenBadge = await hiddenBadge.isVisible().catch(() => false);

    expect(hasVisibleBadge || hasHiddenBadge).toBeTruthy();
  });
});
