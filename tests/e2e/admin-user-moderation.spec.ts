import { test, expect } from '@playwright/test';

test.describe('Admin User Moderation', () => {
  test.beforeEach(async ({ page }) => {
    // Login as admin
    await page.goto('/login');
    await page.fill('input[type="email"]', 'admin@workover.it');
    await page.fill('input[type="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/admin');
  });

  test('admin can search and suspend user', async ({ page }) => {
    await page.goto('/admin/users');
    
    // Wait for user list to load
    await expect(page.getByRole('heading', { name: /gestione utenti/i })).toBeVisible();
    
    // Search for specific user
    await page.fill('input[placeholder*="cerca"]', 'user@example.com');
    await page.waitForTimeout(500);
    
    // Verify user appears in results
    await expect(page.getByText('user@example.com')).toBeVisible();
    
    // Click suspend button
    await page.click('button:has-text("Sospendi")');
    
    // Fill suspension reason
    await page.fill('textarea[placeholder*="motivo"]', 'Violazione termini di servizio');
    
    // Confirm suspension
    await page.click('button:has-text("Conferma")');
    
    // Verify success message
    await expect(page.getByText(/utente sospeso/i)).toBeVisible();
    
    // Verify user status changed
    await expect(page.getByText('suspended')).toBeVisible();
  });

  test('admin can reactivate suspended user', async ({ page }) => {
    await page.goto('/admin/users');
    
    // Filter suspended users
    await page.click('button:has-text("Sospesi")');
    
    // Wait for suspended users list
    await page.waitForTimeout(500);
    
    // Click reactivate button
    await page.click('button:has-text("Riattiva")');
    
    // Confirm reactivation
    await page.click('button:has-text("Conferma")');
    
    // Verify success message
    await expect(page.getByText(/utente riattivato/i)).toBeVisible();
  });

  test('admin can change user role', async ({ page }) => {
    await page.goto('/admin/users');
    
    // Find user and click role dropdown
    await page.click('button[aria-label="User actions"]').first();
    await page.click('text="Cambia ruolo"');
    
    // Select new role
    await page.click('select[name="role"]');
    await page.selectOption('select[name="role"]', 'host');
    
    // Confirm change
    await page.click('button:has-text("Salva")');
    
    // Verify success
    await expect(page.getByText(/ruolo aggiornato/i)).toBeVisible();
  });

  test('admin can view user activity log', async ({ page }) => {
    await page.goto('/admin/users');
    
    // Click on user row
    await page.click('tr:has-text("user@example.com")');
    
    // Verify activity log modal opens
    await expect(page.getByRole('heading', { name: /log attività/i })).toBeVisible();
    
    // Verify log entries
    await expect(page.getByText(/login/i)).toBeVisible();
  });

  test('displays user statistics correctly', async ({ page }) => {
    await page.goto('/admin/users');
    
    // Verify stat cards
    await expect(page.getByText(/utenti totali/i)).toBeVisible();
    await expect(page.getByText(/utenti attivi/i)).toBeVisible();
    await expect(page.getByText(/utenti sospesi/i)).toBeVisible();
  });
});
