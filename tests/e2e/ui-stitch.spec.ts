import { test, expect } from '@playwright/test';

test.describe('UI Stitch Theme Snapshots', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('Landing page with Stitch theme', async ({ page }) => {
    await page.goto('/?theme=stitch');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000); // Wait for lazy components

    const screenshot = await page.screenshot({ fullPage: true });
    expect(screenshot).toMatchSnapshot('landing-stitch.png');
  });

  test('Spaces catalog with Stitch theme', async ({ page }) => {
    await page.goto('/spaces?theme=stitch');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500); // Wait for map

    const screenshot = await page.screenshot();
    expect(screenshot).toMatchSnapshot('spaces-catalog-stitch.png');
  });

  test('Space detail with Stitch theme', async ({ page }) => {
    const mockSpaceId = '550e8400-e29b-41d4-a716-446655440000';
    
    // Mock space RPC response
    await page.route('**/rest/v1/rpc/get_space_with_host_info', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([{
          id: mockSpaceId,
          title: 'Test Space for Stitch Theme',
          description: 'Mock space for visual regression testing',
          category: 'professional',
          max_capacity: 10,
          confirmation_type: 'instant',
          price_per_hour: 15,
          price_per_day: 100,
          address: 'Via Test 123, Milano',
          latitude: 45.4642,
          longitude: 9.1900,
          photos: ['https://via.placeholder.com/800x600'],
          created_at: new Date().toISOString(),
          rating: 4.5,
          review_count: 10,
          is_verified: true,
          is_superhost: false,
          host_first_name: 'Mario',
          host_last_name: 'Rossi',
          host_profile_photo: null,
          host_bio: 'Host di test',
          host_created_at: new Date().toISOString(),
          host_total_spaces: 1,
          host_stripe_account_id: 'acct_test',
          host_stripe_connected: true,
        }])
      });
    });

    await page.goto(`/spaces/${mockSpaceId}?theme=stitch`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);

    const screenshot = await page.screenshot({ fullPage: true });
    expect(screenshot).toMatchSnapshot('space-detail-stitch.png');
  });

  // TODO: add /messages, /host/dashboard, /admin
});

test.describe('Classic Theme (regression)', () => {
  test('Landing page classic unchanged', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const screenshot = await page.screenshot({ fullPage: true });
    expect(screenshot).toMatchSnapshot('landing-classic.png');
  });
});
