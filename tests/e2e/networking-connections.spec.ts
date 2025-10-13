import { test, expect } from '@playwright/test';

test.describe('Networking Connections', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', 'user@workover.it');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/');
  });

  test('user can view networking page', async ({ page }) => {
    await page.goto('/networking');
    
    await expect(page.getByRole('heading', { name: /network/i })).toBeVisible();
  });

  test('user can search for other users', async ({ page }) => {
    await page.goto('/networking');
    
    const searchInput = page.getByPlaceholder(/cerca utenti/i);
    await searchInput.fill('test user');
    await page.waitForTimeout(500);
    
    await expect(page.getByText(/risultati/i)).toBeVisible();
  });

  test('user can send connection request', async ({ page }) => {
    await page.goto('/networking');
    
    const connectButton = page.getByRole('button', { name: /connetti/i }).first();
    if (await connectButton.isVisible()) {
      await connectButton.click();
      
      await page.fill('textarea[placeholder*="messaggio"]', 'Ciao, connettiamoci!');
      
      const sendButton = page.getByRole('button', { name: /invia/i });
      await sendButton.click();
      
      await expect(page.getByText(/richiesta inviata/i)).toBeVisible({ timeout: 5000 });
    }
  });

  test('user can view connection requests', async ({ page }) => {
    await page.goto('/networking/requests');
    
    await expect(page.getByRole('heading', { name: /richieste/i })).toBeVisible();
  });

  test('user can accept connection request', async ({ page }) => {
    await page.goto('/networking/requests');
    
    const acceptButton = page.getByRole('button', { name: /accetta/i }).first();
    if (await acceptButton.isVisible()) {
      await acceptButton.click();
      
      await expect(page.getByText(/accettata/i)).toBeVisible({ timeout: 5000 });
    }
  });

  test('user can reject connection request', async ({ page }) => {
    await page.goto('/networking/requests');
    
    const rejectButton = page.getByRole('button', { name: /rifiuta/i }).first();
    if (await rejectButton.isVisible()) {
      await rejectButton.click();
      
      await expect(page.getByText(/rifiutata/i)).toBeVisible({ timeout: 5000 });
    }
  });

  test('displays connected users list', async ({ page }) => {
    await page.goto('/networking/connections');
    
    await expect(page.getByRole('heading', { name: /connessioni/i })).toBeVisible();
  });

  test('user can message connected user', async ({ page }) => {
    await page.goto('/networking/connections');
    
    const messageButton = page.getByRole('button', { name: /messaggio/i }).first();
    if (await messageButton.isVisible()) {
      await messageButton.click();
      
      await expect(page.getByRole('dialog')).toBeVisible();
    }
  });
});
