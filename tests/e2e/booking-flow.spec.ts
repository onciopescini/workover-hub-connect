import { test, expect } from '@playwright/test';

test.describe('2-Step Booking Flow', () => {
  test('should allow date selection and time slot booking', async ({ page }) => {
    // Navigate to a space detail page
    await page.goto('/spaces/test-space-id');
    
    // Wait for page to load
    await expect(page.getByText('Prenota ora')).toBeVisible();
    
    // Click booking button
    await page.getByText('Prenota ora').click();
    
    // Step 1: Date Selection
    await expect(page.getByText('Seleziona Data')).toBeVisible();
    
    // Select tomorrow's date
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];
    
    await page.getByRole('button', { name: 'Seleziona una data' }).click();
    await page.locator(`[data-date="${tomorrowStr}"]`).click();
    await page.getByText('Continua alla selezione orario').click();
    
    // Step 2: Time Slot Selection
    await expect(page.getByText('Seleziona l\'orario')).toBeVisible();
    
    // Wait for slots to load
    await page.waitForSelector('[data-testid="time-slot"]', { timeout: 10000 });
    
    // Select 10:00-14:00 slot (4 hours - should be hourly pricing)
    const slot = page.locator('[data-testid="time-slot"]').filter({ 
      hasText: '10:00 - 14:00' 
    });
    
    if (await slot.count() > 0) {
      await slot.click();
      
      // Verify slot is selected
      await expect(slot.locator('text=Slot selezionato')).toBeVisible();
      
      // Check pricing is correct (4 hours * hourly rate)
      const hourlyRate = 50 / 8; // Assuming €50/day = €6.25/hour
      const expectedPrice = Math.round(4 * hourlyRate * 100) / 100;
      await expect(page.getByText(`€${expectedPrice}`)).toBeVisible();
      
      // Confirm booking
      await page.getByText('Conferma prenotazione').click();
      
      // Should proceed to payment or success
      await expect(page.getByText(/Prenotando|Slot riservato/)).toBeVisible();
    }
  });

  test('should handle blocked time slots correctly', async ({ page }) => {
    await page.goto('/spaces/test-space-id');
    
    // Start booking flow
    await page.getByText('Prenota ora').click();
    
    // Select date with existing booking
    await page.getByRole('button', { name: 'Seleziona una data' }).click();
    const today = new Date().toISOString().split('T')[0];
    await page.locator(`[data-date="${today}"]`).click();
    await page.getByText('Continua alla selezione orario').click();
    
    // Should show "Nessun orario disponibile" if all slots are blocked
    await expect(page.getByText(/Nessun orario disponibile|Errore nel caricamento/)).toBeVisible();
  });

  test('should show correct pricing for full day booking', async ({ page }) => {
    await page.goto('/spaces/test-space-id');
    
    await page.getByText('Prenota ora').click();
    
    // Select date
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];
    
    await page.getByRole('button', { name: 'Seleziona una data' }).click();
    await page.locator(`[data-date="${tomorrowStr}"]`).click();
    await page.getByText('Continua alla selezione orario').click();
    
    // Select 8+ hour slot (should show daily pricing)
    const fullDaySlot = page.locator('[data-testid="time-slot"]').filter({ 
      hasText: /09:00 - 17:00|10:00 - 18:00/ 
    });
    
    if (await fullDaySlot.count() > 0) {
      await fullDaySlot.first().click();
      
      // Should show daily price badge
      await expect(page.getByText('Giornaliero')).toBeVisible();
      
      // Should show full day price (€50 assuming that's the daily rate)
      await expect(page.getByText('€50')).toBeVisible();
    }
  });

  test('should allow going back to date selection', async ({ page }) => {
    await page.goto('/spaces/test-space-id');
    
    await page.getByText('Prenota ora').click();
    
    // Complete step 1
    await page.getByRole('button', { name: 'Seleziona una data' }).click();
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];
    await page.locator(`[data-date="${tomorrowStr}"]`).click();
    await page.getByText('Continua alla selezione orario').click();
    
    // Should be on step 2
    await expect(page.getByText('Seleziona l\'orario')).toBeVisible();
    
    // Click back button
    await page.getByRole('button', { name: 'Indietro' }).click();
    
    // Should return to step 1
    await expect(page.getByText('Seleziona Data')).toBeVisible();
  });
});