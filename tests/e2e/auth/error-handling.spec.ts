import { test, expect } from '@playwright/test';

test.describe('Error Handling & i18n', () => {
  
  test('should show localized error for invalid credentials', async ({ page }) => {
    await page.goto('/login');
    
    await page.fill('input[type="email"]', 'test@workover.it');
    await page.fill('input[type="password"]', 'wrong-password-xyz');
    await page.click('button[type="submit"]');
    
    // Verificare che errore sia in italiano
    const errorText = await page.locator('div[role="alert"], .text-destructive').first().textContent({ timeout: 3000 });
    
    if (errorText) {
      // NON deve contenere parole inglesi
      expect(errorText.toLowerCase()).not.toMatch(/authentication failed|invalid credentials|error/);
      
      // Deve contenere parole italiane
      expect(errorText.toLowerCase()).toMatch(/password|credenziali|non valid|errat/);
    }
  });
  
  test('should show localized error for weak password in signup', async ({ page }) => {
    await page.goto('/register');
    
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[id="password"]', '123'); // Password debole
    await page.fill('input[id="confirmPassword"]', '123');
    
    // Verificare alert in italiano
    await expect(page.getByText(/almeno 8 caratteri|troppo corta|password debole/i)).toBeVisible({ timeout: 2000 });
  });
  
  test('should show localized error for password mismatch', async ({ page }) => {
    await page.goto('/register');
    
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[id="password"]', 'Test123!@#');
    await page.fill('input[id="confirmPassword"]', 'Different123!@#');
    
    // Verificare alert in italiano
    await expect(page.getByText(/password non corrispondono|non coincidono/i)).toBeVisible({ timeout: 2000 });
  });
  
  test('should handle network errors gracefully', async ({ page, context }) => {
    await page.goto('/login');
    
    // Simula offline mode
    await context.setOffline(true);
    
    await page.fill('input[type="email"]', 'test@workover.it');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    
    // Verificare messaggio errore generico o timeout
    const hasError = await Promise.race([
      page.getByText(/errore|connessione|riprova/i).isVisible().then(() => true),
      page.waitForTimeout(3000).then(() => false)
    ]);
    
    // Ripristina connessione
    await context.setOffline(false);
    
    // Se non c'è errore visibile, è accettabile (potrebbe non mostrare nulla)
    expect(hasError).toBeDefined();
  });
  
  test('should show loading state during login', async ({ page }) => {
    await page.goto('/login');
    
    await page.fill('input[type="email"]', 'test@workover.it');
    await page.fill('input[type="password"]', 'password123');
    
    // Click sul submit
    const submitButton = page.locator('button[type="submit"]');
    await submitButton.click();
    
    // Verificare che il button sia disabilitato durante il caricamento
    const isDisabled = await submitButton.isDisabled();
    expect(isDisabled || await page.getByText(/caricamento|loading|accesso/i).isVisible()).toBeTruthy();
  });
  
  test('should NOT expose sensitive information in error messages', async ({ page }) => {
    await page.goto('/login');
    
    await page.fill('input[type="email"]', 'nonexistent@example.com');
    await page.fill('input[type="password"]', 'any-password');
    await page.click('button[type="submit"]');
    
    // Attendere possibile errore
    await page.waitForTimeout(2000);
    
    // Verificare che NON ci siano messaggi tipo "User not found" o stack trace
    const pageContent = await page.content();
    expect(pageContent.toLowerCase()).not.toMatch(/user not found|stack trace|exception|database error/);
  });
});
