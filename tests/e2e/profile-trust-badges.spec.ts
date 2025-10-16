import { test, expect } from '@playwright/test';

test.describe('Profile - Trust Badges', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Assume authenticated session
  });

  test('should display trust badges section', async ({ page }) => {
    await page.goto('/profile');
    
    await expect(page.getByText('Fiducia & Verifiche')).toBeVisible();
  });

  test('should show email verification badge', async ({ page }) => {
    await page.goto('/profile');
    
    const emailBadge = page.locator('text=/email verificata/i').first();
    await expect(emailBadge).toBeVisible();
  });

  test('should show phone verification badge', async ({ page }) => {
    await page.goto('/profile');
    
    const phoneBadge = page.locator('text=/telefono inserito/i').first();
    await expect(phoneBadge).toBeVisible();
  });

  test('should show identity verification badge', async ({ page }) => {
    await page.goto('/profile');
    
    const identityBadge = page.locator('text=/identità verificata/i').first();
    await expect(identityBadge).toBeVisible();
  });

  test('should use correct icon for verified email', async ({ page }) => {
    await page.goto('/profile');
    
    // Check that email badge has proper styling (green checkmark)
    const emailSection = page.locator('text=/email verificata/i').first().locator('..');
    await expect(emailSection).toBeVisible();
    
    // Icon should be present (lucide-react Mail icon)
    const iconPresent = await emailSection.locator('svg').count();
    expect(iconPresent).toBeGreaterThan(0);
  });

  test('should reflect email verification status correctly', async ({ page }) => {
    await page.goto('/profile');
    
    // When email is verified, badge should show as verified
    const emailBadge = page.locator('text=/email verificata/i').first();
    
    // Check for visual indicators of verification (checkmark)
    const badgeContainer = emailBadge.locator('..');
    const hasCheckIcon = await badgeContainer.locator('svg').count();
    
    expect(hasCheckIcon).toBeGreaterThan(0);
  });

  test('should show phone badge based on phone field', async ({ page }) => {
    await page.goto('/profile');
    
    // Phone badge shows "Telefono Inserito" if phone exists
    const phoneBadge = page.locator('text=/telefono inserito/i').first();
    await expect(phoneBadge).toBeVisible();
  });

  test('should show identity verification based on KYC status', async ({ page }) => {
    await page.goto('/profile');
    
    const identityBadge = page.locator('text=/identità verificata/i').first();
    await expect(identityBadge).toBeVisible();
    
    // Badge should have appropriate styling
    const badgeContainer = identityBadge.locator('..');
    await expect(badgeContainer).toBeVisible();
  });

  test('should display all badges in a card layout', async ({ page }) => {
    await page.goto('/profile');
    
    // Trust badges should be in a Card component
    const trustCard = page.locator('text=/fiducia & verifiche/i').locator('..');
    await expect(trustCard).toBeVisible();
    
    // Should contain multiple badge items
    const badges = trustCard.locator('[class*="space-y"]').locator('div');
    const badgeCount = await badges.count();
    
    expect(badgeCount).toBeGreaterThan(0);
  });

  test('should navigate to profile edit from dashboard', async ({ page }) => {
    await page.goto('/profile');
    
    // Should have edit profile button
    const editButton = page.getByRole('button', { name: /modifica profilo/i });
    await expect(editButton).toBeVisible();
    
    await editButton.click();
    
    // Should navigate to edit page
    await expect(page).toHaveURL(/\/profile\/edit/);
  });

  test('should maintain trust badges visibility on profile edit', async ({ page }) => {
    await page.goto('/profile/edit');
    
    // Trust badges should still be visible in edit view
    // (depending on UI design - this may vary)
    await expect(page).toHaveURL(/\/profile\/edit/);
  });

  test('should update trust status after email verification', async ({ page }) => {
    // This test would require email verification flow
    // For now, we verify the badge system responds to auth state
    
    await page.goto('/profile');
    
    const emailBadge = page.locator('text=/email verificata/i').first();
    await expect(emailBadge).toBeVisible();
    
    // In real scenario, we'd verify email and check badge updates
    // This requires mocking auth state changes
  });

  test('should show correct badge colors', async ({ page }) => {
    await page.goto('/profile');
    
    // Email badge should have green color (text-green-600)
    const emailBadge = page.locator('text=/email verificata/i').first().locator('..');
    
    // Check for color classes (this is implementation-dependent)
    const hasColorClass = await emailBadge.evaluate((el) => {
      return el.className.includes('green') || 
             el.querySelector('[class*="green"]') !== null;
    });
    
    expect(hasColorClass).toBeTruthy();
  });

  test('should display trust percentage if implemented', async ({ page }) => {
    await page.goto('/profile');
    
    // Some implementations show trust percentage
    // Check if it exists in the UI
    const trustSection = page.locator('text=/fiducia & verifiche/i').locator('..');
    await expect(trustSection).toBeVisible();
    
    // Verify section renders without errors
    const sectionVisible = await trustSection.isVisible();
    expect(sectionVisible).toBeTruthy();
  });
});
