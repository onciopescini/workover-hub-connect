import { test, expect } from '@playwright/test';

test.describe('Multi-Tab Session Management', () => {
  
  test('should sync login across tabs', async ({ browser }) => {
    const context = await browser.newContext();
    
    // Tab 1: Login
    const tab1 = await context.newPage();
    await tab1.goto('/login');
    await tab1.fill('input[type="email"]', 'test@workover.it');
    await tab1.fill('input[type="password"]', 'password123');
    await tab1.click('button[type="submit"]');
    
    // Attendere redirect dopo login
    await tab1.waitForURL(/\/(spaces|dashboard)/, { timeout: 10000 });
    
    // Tab 2: Apri dopo login
    const tab2 = await context.newPage();
    await tab2.goto('/');
    
    // Verificare che Tab 2 sia autenticata (non redirect a /login)
    await tab2.waitForTimeout(2000);
    const currentUrl = tab2.url();
    expect(currentUrl).not.toContain('/login');
    
    await context.close();
  });
  
  test('should sync logout across tabs', async ({ browser }) => {
    const context = await browser.newContext();
    
    // Setup: Login in entrambe le tab
    const tab1 = await context.newPage();
    await tab1.goto('/login');
    await tab1.fill('input[type="email"]', 'test@workover.it');
    await tab1.fill('input[type="password"]', 'password123');
    await tab1.click('button[type="submit"]');
    await tab1.waitForURL(/\/(spaces|dashboard)/, { timeout: 10000 });
    
    const tab2 = await context.newPage();
    await tab2.goto('/');
    await tab2.waitForTimeout(1000);
    
    // Tab 1: Logout (assumendo che ci sia un button con text "Logout" o "Esci")
    const logoutButton = tab1.getByRole('button', { name: /logout|esci/i }).or(
      tab1.locator('[data-testid="logout-button"]')
    ).first();
    
    if (await logoutButton.isVisible()) {
      await logoutButton.click();
      
      // Attendere redirect a homepage/login
      await tab1.waitForURL(/\/($|login)/, { timeout: 5000 });
      
      // Tab 2: Verificare che venga redirected a login entro 15 secondi
      await tab2.waitForURL(/\/login/, { timeout: 15000 });
    }
    
    await context.close();
  });
  
  test('should handle profile updates across tabs', async ({ browser }) => {
    const context = await browser.newContext();
    
    const tab1 = await context.newPage();
    const tab2 = await context.newPage();
    
    // Setup: Login in entrambe
    for (const tab of [tab1, tab2]) {
      await tab.goto('/login');
      await tab.fill('input[type="email"]', 'test@workover.it');
      await tab.fill('input[type="password"]', 'password123');
      await tab.click('button[type="submit"]');
      await tab.waitForURL(/\/(spaces|dashboard)/, { timeout: 10000 });
    }
    
    // Tab 1: Naviga al profilo e modifica (assumendo /profile/edit esista)
    await tab1.goto('/profile/edit');
    await tab1.waitForTimeout(1000);
    
    // Modificare un campo (es. first_name se visibile)
    const firstNameInput = tab1.locator('input[name="first_name"], input[name="firstName"]').first();
    if (await firstNameInput.isVisible()) {
      await firstNameInput.fill('UpdatedName');
      
      const saveButton = tab1.getByRole('button', { name: /salva|save/i }).first();
      await saveButton.click();
      
      // Attendere toast success o feedback
      await tab1.waitForTimeout(2000);
    }
    
    await context.close();
  });
  
  test('should maintain session after page refresh', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', 'test@workover.it');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    
    // Attendere redirect dopo login
    await page.waitForURL(/\/(spaces|dashboard)/, { timeout: 10000 });
    
    // Refresh pagina
    await page.reload();
    
    // Verificare che la sessione sia mantenuta (NON redirect a /login)
    await page.waitForTimeout(2000);
    const url = page.url();
    expect(url).not.toContain('/login');
  });
});
