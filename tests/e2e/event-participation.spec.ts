import { test, expect } from '@playwright/test';

test.describe('Event Participation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', 'user@workover.it');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/');
  });

  test('user can view events page', async ({ page }) => {
    await page.goto('/events');
    
    await expect(page.getByRole('heading', { name: /eventi/i })).toBeVisible();
  });

  test('user can view event details', async ({ page }) => {
    await page.goto('/events');
    
    const eventCard = page.locator('.event-card').first();
    if (await eventCard.isVisible()) {
      await eventCard.click();
      
      await expect(page.getByRole('heading')).toBeVisible();
      await expect(page.getByText(/data/i)).toBeVisible();
      await expect(page.getByText(/partecipanti/i)).toBeVisible();
    }
  });

  test('user can join event', async ({ page }) => {
    await page.goto('/events');
    
    const joinButton = page.getByRole('button', { name: /partecipa/i }).first();
    if (await joinButton.isVisible()) {
      await joinButton.click();
      
      await expect(page.getByText(/iscritto/i)).toBeVisible({ timeout: 5000 });
    }
  });

  test('user can leave event', async ({ page }) => {
    await page.goto('/events/my-events');
    
    const leaveButton = page.getByRole('button', { name: /annulla/i }).first();
    if (await leaveButton.isVisible()) {
      await leaveButton.click();
      
      const confirmButton = page.getByRole('button', { name: /conferma/i });
      await confirmButton.click();
      
      await expect(page.getByText(/annullata/i)).toBeVisible({ timeout: 5000 });
    }
  });

  test('host can create new event', async ({ page }) => {
    await page.goto('/events/create');
    
    await page.fill('input[name="title"]', 'Networking Event');
    await page.fill('textarea[name="description"]', 'A great networking opportunity');
    await page.fill('input[name="max_participants"]', '50');
    
    const submitButton = page.getByRole('button', { name: /crea evento/i });
    await submitButton.click();
    
    await expect(page.getByText(/evento creato/i)).toBeVisible({ timeout: 5000 });
  });

  test('displays participant count', async ({ page }) => {
    await page.goto('/events');
    
    const eventCard = page.locator('.event-card').first();
    if (await eventCard.isVisible()) {
      await expect(eventCard.getByText(/\d+ partecipanti/i)).toBeVisible();
    }
  });

  test('shows event date and time', async ({ page }) => {
    await page.goto('/events');
    
    const eventCard = page.locator('.event-card').first();
    if (await eventCard.isVisible()) {
      await expect(eventCard.getByText(/\d{1,2}\/\d{1,2}\/\d{4}/)).toBeVisible();
    }
  });

  test('filters events by date', async ({ page }) => {
    await page.goto('/events');
    
    const filterButton = page.getByRole('button', { name: /filtra/i });
    if (await filterButton.isVisible()) {
      await filterButton.click();
      
      await page.click('button:has-text("Prossimi")');
      await page.waitForTimeout(500);
    }
  });
});
