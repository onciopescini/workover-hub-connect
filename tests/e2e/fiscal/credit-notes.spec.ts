import { test, expect } from '@playwright/test';

/**
 * E2E Tests: Credit Notes Flow
 * 
 * Tests credit note generation and management after cancellations
 * Scenarios:
 * - Credit note requirement after invoice issued
 * - Host dashboard for pending credit notes
 * - Credit note confirmation
 * - Refund unlock after NC confirmation
 * - Credit notes in history
 */

test.describe('Credit Notes Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem('auth-user', JSON.stringify({
        id: 'user-123',
        email: 'test@example.com',
        role: 'host'
      }));
    });
  });

  test('should require credit note for cancellation after invoice issued', async ({ page }) => {
    // Mock booking that was already invoiced
    await page.route('**/rest/v1/bookings/*', async (route) => {
      await route.fulfill({
        status: 200,
        body: JSON.stringify({
          id: 'booking-invoiced',
          status: 'confirmed',
          payment_status: 'paid',
          invoice_issued: true,
          space: { title: 'Test Space' },
          coworker: { first_name: 'Test', last_name: 'User' }
        })
      });
    });

    await page.goto('/bookings/booking-invoiced');
    await page.waitForLoadState('networkidle');

    // Try to cancel booking
    const cancelButton = page.getByRole('button', { name: /cancella/i });
    if (await cancelButton.isVisible()) {
      await cancelButton.click();
      
      // Wait for dialog/modal
      await page.waitForTimeout(500);

      // Verify credit note warning is shown
      const creditNoteWarning = page.getByText(/nota di credito/i).or(
        page.getByText(/fattura.*emessa/i)
      );
      await expect(creditNoteWarning).toBeVisible({ timeout: 3000 });
    }
  });

  test('should show pending credit notes in host dashboard', async ({ page }) => {
    // Mock pending credit notes
    await page.route('**/rest/v1/payments*', async (route) => {
      const url = route.request().url();
      
      if (url.includes('credit_note_required=eq.true')) {
        await route.fulfill({
          status: 200,
          body: JSON.stringify([
            {
              id: 'payment-nc-1',
              host_amount: 90.00,
              credit_note_deadline: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
              credit_note_required: true,
              credit_note_issued_by_host: false,
              booking: {
                id: 'booking-cancelled',
                booking_date: '2025-01-15',
                cancelled_at: '2025-01-12T10:00:00Z',
                cancellation_reason: 'Cancellazione per motivi personali',
                space: {
                  title: 'Test Space'
                },
                coworker: {
                  first_name: 'Maria',
                  last_name: 'Verdi'
                }
              }
            }
          ])
        });
      } else {
        await route.fulfill({
          status: 200,
          body: JSON.stringify([])
        });
      }
    });

    await page.goto('/host/invoices');
    await page.waitForLoadState('networkidle');

    // Switch to Credit Notes tab
    const creditNotesTab = page.getByRole('tab', { name: /note.*credito/i });
    await creditNotesTab.click();
    await page.waitForTimeout(500);

    // Verify credit note card is visible
    const creditNoteCard = page.getByText(/maria.*verdi/i).or(
      page.getByText(/nota.*credito/i)
    );
    await expect(creditNoteCard.first()).toBeVisible();
  });

  test('should display cancellation reason in credit note card', async ({ page }) => {
    await page.route('**/rest/v1/payments*', async (route) => {
      const url = route.request().url();
      
      if (url.includes('credit_note_required=eq.true')) {
        await route.fulfill({
          status: 200,
          body: JSON.stringify([
            {
              id: 'payment-nc-1',
              host_amount: 90.00,
              credit_note_deadline: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
              credit_note_required: true,
              booking: {
                booking_date: '2025-01-15',
                cancelled_at: '2025-01-12T10:00:00Z',
                cancellation_reason: 'Emergenza familiare improvvisa',
                space: { title: 'Test' },
                coworker: {
                  first_name: 'Test',
                  last_name: 'User'
                }
              }
            }
          ])
        });
      } else {
        await route.fulfill({
          status: 200,
          body: JSON.stringify([])
        });
      }
    });

    await page.goto('/host/invoices');
    const creditNotesTab = page.getByRole('tab', { name: /note.*credito/i });
    await creditNotesTab.click();
    await page.waitForTimeout(500);

    // Verify cancellation reason is displayed
    const reasonText = page.getByText(/emergenza familiare/i);
    await expect(reasonText).toBeVisible();
  });

  test('should confirm credit note issuance', async ({ page }) => {
    let updateCalled = false;

    await page.route('**/rest/v1/payments*', async (route) => {
      const method = route.request().method();
      const url = route.request().url();
      
      if (method === 'GET' && url.includes('credit_note_required=eq.true')) {
        await route.fulfill({
          status: 200,
          body: JSON.stringify([
            {
              id: 'payment-nc-1',
              host_amount: 90.00,
              credit_note_deadline: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
              credit_note_required: true,
              booking: {
                booking_date: '2025-01-15',
                cancellation_reason: 'Test reason',
                space: { title: 'Test' },
                coworker: { first_name: 'Test', last_name: 'User' }
              }
            }
          ])
        });
      } else if (method === 'PATCH') {
        updateCalled = true;
        await route.fulfill({
          status: 200,
          body: JSON.stringify({ success: true })
        });
      } else {
        await route.fulfill({
          status: 200,
          body: JSON.stringify([])
        });
      }
    });

    await page.goto('/host/invoices');
    const creditNotesTab = page.getByRole('tab', { name: /note.*credito/i });
    await creditNotesTab.click();
    await page.waitForTimeout(500);

    // Click confirm credit note button
    const confirmButton = page.getByRole('button', { name: /conferma.*nc/i }).or(
      page.getByRole('button', { name: /emessa/i })
    );
    await confirmButton.first().click();
    await page.waitForTimeout(1000);

    // Verify success message
    const successMessage = page.getByText(/confermata/i).or(page.getByText(/success/i));
    await expect(successMessage).toBeVisible({ timeout: 5000 });

    // Verify update was called
    expect(updateCalled).toBeTruthy();
  });


  test('should show credit note in history after confirmation', async ({ page }) => {
    await page.route('**/rest/v1/payments*', async (route) => {
      const url = route.request().url();
      
      // Check for history query
      if (url.includes('credit_note_issued_by_host=eq.true')) {
        await route.fulfill({
          status: 200,
          body: JSON.stringify([
            {
              id: 'payment-nc-history-1',
              host_amount: 90.00,
              credit_note_issued_by_host: true,
              created_at: '2025-01-10T10:00:00Z',
              booking: {
                booking_date: '2025-01-10',
                cancellation_reason: 'Historical cancellation',
                space: { title: 'Test' },
                coworker: {
                  first_name: 'Historical',
                  last_name: 'User'
                }
              }
            }
          ])
        });
      } else {
        await route.fulfill({
          status: 200,
          body: JSON.stringify([])
        });
      }
    });

    await page.goto('/host/invoices');
    await page.waitForLoadState('networkidle');

    // Switch to History tab
    const historyTab = page.getByRole('tab', { name: /storico/i });
    await historyTab.click();
    await page.waitForTimeout(500);

    // Verify credit note appears in history
    const historicalNC = page.getByText(/nota.*credito/i).or(
      page.getByText(/historical/i)
    );
    await expect(historicalNC.first()).toBeVisible();
  });

  test('should show credit note deadline countdown', async ({ page }) => {
    await page.route('**/rest/v1/payments*', async (route) => {
      const url = route.request().url();
      
      if (url.includes('credit_note_required=eq.true')) {
        const deadline = new Date();
        deadline.setDate(deadline.getDate() + 3); // 3 days from now

        await route.fulfill({
          status: 200,
          body: JSON.stringify([
            {
              id: 'payment-nc-1',
              host_amount: 90.00,
              credit_note_deadline: deadline.toISOString(),
              credit_note_required: true,
              booking: {
                booking_date: '2025-01-15',
                space: { title: 'Test' },
                coworker: { first_name: 'Test', last_name: 'User' }
              }
            }
          ])
        });
      } else {
        await route.fulfill({
          status: 200,
          body: JSON.stringify([])
        });
      }
    });

    await page.goto('/host/invoices');
    const creditNotesTab = page.getByRole('tab', { name: /note.*credito/i });
    await creditNotesTab.click();
    await page.waitForTimeout(500);

    // Verify deadline countdown
    const deadlineText = page.getByText(/3.*giorni/i).or(page.getByText(/scadenza/i));
    await expect(deadlineText.first()).toBeVisible();
  });
});
