import { Page, expect } from '@playwright/test';
import { fiscalTestFixtures } from '../fixtures/fiscal-fixtures';

/**
 * Fiscal Test Utilities
 * Helper functions for E2E fiscal tests
 */

export async function loginAsHost(page: Page, hostType: keyof typeof fiscalTestFixtures.hosts) {
  const host = fiscalTestFixtures.hosts[hostType];
  await page.goto('/login');
  await page.fill('input[type="email"]', host.email);
  await page.fill('input[type="password"]', host.password);
  await page.click('button[type="submit"]');
  await page.waitForURL('/', { timeout: 10000 });
}

export async function loginAsCoworker(page: Page, coworkerType: keyof typeof fiscalTestFixtures.coworkers) {
  const coworker = fiscalTestFixtures.coworkers[coworkerType];
  await page.goto('/login');
  await page.fill('input[type="email"]', coworker.email);
  await page.fill('input[type="password"]', coworker.password);
  await page.click('button[type="submit"]');
  await page.waitForURL('/', { timeout: 10000 });
}

export async function loginAsAdmin(page: Page) {
  const admin = fiscalTestFixtures.admin;
  await page.goto('/login');
  await page.fill('input[type="email"]', admin.email);
  await page.fill('input[type="password"]', admin.password);
  await page.click('button[type="submit"]');
  await page.waitForURL('/', { timeout: 10000 });
}

export async function createTestSpace(page: Page, spaceData: any) {
  await page.goto('/host/spaces/new');
  await page.fill('[name="title"]', spaceData.title);
  await page.fill('[name="description"]', spaceData.description);
  await page.fill('[name="price_per_day"]', spaceData.price_per_day.toString());
  await page.fill('[name="city"]', spaceData.city);
  await page.fill('[name="address"]', spaceData.address);
  await page.fill('[name="capacity"]', spaceData.capacity.toString());
  await page.click('button[type="submit"]');
  await page.waitForURL('/host/spaces', { timeout: 10000 });
}

export async function createTestBooking(page: Page, spaceId: string, bookingDate: string) {
  await page.goto(`/spaces/${spaceId}`);
  await page.fill('[name="booking_date"]', bookingDate);
  await page.click('[data-testid="book-now-button"]');
  await page.waitForURL(/\/booking\//, { timeout: 10000 });
}

export async function verifyInvoiceGenerated(page: Page, bookingId: string) {
  const invoice = await page.evaluate(async (id) => {
    // @ts-ignore - Supabase client available globally in test context
    const { data, error } = await supabase
      .from('invoices')
      .select('*')
      .eq('booking_id', id)
      .maybeSingle();
    return data;
  }, bookingId);
  
  expect(invoice).toBeTruthy();
  return invoice;
}

export async function verifyNonFiscalReceiptGenerated(page: Page, bookingId: string) {
  const receipt = await page.evaluate(async (id) => {
    // @ts-ignore
    const { data, error } = await supabase
      .from('non_fiscal_receipts')
      .select('*')
      .eq('booking_id', id)
      .maybeSingle();
    return data;
  }, bookingId);
  
  expect(receipt).toBeTruthy();
  return receipt;
}

export async function verifyPaymentUpdated(page: Page, paymentId: string, expectedFields: any) {
  const payment = await page.evaluate(async (id) => {
    // @ts-ignore
    const { data } = await supabase
      .from('payments')
      .select('*')
      .eq('id', id)
      .single();
    return data;
  }, paymentId);
  
  for (const [key, value] of Object.entries(expectedFields)) {
    expect(payment[key]).toBe(value);
  }
  return payment;
}

export async function updateBookingStatus(page: Page, bookingId: string, newStatus: string) {
  await page.evaluate(async ({ id, status }) => {
    // @ts-ignore
    await supabase
      .from('bookings')
      .update({ status })
      .eq('id', id);
  }, { id: bookingId, status: newStatus });
  
  await page.waitForTimeout(2000); // Wait for edge functions to trigger
}

export async function triggerInvoiceReminders(page: Page) {
  const response = await page.evaluate(async () => {
    // @ts-ignore
    const { data, error } = await supabase.functions.invoke('send-invoice-reminders');
    return { data, error };
  });
  return response;
}

export async function downloadFile(page: Page, bucket: string, filePath: string) {
  const response = await page.evaluate(async ({ bucketName, path }) => {
    // @ts-ignore
    const { data, error } = await supabase.storage.from(bucketName).download(path);
    return { success: !error, error };
  }, { bucketName: bucket, path: filePath });
  
  return response;
}

export async function attemptUnauthorizedAccess(page: Page, resourceUrl: string) {
  await page.goto(resourceUrl);
  const hasAccessDenied = await page.getByText(/accesso negato|non autorizzato|access denied/i).isVisible({ timeout: 3000 }).catch(() => false);
  return hasAccessDenied;
}

export async function fillFiscalDataForm(page: Page, fiscalData: any) {
  if (fiscalData.fiscal_regime) {
    await page.selectOption('[name="fiscal_regime"]', fiscalData.fiscal_regime);
  }
  if (fiscalData.tax_id) {
    await page.fill('[name="tax_id"]', fiscalData.tax_id);
  }
  if (fiscalData.vat_number) {
    await page.fill('[name="vat_number"]', fiscalData.vat_number);
  }
  if (fiscalData.pec_email) {
    await page.fill('[name="pec_email"]', fiscalData.pec_email);
  }
  if (fiscalData.sdi_code) {
    await page.fill('[name="sdi_code"]', fiscalData.sdi_code);
  }
  if (fiscalData.iban) {
    await page.fill('[name="iban"]', fiscalData.iban);
  }
  if (fiscalData.legal_address) {
    await page.fill('[name="legal_address"]', fiscalData.legal_address);
  }
}

export async function waitForNotification(page: Page, notificationType: string, timeout = 5000) {
  await page.waitForSelector(`[data-notification-type="${notificationType}"]`, { timeout });
}

export async function verifyKYCStatus(page: Page, hostId: string, expectedStatus: boolean) {
  const profile = await page.evaluate(async (id) => {
    // @ts-ignore
    const { data } = await supabase
      .from('profiles')
      .select('kyc_documents_verified')
      .eq('id', id)
      .single();
    return data;
  }, hostId);
  
  expect(profile.kyc_documents_verified).toBe(expectedStatus);
}

export async function getLatestPayment(page: Page, bookingId: string) {
  const payment = await page.evaluate(async (id) => {
    // @ts-ignore
    const { data } = await supabase
      .from('payments')
      .select('*')
      .eq('booking_id', id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    return data;
  }, bookingId);
  
  return payment;
}
