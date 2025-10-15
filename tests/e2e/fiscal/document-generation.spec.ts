import { test, expect } from '@playwright/test';

/**
 * E2E Tests: MOCK Document Generation
 * 
 * Tests document generation after booking completion in MOCK mode
 * Scenarios:
 * - Non-fiscal receipts for private hosts
 * - Electronic invoices for P.IVA hosts
 * - Documents visibility in coworker dashboard
 * - Documents visibility in host dashboard
 */

test.describe('MOCK Document Generation', () => {
  test.beforeEach(async ({ page }) => {
    // Mock authenticated user
    await page.addInitScript(() => {
      window.localStorage.setItem('auth-user', JSON.stringify({
        id: 'user-123',
        email: 'test@example.com'
      }));
    });
  });

  test('should generate non-fiscal receipt for private host booking', async ({ page }) => {
    // Mock served booking with private host
    await page.route('**/rest/v1/non_fiscal_receipts*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 'receipt-mock-1',
            receipt_number: 'RIC-2025-001',
            receipt_date: '2025-01-15',
            total_amount: 100.00,
            canone_amount: 100.00,
            pdf_url: 'fiscal-documents/receipts/mock.pdf',
            booking: {
              booking_date: '2025-01-15',
              space: {
                title: 'Test Space'
              }
            },
            host: {
              first_name: 'Mario',
              last_name: 'Rossi'
            }
          }
        ])
      });
    });

    // Navigate to My Documents
    await page.goto('/my-documents');
    await page.waitForLoadState('networkidle');

    // Verify receipt is visible
    const receiptCard = page.getByText(/RIC-2025-001/i);
    await expect(receiptCard).toBeVisible();

    // Verify it's labeled as non-fiscal
    const nonFiscalBadge = page.getByText(/non fiscale/i);
    await expect(nonFiscalBadge.first()).toBeVisible();
  });

  test('should generate electronic invoice for P.IVA host booking', async ({ page }) => {
    // Mock invoices for P.IVA host bookings
    await page.route('**/rest/v1/invoices*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 'invoice-mock-1',
            invoice_number: 'FT-2025-001',
            invoice_date: '2025-01-15',
            total_amount: 122.00,
            base_amount: 100.00,
            vat_amount: 22.00,
            vat_rate: 22,
            pdf_file_url: 'fiscal-documents/invoices/mock.pdf',
            xml_file_url: 'fiscal-documents/invoices/mock.xml',
            xml_delivery_status: 'delivered',
            booking: {
              booking_date: '2025-01-15',
              space: {
                title: 'Test P.IVA Space',
                host: {
                  first_name: 'Giovanni',
                  last_name: 'Bianchi',
                  business_name: 'Bianchi Coworking S.r.l.',
                  vat_number: '12345678901'
                }
              }
            }
          }
        ])
      });
    });

    await page.goto('/my-documents');
    await page.waitForLoadState('networkidle');

    // Switch to Invoices tab
    const invoicesTab = page.getByRole('tab', { name: /fatture/i });
    await invoicesTab.click();
    await page.waitForTimeout(500);

    // Verify invoice is visible
    const invoiceCard = page.getByText(/FT-2025-001/i);
    await expect(invoiceCard).toBeVisible();

    // Verify it's labeled as electronic invoice
    const electronicBadge = page.getByText(/elettronica/i);
    await expect(electronicBadge.first()).toBeVisible();
  });

  test('should display VAT breakdown for invoices', async ({ page }) => {
    await page.route('**/rest/v1/invoices*', async (route) => {
      await route.fulfill({
        status: 200,
        body: JSON.stringify([
          {
            id: 'invoice-1',
            invoice_number: 'FT-2025-001',
            invoice_date: '2025-01-15',
            total_amount: 122.00,
            base_amount: 100.00,
            vat_amount: 22.00,
            vat_rate: 22,
            booking: {
              space: {
                title: 'Test Space',
                host: {
                  first_name: 'Test',
                  last_name: 'Host'
                }
              }
            }
          }
        ])
      });
    });

    await page.goto('/my-documents');
    const invoicesTab = page.getByRole('tab', { name: /fatture/i });
    await invoicesTab.click();

    // Verify VAT breakdown is displayed
    await expect(page.getByText(/imponibile/i)).toBeVisible();
    await expect(page.getByText(/€100\.00/)).toBeVisible(); // Base amount
    await expect(page.getByText(/iva.*22/i)).toBeVisible();
    await expect(page.getByText(/€22\.00/)).toBeVisible(); // VAT amount
    await expect(page.getByText(/€122\.00/)).toBeVisible(); // Total
  });

  test('should show invoice in host pending invoices dashboard', async ({ page }) => {
    // Mock host pending invoices
    await page.route('**/rest/v1/payments*', async (route) => {
      const url = route.request().url();
      
      // Check if querying for pending invoices
      if (url.includes('host_invoice_required=eq.true')) {
        await route.fulfill({
          status: 200,
          body: JSON.stringify([
            {
              id: 'payment-1',
              host_amount: 90.00,
              host_invoice_deadline: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days from now
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
      } else {
        await route.continue();
      }
    });

    // Navigate to host invoices dashboard
    await page.goto('/host/invoices');
    await page.waitForLoadState('networkidle');

    // Verify pending invoice is visible
    const invoiceCard = page.getByText(/payment-1/i).or(page.getByText(/maria.*verdi/i));
    await expect(invoiceCard.first()).toBeVisible({ timeout: 5000 });

    // Verify deadline countdown
    const deadlineText = page.getByText(/5 giorni/i).or(page.getByText(/scadenza/i));
    await expect(deadlineText.first()).toBeVisible();
  });

  test('should allow PDF download for receipts', async ({ page }) => {
    await page.route('**/rest/v1/non_fiscal_receipts*', async (route) => {
      await route.fulfill({
        status: 200,
        body: JSON.stringify([
          {
            id: 'receipt-1',
            receipt_number: 'RIC-2025-001',
            receipt_date: '2025-01-15',
            total_amount: 100.00,
            canone_amount: 100.00,
            pdf_url: 'fiscal-documents/receipts/test.pdf',
            booking: {
              space: { title: 'Test' }
            },
            host: {
              first_name: 'Test',
              last_name: 'Host'
            }
          }
        ])
      });
    });

    // Mock Supabase Storage download
    await page.route('**/storage/v1/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/pdf',
        body: Buffer.from('Mock PDF content')
      });
    });

    await page.goto('/my-documents');
    
    // Setup download listener
    const downloadPromise = page.waitForEvent('download');
    
    // Click download button
    const downloadButton = page.getByRole('button', { name: /scarica pdf/i });
    await downloadButton.first().click();

    // Wait for download
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toContain('ricevuta');
  });

  test('should allow PDF and XML download for invoices', async ({ page }) => {
    await page.route('**/rest/v1/invoices*', async (route) => {
      await route.fulfill({
        status: 200,
        body: JSON.stringify([
          {
            id: 'invoice-1',
            invoice_number: 'FT-2025-001',
            invoice_date: '2025-01-15',
            total_amount: 122.00,
            base_amount: 100.00,
            vat_amount: 22.00,
            vat_rate: 22,
            pdf_file_url: 'fiscal-documents/invoices/test.pdf',
            xml_file_url: 'fiscal-documents/invoices/test.xml',
            booking: {
              space: {
                title: 'Test',
                host: { first_name: 'Test', last_name: 'Host' }
              }
            }
          }
        ])
      });
    });

    await page.route('**/storage/v1/**', async (route) => {
      await route.fulfill({
        status: 200,
        body: Buffer.from('Mock file content')
      });
    });

    await page.goto('/my-documents');
    const invoicesTab = page.getByRole('tab', { name: /fatture/i });
    await invoicesTab.click();

    // Verify both PDF and XML buttons are present
    await expect(page.getByRole('button', { name: /pdf/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /xml/i })).toBeVisible();
  });

  test('should filter documents by fiscal year', async ({ page }) => {
    await page.route('**/rest/v1/non_fiscal_receipts*', async (route) => {
      const url = route.request().url();
      const currentYear = new Date().getFullYear();
      
      // Check year filter in query
      if (url.includes(`receipt_date=gte.${currentYear}`)) {
        await route.fulfill({
          status: 200,
          body: JSON.stringify([
            {
              id: 'receipt-current',
              receipt_number: 'RIC-2025-001',
              receipt_date: `${currentYear}-01-15`,
              total_amount: 100,
              canone_amount: 100,
              booking: { space: { title: 'Test' } },
              host: { first_name: 'Test', last_name: 'Host' }
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

    await page.goto('/my-documents');
    
    // Change year filter
    const yearSelect = page.locator('select').filter({ hasText: /202/i });
    await yearSelect.selectOption({ label: String(new Date().getFullYear()) });
    
    await page.waitForTimeout(500);

    // Verify filtered results
    const receiptCount = page.getByText(/RIC-2025/i);
    await expect(receiptCount).toBeVisible();
  });
});
