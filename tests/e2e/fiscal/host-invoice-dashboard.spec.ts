import { test, expect } from '@playwright/test';

/**
 * E2E Tests: Host Invoice Dashboard
 * 
 * Tests host dashboard for managing pending invoices and tracking deadlines
 * Scenarios:
 * - Viewing pending invoices
 * - T+7 countdown display
 * - Expired invoice badges
 * - Confirming invoice issuance
 * - Moving invoices to history
 */

test.describe('Host Invoice Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    // Mock authenticated host user
    await page.addInitScript(() => {
      window.localStorage.setItem('auth-user', JSON.stringify({
        id: 'host-123',
        email: 'host@test.com',
        role: 'host'
      }));
    });
  });

  test('should display pending invoices with countdown', async ({ page }) => {
    // Mock pending invoices
    await page.route('**/rest/v1/payments*', async (route) => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 5); // 5 days from now

      await route.fulfill({
        status: 200,
        body: JSON.stringify([
          {
            id: 'payment-1',
            host_amount: 90.00,
            host_invoice_deadline: futureDate.toISOString(),
            booking: {
              id: 'booking-1',
              booking_date: '2025-01-15',
              start_time: '09:00:00',
              end_time: '12:00:00',
              space: {
                title: 'Test Space'
              },
              coworker: {
                first_name: 'Maria',
                last_name: 'Verdi',
                email: 'maria@example.com'
              }
            }
          }
        ])
      });
    });

    await page.goto('/host/invoices');
    await page.waitForLoadState('networkidle');

    // Verify countdown is displayed
    const countdownText = page.getByText(/scadenza.*5.*giorni/i).or(page.getByText(/5.*giorni/i));
    await expect(countdownText.first()).toBeVisible({ timeout: 5000 });
  });

  test('should show SCADUTA badge for expired invoices', async ({ page }) => {
    // Mock expired invoice
    await page.route('**/rest/v1/payments*', async (route) => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 10); // 10 days ago

      await route.fulfill({
        status: 200,
        body: JSON.stringify([
          {
            id: 'payment-expired',
            host_amount: 90.00,
            host_invoice_deadline: pastDate.toISOString(),
            booking: {
              id: 'booking-1',
              booking_date: '2025-01-05',
              start_time: '09:00:00',
              end_time: '12:00:00',
              space: {
                title: 'Expired Space'
              },
              coworker: {
                first_name: 'Giovanni',
                last_name: 'Bianchi',
                email: 'giovanni@example.com'
              }
            }
          }
        ])
      });
    });

    await page.goto('/host/invoices');
    await page.waitForLoadState('networkidle');

    // Verify SCADUTA badge is shown
    const expiredBadge = page.getByText(/scaduta/i);
    await expect(expiredBadge).toBeVisible({ timeout: 5000 });
  });

  test('should display coworker fiscal data in invoice card', async ({ page }) => {
    await page.route('**/rest/v1/payments*', async (route) => {
      await route.fulfill({
        status: 200,
        body: JSON.stringify([
          {
            id: 'payment-1',
            host_amount: 90.00,
            host_invoice_deadline: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
            booking: {
              id: 'booking-1',
              booking_date: '2025-01-15',
              metadata: {
                fiscal_data: {
                  request_invoice: true,
                  is_business: false,
                  tax_id: 'RSSMRA80A01H501U',
                  billing_address: 'Via Test 123',
                  billing_city: 'Milano',
                  billing_postal_code: '20100'
                }
              },
              space: {
                title: 'Test Space'
              },
              coworker: {
                first_name: 'Mario',
                last_name: 'Rossi',
                email: 'mario@example.com'
              }
            }
          }
        ])
      });
    });

    await page.goto('/host/invoices');
    await page.waitForLoadState('networkidle');

    // Verify fiscal data is displayed
    await expect(page.getByText(/RSSMRA80A01H501U/i)).toBeVisible({ timeout: 5000 });
    await expect(page.getByText(/via test 123/i)).toBeVisible();
    await expect(page.getByText(/milano/i)).toBeVisible();
  });

  test('should show download PDF summary button', async ({ page }) => {
    await page.route('**/rest/v1/payments*', async (route) => {
      await route.fulfill({
        status: 200,
        body: JSON.stringify([
          {
            id: 'payment-1',
            host_amount: 90.00,
            host_invoice_deadline: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
            booking: {
              id: 'booking-1',
              booking_date: '2025-01-15',
              space: { title: 'Test' },
              coworker: {
                first_name: 'Test',
                last_name: 'User',
                email: 'test@example.com'
              }
            }
          }
        ])
      });
    });

    await page.goto('/host/invoices');
    await page.waitForLoadState('networkidle');

    // Verify download button is present
    const downloadButton = page.getByRole('button', { name: /scarica.*riepilogo/i }).or(
      page.getByRole('button', { name: /pdf/i })
    );
    await expect(downloadButton.first()).toBeVisible();
  });

  test('should mark invoice as issued and show success message', async ({ page }) => {
    let updateCalled = false;

    await page.route('**/rest/v1/payments*', async (route) => {
      const method = route.request().method();
      
      if (method === 'GET') {
        await route.fulfill({
          status: 200,
          body: JSON.stringify([
            {
              id: 'payment-1',
              host_amount: 90.00,
              host_invoice_deadline: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
              booking: {
                booking_date: '2025-01-15',
                space: { title: 'Test' },
                coworker: {
                  first_name: 'Test',
                  last_name: 'User',
                  email: 'test@example.com'
                }
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
      }
    });

    await page.goto('/host/invoices');
    await page.waitForLoadState('networkidle');

    // Click confirm button
    const confirmButton = page.getByRole('button', { name: /conferma.*emessa/i });
    await confirmButton.first().click();

    // Wait for update
    await page.waitForTimeout(1000);

    // Verify success toast/message
    const successMessage = page.getByText(/confermata/i).or(page.getByText(/success/i));
    await expect(successMessage).toBeVisible({ timeout: 5000 });

    // Verify update was called
    expect(updateCalled).toBeTruthy();
  });

  test('should remove invoice from pending after confirmation', async ({ page }) => {
    let invoiceRemoved = false;

    await page.route('**/rest/v1/payments*', async (route) => {
      const method = route.request().method();
      
      if (method === 'GET') {
        // After update, return empty array (invoice no longer pending)
        await route.fulfill({
          status: 200,
          body: JSON.stringify(invoiceRemoved ? [] : [
            {
              id: 'payment-1',
              host_amount: 90.00,
              host_invoice_deadline: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
              booking: {
                booking_date: '2025-01-15',
                space: { title: 'Test' },
                coworker: {
                  first_name: 'Test',
                  last_name: 'User',
                  email: 'test@example.com'
                }
              }
            }
          ])
        });
      } else if (method === 'PATCH') {
        invoiceRemoved = true;
        await route.fulfill({
          status: 200,
          body: JSON.stringify({ success: true })
        });
      }
    });

    await page.goto('/host/invoices');
    await page.waitForLoadState('networkidle');

    // Confirm invoice
    const confirmButton = page.getByRole('button', { name: /conferma.*emessa/i });
    await confirmButton.first().click();
    await page.waitForTimeout(1000);

    // Reload/refetch
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Verify empty state or no invoice card
    const emptyMessage = page.getByText(/nessuna fattura/i).or(page.getByText(/non ci sono/i));
    await expect(emptyMessage).toBeVisible({ timeout: 5000 });
  });

  test('should show invoice in history tab after confirmation', async ({ page }) => {
    await page.route('**/rest/v1/payments*', async (route) => {
      const url = route.request().url();
      
      // Check which query (pending vs history)
      if (url.includes('host_invoice_reminder_sent')) {
        // History query
        await route.fulfill({
          status: 200,
          body: JSON.stringify([
            {
              id: 'payment-history-1',
              host_amount: 90.00,
              created_at: '2025-01-10T10:00:00Z',
              booking: {
                booking_date: '2025-01-10',
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
        // Pending query
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

    // Verify historical invoice is shown
    const historicalInvoice = page.getByText(/historical.*user/i);
    await expect(historicalInvoice).toBeVisible();
  });

  test('should disable confirm button for expired invoices', async ({ page }) => {
    await page.route('**/rest/v1/payments*', async (route) => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 10);

      await route.fulfill({
        status: 200,
        body: JSON.stringify([
          {
            id: 'payment-expired',
            host_amount: 90.00,
            host_invoice_deadline: pastDate.toISOString(),
            booking: {
              booking_date: '2025-01-05',
              space: { title: 'Test' },
              coworker: {
                first_name: 'Test',
                last_name: 'User',
                email: 'test@example.com'
              }
            }
          }
        ])
      });
    });

    await page.goto('/host/invoices');
    await page.waitForLoadState('networkidle');

    // Verify confirm button is disabled
    const confirmButton = page.getByRole('button', { name: /conferma/i });
    await expect(confirmButton.first()).toBeDisabled();
  });
});
