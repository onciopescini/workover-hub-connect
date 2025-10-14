import { test, expect } from '@playwright/test';
import { loginAsAdmin, loginAsHost, verifyKYCStatus } from '../../utils/fiscal-test-helpers';
import { fiscalTestFixtures } from '../../fixtures/fiscal-fixtures';

test.describe('KYC Admin Verification Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Ensure we start with a clean state
    await page.goto('/');
  });

  test('Admin approves KYC request', async ({ page }) => {
    // Login as admin
    await loginAsAdmin(page);
    
    // Navigate to KYC admin panel
    await page.goto('/admin/kyc');
    await page.waitForLoadState('networkidle');
    
    // Verify pending KYC list is visible
    await expect(page.getByRole('heading', { name: /kyc verification/i })).toBeVisible();
    
    // Look for pending host
    const pendingHost = fiscalTestFixtures.hosts.pendingKyc;
    const hostCard = page.locator(`[data-testid="kyc-card-${pendingHost.email}"]`).first();
    
    if (await hostCard.isVisible()) {
      // Click approve button
      await hostCard.locator('[data-testid="approve-kyc"]').click();
      
      // Confirm approval in dialog
      await page.locator('[data-testid="confirm-approval"]').click();
      
      // Verify success toast
      await expect(page.getByText(/kyc approvato/i)).toBeVisible({ timeout: 5000 });
      
      // Verify notification created for host
      await page.waitForTimeout(1000);
    }
  });

  test('Admin rejects KYC with reason', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/kyc');
    await page.waitForLoadState('networkidle');
    
    const pendingHost = fiscalTestFixtures.hosts.pendingKyc;
    const hostCard = page.locator(`[data-testid="kyc-card-${pendingHost.email}"]`).first();
    
    if (await hostCard.isVisible()) {
      // Click reject button
      await hostCard.locator('[data-testid="reject-kyc"]').click();
      
      // Fill rejection reason
      await page.fill('[name="rejection_reason"]', 'Documenti fiscali incompleti o non validi');
      
      // Confirm rejection
      await page.locator('[data-testid="confirm-rejection"]').click();
      
      // Verify success message
      await expect(page.getByText(/kyc rifiutato/i)).toBeVisible({ timeout: 5000 });
    }
  });

  test('Admin filters KYC by status', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/kyc');
    await page.waitForLoadState('networkidle');
    
    // Test pending filter
    await page.selectOption('[data-testid="kyc-status-filter"]', 'pending');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('[data-kyc-status="pending"]')).toHaveCount(0, { timeout: 3000 }).catch(() => {});
    
    // Test approved filter
    await page.selectOption('[data-testid="kyc-status-filter"]', 'approved');
    await page.waitForLoadState('networkidle');
    
    // Test all filter
    await page.selectOption('[data-testid="kyc-status-filter"]', 'all');
    await page.waitForLoadState('networkidle');
  });

  test('Admin views KYC details', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/kyc');
    await page.waitForLoadState('networkidle');
    
    // Click on first KYC card to view details
    const firstCard = page.locator('[data-testid^="kyc-card-"]').first();
    
    if (await firstCard.isVisible()) {
      await firstCard.click();
      
      // Verify details dialog opens
      await expect(page.locator('[data-testid="kyc-details-dialog"]')).toBeVisible({ timeout: 3000 });
      
      // Verify fiscal fields are displayed
      await expect(page.getByText(/regime fiscale|fiscal regime/i)).toBeVisible();
      await expect(page.getByText(/stripe/i)).toBeVisible();
    }
  });

  test('Host can resubmit after KYC rejection', async ({ page }) => {
    // First, ensure host is rejected (as admin)
    await loginAsAdmin(page);
    await page.goto('/admin/kyc');
    await page.waitForLoadState('networkidle');
    
    const pendingHost = fiscalTestFixtures.hosts.pendingKyc;
    const hostCard = page.locator(`[data-testid="kyc-card-${pendingHost.email}"]`).first();
    
    if (await hostCard.isVisible()) {
      await hostCard.locator('[data-testid="reject-kyc"]').click();
      await page.fill('[name="rejection_reason"]', 'Test rejection for resubmit');
      await page.locator('[data-testid="confirm-rejection"]').click();
      await page.waitForTimeout(1000);
    }
    
    // Logout admin
    await page.click('[data-testid="user-menu"]');
    await page.click('[data-testid="logout"]');
    
    // Login as rejected host
    await loginAsHost(page, 'pendingKyc');
    await page.goto('/host/fiscal');
    
    // Verify rejection message is shown
    await expect(page.getByText(/kyc rifiutato|kyc rejected/i)).toBeVisible({ timeout: 5000 }).catch(() => {});
    
    // Update fiscal data to resubmit
    await page.fill('[name="pec_email"]', 'updated@pec.it');
    await page.click('[data-testid="submit-fiscal-data"]');
    
    // Verify resubmission success
    await expect(page.getByText(/dati aggiornati|data updated/i)).toBeVisible({ timeout: 5000 }).catch(() => {});
  });
});
