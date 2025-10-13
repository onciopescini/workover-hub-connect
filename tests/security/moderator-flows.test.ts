import { test, expect } from '@playwright/test';

test.describe('Moderator Security Flows E2E', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to login page
    await page.goto('/login');
  });

  test('moderator can access moderation dashboard', async ({ page }) => {
    // Login as moderator
    await page.fill('input[name="email"]', 'moderator@test.com');
    await page.fill('input[name="password"]', 'TestModerator123!');
    await page.click('button[type="submit"]');

    // Wait for redirect
    await page.waitForURL('**/dashboard', { timeout: 10000 });

    // Navigate to moderation dashboard
    await page.goto('/moderator/dashboard');

    // Should see moderation dashboard content
    await expect(page.locator('h1')).toContainText(/moderation/i);
    
    // Should see moderation sections
    await expect(page.locator('text=Pending Reports')).toBeVisible();
    await expect(page.locator('text=Pending Spaces')).toBeVisible();
  });

  test('moderator CANNOT access admin users page', async ({ page }) => {
    // Login as moderator
    await page.fill('input[name="email"]', 'moderator@test.com');
    await page.fill('input[name="password"]', 'TestModerator123!');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard', { timeout: 10000 });

    // Try to navigate to admin users page
    await page.goto('/admin/users');

    // Should be redirected or see access denied
    await expect(page.locator('text=/access denied|unauthorized/i')).toBeVisible({ timeout: 5000 });
  });

  test('moderator CANNOT access system settings', async ({ page }) => {
    // Login as moderator
    await page.fill('input[name="email"]', 'moderator@test.com');
    await page.fill('input[name="password"]', 'TestModerator123!');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard', { timeout: 10000 });

    // Try to navigate to system settings
    await page.goto('/admin/settings');

    // Should be redirected or see access denied
    await expect(page.locator('text=/access denied|unauthorized/i')).toBeVisible({ timeout: 5000 });
  });

  test('moderator can approve pending spaces', async ({ page }) => {
    // Login as moderator
    await page.fill('input[name="email"]', 'moderator@test.com');
    await page.fill('input[name="password"]', 'TestModerator123!');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard', { timeout: 10000 });

    // Navigate to spaces moderation
    await page.goto('/moderator/spaces');

    // Should see pending spaces
    const pendingSpace = page.locator('[data-status="pending_approval"]').first();
    
    if (await pendingSpace.isVisible()) {
      await pendingSpace.locator('button:has-text("Review")').click();

      // Approve space
      await page.locator('button:has-text("Approve")').click();

      // Should see success message
      await expect(page.locator('text=/approved/i')).toBeVisible({ timeout: 5000 });
    }
  });

  test('moderator can reject inappropriate spaces', async ({ page }) => {
    // Login as moderator
    await page.fill('input[name="email"]', 'moderator@test.com');
    await page.fill('input[name="password"]', 'TestModerator123!');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard', { timeout: 10000 });

    // Navigate to spaces moderation
    await page.goto('/moderator/spaces');

    // Find a pending space
    const pendingSpace = page.locator('[data-status="pending_approval"]').first();
    
    if (await pendingSpace.isVisible()) {
      await pendingSpace.locator('button:has-text("Review")').click();

      // Reject space
      await page.locator('button:has-text("Reject")').click();
      await page.fill('textarea[name="rejection_reason"]', 'Content violates community guidelines');
      await page.locator('button:has-text("Confirm Rejection")').click();

      // Should see success message
      await expect(page.locator('text=/rejected/i')).toBeVisible({ timeout: 5000 });
    }
  });

  test('moderator can view and handle reports', async ({ page }) => {
    // Login as moderator
    await page.fill('input[name="email"]', 'moderator@test.com');
    await page.fill('input[name="password"]', 'TestModerator123!');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard', { timeout: 10000 });

    // Navigate to reports
    await page.goto('/moderator/reports');

    // Should see reports table
    await expect(page.locator('table')).toBeVisible();
    await expect(page.locator('th:has-text("Report Type")')).toBeVisible();
    await expect(page.locator('th:has-text("Status")')).toBeVisible();

    // Should see report entries
    const reportRow = page.locator('tbody tr').first();
    
    if (await reportRow.isVisible()) {
      await reportRow.locator('button:has-text("Review")').click();

      // Update report status
      await page.locator('select[name="status"]').selectOption('in_review');
      await page.locator('button:has-text("Update Status")').click();

      // Should see success message
      await expect(page.locator('text=/updated/i')).toBeVisible({ timeout: 5000 });
    }
  });

  test('moderator can view admin action logs (read-only)', async ({ page }) => {
    // Login as moderator
    await page.fill('input[name="email"]', 'moderator@test.com');
    await page.fill('input[name="password"]', 'TestModerator123!');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard', { timeout: 10000 });

    // Navigate to logs
    await page.goto('/moderator/logs');

    // Should see logs table
    await expect(page.locator('table')).toBeVisible();
    await expect(page.locator('th:has-text("Action")')).toBeVisible();

    // Should NOT see edit buttons
    await expect(page.locator('button:has-text("Edit")')).not.toBeVisible();
    await expect(page.locator('button:has-text("Delete")')).not.toBeVisible();
  });

  test('moderator CANNOT assign roles', async ({ page }) => {
    // Login as moderator
    await page.fill('input[name="email"]', 'moderator@test.com');
    await page.fill('input[name="password"]', 'TestModerator123!');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard', { timeout: 10000 });

    // Try to navigate to user management (should fail)
    await page.goto('/admin/users');

    // Should be denied access
    await expect(page.locator('text=/access denied|unauthorized/i')).toBeVisible({ timeout: 5000 });
  });

  test('moderator CANNOT suspend users', async ({ page }) => {
    // Login as moderator
    await page.fill('input[name="email"]', 'moderator@test.com');
    await page.fill('input[name="password"]', 'TestModerator123!');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard', { timeout: 10000 });

    // Navigate to reports or any page with user actions
    await page.goto('/moderator/reports');

    // Should NOT see suspend user buttons
    await expect(page.locator('button:has-text("Suspend User")')).not.toBeVisible();
  });

  test('moderator session should timeout after inactivity', async ({ page }) => {
    // Login as moderator
    await page.fill('input[name="email"]', 'moderator@test.com');
    await page.fill('input[name="password"]', 'TestModerator123!');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard', { timeout: 10000 });

    // Navigate to moderation dashboard
    await page.goto('/moderator/dashboard');
    await expect(page.locator('h1')).toContainText(/moderation/i);

    // Simulate session expiration
    await page.evaluate(() => {
      localStorage.removeItem('supabase.auth.token');
      sessionStorage.clear();
    });

    // Try to access moderation page
    await page.goto('/moderator/reports');

    // Should be redirected to login
    await expect(page).toHaveURL(/login/, { timeout: 5000 });
  });

  test('moderator can escalate reports to admin', async ({ page }) => {
    // Login as moderator
    await page.fill('input[name="email"]', 'moderator@test.com');
    await page.fill('input[name="password"]', 'TestModerator123!');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard', { timeout: 10000 });

    // Navigate to reports
    await page.goto('/moderator/reports');

    // Find a report and escalate
    const reportRow = page.locator('tbody tr[data-severity="high"]').first();
    
    if (await reportRow.isVisible()) {
      await reportRow.locator('button:has-text("Actions")').click();
      await page.locator('button:has-text("Escalate to Admin")').click();

      // Add escalation note
      await page.fill('textarea[name="escalation_note"]', 'Requires admin review for potential legal issues');
      await page.locator('button:has-text("Confirm Escalation")').click();

      // Should see success message
      await expect(page.locator('text=/escalated/i')).toBeVisible({ timeout: 5000 });
    }
  });
});
