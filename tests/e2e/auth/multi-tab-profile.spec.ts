import { test, expect } from '@playwright/test';

test.describe('Multi-Tab Profile Synchronization', () => {
  
  test('should broadcast profile updates to other tabs', async ({ browser }) => {
    const context = await browser.newContext();
    
    // Setup: Login in 2 tab
    const tab1 = await context.newPage();
    const tab2 = await context.newPage();
    
    for (const tab of [tab1, tab2]) {
      await tab.goto('/login');
      await tab.fill('input[type="email"]', 'test@workover.it');
      await tab.fill('input[type="password"]', 'password123');
      await tab.click('button[type="submit"]');
      await tab.waitForURL(/dashboard|spaces|profile/);
    }
    
    // Tab 1: Modifica first_name
    await tab1.goto('/profile/edit');
    await tab1.fill('input[name="first_name"]', 'UpdatedFirstName');
    await tab1.click('button[type="submit"]:has-text("Salva")');
    
    // Attendere toast success
    await expect(tab1.getByText(/aggiornato con successo/i)).toBeVisible({ timeout: 5000 });
    
    // Tab 2: Attendere 2 secondi per broadcast
    await tab2.waitForTimeout(2000);
    
    // Tab 2: Navigare al profilo e verificare aggiornamento
    await tab2.goto('/profile/edit');
    
    const firstNameValue = await tab2.locator('input[name="first_name"]').inputValue();
    expect(firstNameValue).toBe('UpdatedFirstName');
    
    await context.close();
  });
  
  test('should invalidate cache in all tabs after profile update', async ({ browser }) => {
    const context = await browser.newContext();
    
    const tab1 = await context.newPage();
    const tab2 = await context.newPage();
    
    // Login in entrambe
    for (const tab of [tab1, tab2]) {
      await tab.goto('/login');
      await tab.fill('input[type="email"]', 'host@workover.it');
      await tab.fill('input[type="password"]', 'password123');
      await tab.click('button[type="submit"]');
      await tab.waitForURL('/host/dashboard');
    }
    
    // Tab 1: Modifica bio
    await tab1.goto('/profile/edit');
    await tab1.fill('textarea[name="bio"]', 'Updated bio from Tab 1');
    await tab1.click('button[type="submit"]:has-text("Salva")');
    await expect(tab1.getByText(/aggiornato/i)).toBeVisible({ timeout: 5000 });
    
    // Tab 2: Attendere broadcast (max 3 secondi)
    await tab2.waitForTimeout(3000);
    
    // Tab 2: Verificare cache invalidata (fetch fresco)
    let networkCallCount = 0;
    tab2.on('request', req => {
      if (req.url().includes('/rest/v1/profiles')) {
        networkCallCount++;
      }
    });
    
    await tab2.goto('/profile/edit');
    
    // Dovrebbe esserci almeno 1 call a /profiles (cache invalidata)
    expect(networkCallCount).toBeGreaterThan(0);
    
    // Verificare contenuto aggiornato
    const bioValue = await tab2.locator('textarea[name="bio"]').inputValue();
    expect(bioValue).toBe('Updated bio from Tab 1');
    
    await context.close();
  });
  
  test('should sync profile updates across 3+ tabs', async ({ browser }) => {
    const context = await browser.newContext();
    
    const tabs = await Promise.all([
      context.newPage(),
      context.newPage(),
      context.newPage()
    ]);
    
    // Login in tutte e 3 le tab
    for (const tab of tabs) {
      await tab.goto('/login');
      await tab.fill('input[type="email"]', 'test@workover.it');
      await tab.fill('input[type="password"]', 'password123');
      await tab.click('button[type="submit"]');
      await tab.waitForURL(/dashboard|spaces|profile/);
    }
    
    // Tab 1: Modifica nickname
    await tabs[0].goto('/profile/edit');
    await tabs[0].fill('input[name="nickname"]', 'MultiTabSync');
    await tabs[0].click('button[type="submit"]:has-text("Salva")');
    await expect(tabs[0].getByText(/aggiornato/i)).toBeVisible({ timeout: 5000 });
    
    // Attendere broadcast
    await Promise.all(tabs.map(tab => tab.waitForTimeout(2500)));
    
    // Tab 2 e 3: Verificare sincronizzazione
    for (let i = 1; i < tabs.length; i++) {
      await tabs[i].goto('/profile/edit');
      const nicknameValue = await tabs[i].locator('input[name="nickname"]').inputValue();
      expect(nicknameValue).toBe('MultiTabSync');
    }
    
    await context.close();
  });
});
