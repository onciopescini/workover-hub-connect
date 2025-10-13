import { test, expect } from '@playwright/test';

test.describe('Admin Security Flows E2E', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to login page
    await page.goto('/login');
  });

  test('admin can access admin dashboard', async ({ page }) => {
    // Login as admin
    await page.fill('input[name="email"]', 'admin@test.com');
    await page.fill('input[name="password"]', 'TestAdmin123!');
    await page.click('button[type="submit"]');

    // Wait for redirect
    await page.waitForURL('**/dashboard', { timeout: 10000 });

    // Navigate to admin dashboard
    await page.goto('/admin/dashboard');

    // Should see admin dashboard content
    await expect(page.locator('h1')).toContainText(/admin/i);
    
    // Should see admin-only sections
    await expect(page.locator('text=User Management')).toBeVisible();
    await expect(page.locator('text=System Settings')).toBeVisible();
  });

  test('admin can view users list', async ({ page }) => {
    // Login as admin
    await page.fill('input[name="email"]', 'admin@test.com');
    await page.fill('input[name="password"]', 'TestAdmin123!');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard', { timeout: 10000 });

    // Navigate to users management
    await page.goto('/admin/users');

    // Should see users table
    await expect(page.locator('table')).toBeVisible();
    await expect(page.locator('th:has-text("Email")')).toBeVisible();
    await expect(page.locator('th:has-text("Role")')).toBeVisible();
  });

  test('admin can assign moderator role', async ({ page }) => {
    // Login as admin
    await page.fill('input[name="email"]', 'admin@test.com');
    await page.fill('input[name="password"]', 'TestAdmin123!');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard', { timeout: 10000 });

    // Navigate to users management
    await page.goto('/admin/users');

    // Find a coworker user and assign moderator role
    const userRow = page.locator('tr:has-text("coworker@test.com")').first();
    await userRow.locator('button:has-text("Assign Role")').click();

    // Select moderator role
    await page.locator('select[name="role"]').selectOption('moderator');
    await page.locator('button:has-text("Confirm")').click();

    // Should see success message
    await expect(page.locator('text=/role assigned/i')).toBeVisible({ timeout: 5000 });
  });

  test('admin can suspend user account', async ({ page }) => {
    // Login as admin
    await page.fill('input[name="email"]', 'admin@test.com');
    await page.fill('input[name="password"]', 'TestAdmin123!');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard', { timeout: 10000 });

    // Navigate to users management
    await page.goto('/admin/users');

    // Find user and suspend
    const userRow = page.locator('tr:has-text("coworker@test.com")').first();
    await userRow.locator('button:has-text("Actions")').click();
    await page.locator('button:has-text("Suspend")').click();

    // Confirm suspension
    await page.fill('textarea[name="suspension_reason"]', 'Test suspension for security testing');
    await page.locator('button:has-text("Confirm Suspension")').click();

    // Should see success message
    await expect(page.locator('text=/suspended/i')).toBeVisible({ timeout: 5000 });

    // User should be marked as suspended
    await expect(userRow.locator('text=/suspended/i')).toBeVisible();
  });

  test('admin can approve pending spaces', async ({ page }) => {
    // Login as admin
    await page.fill('input[name="email"]', 'admin@test.com');
    await page.fill('input[name="password"]', 'TestAdmin123!');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard', { timeout: 10000 });

    // Navigate to spaces management
    await page.goto('/admin/spaces');

    // Filter pending approval
    await page.locator('button:has-text("Pending Approval")').click();

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

  test('admin can view admin action logs', async ({ page }) => {
    // Login as admin
    await page.fill('input[name="email"]', 'admin@test.com');
    await page.fill('input[name="password"]', 'TestAdmin123!');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard', { timeout: 10000 });

    // Navigate to logs
    await page.goto('/admin/logs');

    // Should see logs table
    await expect(page.locator('table')).toBeVisible();
    await expect(page.locator('th:has-text("Action")')).toBeVisible();
    await expect(page.locator('th:has-text("Admin")')).toBeVisible();
    await expect(page.locator('th:has-text("Timestamp")')).toBeVisible();

    // Should see log entries
    await expect(page.locator('tbody tr')).toHaveCount({ 
      greaterThan: 0 
    }, { timeout: 5000 });
  });

  test('admin can manage system settings', async ({ page }) => {
    // Login as admin
    await page.fill('input[name="email"]', 'admin@test.com');
    await page.fill('input[name="password"]', 'TestAdmin123!');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard', { timeout: 10000 });

    // Navigate to settings
    await page.goto('/admin/settings');

    // Should see settings sections
    await expect(page.locator('h2:has-text("General Settings")')).toBeVisible();
    await expect(page.locator('h2:has-text("Security Settings")')).toBeVisible();

    // Should be able to update a setting
    const settingInput = page.locator('input[name="platform_fee_percentage"]').first();
    if (await settingInput.isVisible()) {
      await settingInput.fill('5.5');
      await page.locator('button:has-text("Save Settings")').click();

      // Should see success message
      await expect(page.locator('text=/saved/i')).toBeVisible({ timeout: 5000 });
    }
  });

  test('admin session should timeout after inactivity', async ({ page }) => {
    // Login as admin
    await page.fill('input[name="email"]', 'admin@test.com');
    await page.fill('input[name="password"]', 'TestAdmin123!');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard', { timeout: 10000 });

    // Navigate to admin dashboard
    await page.goto('/admin/dashboard');
    await expect(page.locator('h1')).toContainText(/admin/i);

    // Simulate session expiration (in real scenario, this would be time-based)
    // Clear auth storage
    await page.evaluate(() => {
      localStorage.removeItem('supabase.auth.token');
      sessionStorage.clear();
    });

    // Try to access admin page
    await page.goto('/admin/users');

    // Should be redirected to login
    await expect(page).toHaveURL(/login/, { timeout: 5000 });
  });

  test('admin cannot access other admin sensitive data', async ({ page }) => {
    // Login as admin
    await page.fill('input[name="email"]', 'admin@test.com');
    await page.fill('input[name="password"]', 'TestAdmin123!');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard', { timeout: 10000 });

    // Navigate to users management
    await page.goto('/admin/users');

    // Find another admin user
    const adminRow = page.locator('tr:has-text("admin")').nth(1);

    // Should NOT see sensitive actions like "Delete Admin"
    await expect(adminRow.locator('button:has-text("Delete")')).not.toBeVisible();

    // Should NOT be able to revoke admin role
    if (await adminRow.locator('button:has-text("Actions")').isVisible()) {
      await adminRow.locator('button:has-text("Actions")').click();
      await expect(page.locator('button:has-text("Revoke Admin")')).not.toBeVisible();
    }
  });
});
