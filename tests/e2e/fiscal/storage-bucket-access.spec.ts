import { test, expect } from '@playwright/test';
import { loginAsHost, loginAsCoworker, downloadFile } from '../../utils/fiscal-test-helpers';

test.describe('Storage Bucket Access Control', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('Host can download own invoice guide PDF', async ({ page }) => {
    await loginAsHost(page, 'forfettario');
    
    // Navigate to fiscal dashboard
    await page.goto('/host/fiscal');
    await page.click('[data-testid="tab-invoices-to-issue"]');
    await page.waitForLoadState('networkidle');
    
    // Check if any guides are available
    const guideButton = page.locator('[data-testid^="download-fiscal-guide-"]').first();
    
    if (await guideButton.isVisible()) {
      // Get the file path
      const guidePath = await guideButton.getAttribute('data-file-path');
      
      if (guidePath) {
        // Attempt download
        const result = await downloadFile(page, 'host-invoices-guide', guidePath);
        expect(result.success).toBe(true);
      }
    }
  });

  test('Host cannot download another host guide', async ({ page }) => {
    await loginAsHost(page, 'ordinario'); // Login as ordinario
    
    // Try to download a guide belonging to forfettario host
    const forfettarioHostId = '11111111-1111-1111-1111-111111111111';
    const fakePath = `${forfettarioHostId}/guide-test.pdf`;
    
    const result = await downloadFile(page, 'host-invoices-guide', fakePath);
    
    // Should fail due to RLS
    expect(result.success).toBe(false);
    expect(result.error).toBeTruthy();
  });

  test('Coworker can download own non-fiscal receipt', async ({ page }) => {
    await loginAsCoworker(page, 'verified');
    
    // Get a receipt belonging to this coworker
    const receipt = await page.evaluate(async () => {
      // @ts-ignore
      const { data } = await supabase
        .from('non_fiscal_receipts')
        .select('id, booking_id, pdf_url')
        .eq('coworker_id', '66666666-6666-6666-6666-666666666666')
        .limit(1)
        .maybeSingle();
      return data;
    });
    
    if (receipt && receipt.pdf_url) {
      // Extract path from URL
      const path = receipt.pdf_url.split('/').slice(-2).join('/');
      
      const result = await downloadFile(page, 'non-fiscal-receipts', path);
      expect(result.success).toBe(true);
    }
  });

  test('Coworker cannot download another coworker receipt', async ({ page }) => {
    await loginAsCoworker(page, 'verified');
    
    // Try to access a receipt from a different coworker
    const otherReceipt = await page.evaluate(async () => {
      // @ts-ignore
      const { data } = await supabase
        .from('non_fiscal_receipts')
        .select('id, pdf_url')
        .neq('coworker_id', '66666666-6666-6666-6666-666666666666')
        .limit(1)
        .maybeSingle();
      return data;
    });
    
    if (otherReceipt && otherReceipt.pdf_url) {
      const path = otherReceipt.pdf_url.split('/').slice(-2).join('/');
      
      const result = await downloadFile(page, 'non-fiscal-receipts', path);
      
      // Should fail
      expect(result.success).toBe(false);
    }
  });

  test('Unauthorized user cannot access invoices bucket', async ({ page }) => {
    // Try to access without login
    await page.goto('/');
    
    const result = await page.evaluate(async () => {
      // @ts-ignore
      const { data, error } = await supabase.storage
        .from('invoices')
        .list();
      return { data, error };
    });
    
    // Should fail or return empty
    expect(result.error || !result.data?.length).toBeTruthy();
  });

  test('Admin can access all storage buckets', async ({ page }) => {
    await loginAsAdmin(page);
    
    // Admin should list files in invoices bucket
    const invoicesResult = await page.evaluate(async () => {
      // @ts-ignore
      const { data, error } = await supabase.storage
        .from('invoices')
        .list('', { limit: 5 });
      return { data, error };
    });
    
    expect(invoicesResult.error).toBeNull();
    
    // Admin should list files in host-invoices-guide
    const guidesResult = await page.evaluate(async () => {
      // @ts-ignore
      const { data, error } = await supabase.storage
        .from('host-invoices-guide')
        .list('', { limit: 5 });
      return { data, error };
    });
    
    expect(guidesResult.error).toBeNull();
    
    // Admin should list files in non-fiscal-receipts
    const receiptsResult = await page.evaluate(async () => {
      // @ts-ignore
      const { data, error } = await supabase.storage
        .from('non-fiscal-receipts')
        .list('', { limit: 5 });
      return { data, error };
    });
    
    expect(receiptsResult.error).toBeNull();
  });

  test('Storage RLS prevents direct URL access', async ({ page }) => {
    // Try to construct direct URL to a file
    const projectUrl = 'https://khtqwzvrxzsgfhsslwyz.supabase.co';
    const fakePath = 'invoices/fake-invoice.pdf';
    const directUrl = `${projectUrl}/storage/v1/object/public/${fakePath}`;
    
    // Attempt to access directly
    const response = await page.goto(directUrl);
    
    // Should get 404 or access denied for private bucket
    expect(response?.status()).not.toBe(200);
  });

  test('File upload restricted to authorized users only', async ({ page }) => {
    await loginAsCoworker(page, 'verified');
    
    // Coworker should NOT be able to upload to invoices bucket
    const uploadResult = await page.evaluate(async () => {
      const file = new Blob(['test'], { type: 'application/pdf' });
      
      // @ts-ignore
      const { data, error } = await supabase.storage
        .from('invoices')
        .upload('test-unauthorized.pdf', file);
      
      return { data, error };
    });
    
    // Should fail
    expect(uploadResult.error).toBeTruthy();
  });
});

async function loginAsAdmin(page: any) {
  const admin = {
    email: 'admin@test.workover.app',
    password: 'TestAdmin123!'
  };
  await page.goto('/login');
  await page.fill('input[type="email"]', admin.email);
  await page.fill('input[type="password"]', admin.password);
  await page.click('button[type="submit"]');
  await page.waitForURL('/', { timeout: 10000 });
}
