import { test, expect } from '@playwright/test';

test.describe('2-Step Booking Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Set the feature flag
    await page.addInitScript(() => {
      window.localStorage.setItem('VITE_BOOKING_TWO_STEP', 'true');
    });
    
    // Navigate to a space detail page
    await page.goto('/spaces/test-space-id');
    await page.waitForLoadState('networkidle');
    
    // Click on booking button to open the form
    await page.getByText('Prenota').first().click();
  });

  test('completes full booking flow: Date → 10:00-14:00 → Confirm', async ({ page }) => {
    // Step 1: DATE - Select tomorrow's date
    await expect(page.getByText('Seleziona la data')).toBeVisible();
    
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    await page.getByTestId('date-picker-trigger').click();
    await page.getByTestId('date-picker-calendar').waitFor();
    
    // Click on tomorrow's date in the calendar
    await page.locator(`[data-testid="date-picker-calendar"] button:has-text("${tomorrow.getDate()}")`).first().click();
    
    // Continue to time selection
    await page.getByTestId('date-step-continue').click();
    
    // Step 2: TIME - Select 10:00-14:00 range
    await expect(page.getByText('Seleziona l\'orario')).toBeVisible();
    
    // Wait for slots to load
    await page.waitForSelector('[data-testid="time-slot-10_00"]');
    
    // Select start time 10:00
    await page.getByTestId('time-slot-10_00').click();
    
    // Select end time 14:00 (this completes the range)
    await page.getByTestId('time-slot-14_00').click();
    
    // Verify range summary appears
    await expect(page.getByTestId('time-range-summary')).toBeVisible();
    await expect(page.getByText('10:00 - 14:00')).toBeVisible();
    await expect(page.getByText('4h')).toBeVisible();
    
    // Continue to summary
    await page.getByText('Continua').click();
    
    // Step 3: SUMMARY - Review and confirm
    await expect(page.getByText('Riepilogo prenotazione')).toBeVisible();
    await expect(page.getByText('10:00 - 14:00')).toBeVisible();
    await expect(page.getByText('4h di utilizzo')).toBeVisible();
    
    // Confirm booking
    await page.getByText('Conferma').click();
    
    // Should show success or redirect to payment
    await expect(page.getByText('Slot riservato!')).toBeVisible();
  });

  test('handles race condition with lock error and refresh', async ({ page }) => {
    // Mock the RPC to simulate a conflict on first call, success on second
    await page.route('**/rest/v1/rpc/validate_and_reserve_slot', async (route, request) => {
      const body = await request.postDataJSON();
      
      // First call returns conflict
      if (!page.locator('[data-testid="lock-error-toast"]').isVisible()) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: false,
            error: 'Slot already booked by another user'
          })
        });
      } else {
        // Second call succeeds
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            booking_id: 'test-booking-id',
            reserved_until: new Date(Date.now() + 600000).toISOString()
          })
        });
      }
    });

    // Go through booking flow
    await page.getByTestId('date-picker-trigger').click();
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    await page.locator(`[data-testid="date-picker-calendar"] button:has-text("${tomorrow.getDate()}")`).first().click();
    await page.getByTestId('date-step-continue').click();
    
    await page.waitForSelector('[data-testid="time-slot-10_00"]');
    await page.getByTestId('time-slot-10_00').click();
    await page.getByTestId('time-slot-12_00').click();
    
    await page.getByText('Continua').click();
    await page.getByText('Conferma').click();
    
    // Should show error toast with refresh option
    await expect(page.getByText('Slot non più disponibile')).toBeVisible();
    await expect(page.getByText('Qualcun altro ha prenotato questo orario')).toBeVisible();
    
    // Click refresh button in toast
    await page.getByRole('button', { name: 'Aggiorna' }).click();
    
    // Should return to time selection step with refreshed slots
    await expect(page.getByText('Seleziona l\'orario')).toBeVisible();
  });

  test('validates buffer minutes between adjacent slots', async ({ page }) => {
    // Mock space with 30-minute buffer
    await page.route('**/rest/v1/rpc/get_space_availability_optimized', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            booking_date: new Date().toISOString().split('T')[0],
            start_time: '09:00',
            end_time: '10:00'
          }
        ])
      });
    });

    // Go to time selection
    await page.getByTestId('date-picker-trigger').click();
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    await page.locator(`[data-testid="date-picker-calendar"] button:has-text("${tomorrow.getDate()}")`).first().click();
    await page.getByTestId('date-step-continue').click();
    
    // With buffer, 10:00-10:30 slot should be unavailable due to 9:00-10:00 booking
    await page.waitForSelector('[data-testid="time-slot-10_00"]');
    
    // The 10:00 slot should be disabled/unavailable
    const tenOClockSlot = page.getByTestId('time-slot-10_00');
    await expect(tenOClockSlot).toBeDisabled();
    
    // But 10:30 should be available (after buffer period)
    const tenThirtySlot = page.getByTestId('time-slot-10_30');
    await expect(tenThirtySlot).toBeEnabled();
  });

  test('shows correct pricing for different durations', async ({ page }) => {
    // Go through booking flow with different time ranges
    await page.getByTestId('date-picker-trigger').click();
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    await page.locator(`[data-testid="date-picker-calendar"] button:has-text("${tomorrow.getDate()}")`).first().click();
    await page.getByTestId('date-step-continue').click();
    
    // Test short duration (3 hours) - should use hourly rate
    await page.waitForSelector('[data-testid="time-slot-10_00"]');
    await page.getByTestId('time-slot-10_00').click();
    await page.getByTestId('time-slot-13_00').click();
    
    // Should show hourly pricing
    await expect(page.getByText('Tariffa oraria')).toBeVisible();
    await expect(page.getByText('3h ×')).toBeVisible();
    
    // Reset selection and test long duration (8+ hours) - should use daily rate
    await page.keyboard.press('Escape'); // Clear selection
    
    await page.getByTestId('time-slot-09_00').click();
    await page.getByTestId('time-slot-17_00').click();
    
    // Should show daily pricing
    await expect(page.getByText('Tariffa giornaliera')).toBeVisible();
    await expect(page.getByText('8h')).toBeVisible();
  });

  test('supports keyboard navigation in time slot grid', async ({ page }) => {
    // Go to time selection
    await page.getByTestId('date-picker-trigger').click();
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    await page.locator(`[data-testid="date-picker-calendar"] button:has-text("${tomorrow.getDate()}")`).first().click();
    await page.getByTestId('date-step-continue').click();
    
    await page.waitForSelector('[data-testid="time-slot-10_00"]');
    
    // Focus first slot and navigate with keyboard
    await page.getByTestId('time-slot-08_00').focus();
    
    // Navigate right with arrow key
    await page.keyboard.press('ArrowRight');
    await expect(page.getByTestId('time-slot-08_30')).toBeFocused();
    
    // Navigate down (should move 4 slots in grid)
    await page.keyboard.press('ArrowDown');
    // Exact slot depends on grid layout, but should move down
    
    // Select with Enter
    await page.keyboard.press('Enter');
    
    // Should show selection started
    await expect(page.getByText('Clicca su un altro slot per completare')).toBeVisible();
  });

  test('prevents non-contiguous slot selection', async ({ page }) => {
    // Mock availability with gaps
    await page.route('**/rest/v1/rpc/get_space_availability_optimized', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            booking_date: new Date().toISOString().split('T')[0],
            start_time: '11:00',
            end_time: '12:00'
          }
        ])
      });
    });

    // Go to time selection
    await page.getByTestId('date-picker-trigger').click();
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    await page.locator(`[data-testid="date-picker-calendar"] button:has-text("${tomorrow.getDate()}")`).first().click();
    await page.getByTestId('date-step-continue').click();
    
    await page.waitForSelector('[data-testid="time-slot-10_00"]');
    
    // Try to select range that would include unavailable slot
    await page.getByTestId('time-slot-10_00').click();
    await page.getByTestId('time-slot-13_00').click(); // This range includes unavailable 11:00-12:00
    
    // Should start new selection instead of creating invalid range
    await expect(page.getByText('Clicca su un altro slot per completare')).toBeVisible();
  });
});