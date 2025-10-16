import { test, expect } from '@playwright/test';

test.describe('Email/Password Authentication', () => {
  
  test('should register new user successfully', async ({ page }) => {
    await page.goto('/register');
    
    const timestamp = Date.now();
    const email = `test${timestamp}@example.com`;
    
    await page.fill('input[type="email"]', email);
    await page.fill('input[id="password"]', 'Test123!@#');
    await page.fill('input[id="confirmPassword"]', 'Test123!@#');
    
    await page.click('button[type="submit"]');
    
    // Verificare messaggio success o redirect
    await expect(page.getByText(/controlla la tua email|registrazione completata/i)).toBeVisible({ timeout: 5000 });
  });
  
  test('should show error for already registered email', async ({ page }) => {
    await page.goto('/register');
    
    // Email già registrata (assumendo che esista nel seed)
    await page.fill('input[type="email"]', 'host@workover.it');
    await page.fill('input[id="password"]', 'Test123!@#');
    await page.fill('input[id="confirmPassword"]', 'Test123!@#');
    
    await page.click('button[type="submit"]');
    
    // Verificare alert error localizzato
    await expect(page.getByText(/già registrat/i)).toBeVisible({ timeout: 5000 });
  });
  
  test('should login existing user', async ({ page }) => {
    await page.goto('/login');
    
    // Credenziali di test (assumendo seed data)
    await page.fill('input[type="email"]', 'test@workover.it');
    await page.fill('input[type="password"]', 'password123');
    
    await page.click('button[type="submit"]');
    
    // Verificare redirect o toast success
    await page.waitForURL(/\/(spaces|dashboard|onboarding)/, { timeout: 10000 });
  });
  
  test('should show error for wrong password', async ({ page }) => {
    await page.goto('/login');
    
    await page.fill('input[type="email"]', 'test@workover.it');
    await page.fill('input[type="password"]', 'wrong-password-123');
    
    await page.click('button[type="submit"]');
    
    // Verificare alert error localizzato
    const errorElement = page.locator('div[role="alert"], .text-destructive').first();
    await expect(errorElement).toBeVisible({ timeout: 3000 });
    
    // NON deve fare redirect
    await expect(page).toHaveURL('/login');
  });
  
  test('should show localized error for weak password in signup', async ({ page }) => {
    await page.goto('/register');
    
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[id="password"]', '123'); // Password debole
    await page.fill('input[id="confirmPassword"]', '123');
    
    // Verificare alert in italiano
    await expect(page.getByText(/almeno 8 caratteri/i)).toBeVisible({ timeout: 2000 });
  });
  
  test('should show localized error for password mismatch', async ({ page }) => {
    await page.goto('/register');
    
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[id="password"]', 'Test123!@#');
    await page.fill('input[id="confirmPassword"]', 'Different123!@#');
    
    // Verificare alert in italiano
    await expect(page.getByText(/password non corrispondono/i)).toBeVisible({ timeout: 2000 });
  });
  
  test('should show loading state during login', async ({ page }) => {
    await page.goto('/login');
    
    await page.fill('input[type="email"]', 'test@workover.it');
    await page.fill('input[type="password"]', 'password123');
    
    // Click e verificare elemento di loading
    const submitButton = page.locator('button[type="submit"]');
    await submitButton.click();
    
    // Verificare che il button sia disabilitato o mostri loading
    await expect(submitButton).toBeDisabled().or(expect(page.getByText(/caricamento|loading/i)).toBeVisible());
  });
});
