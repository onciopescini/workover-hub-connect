import { test, expect } from '@playwright/test';

test.describe('UI Stitch Theme Snapshots', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test.beforeEach(async ({ page }) => {
    // Force Stitch theme via query param
    await page.addInitScript(() => {
      window.localStorage.setItem('e2e-theme', 'stitch');
    });
  });

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
    // TODO: usare ID spazio di test/fixture
    await page.goto('/spaces/EXAMPLE_SPACE_ID?theme=stitch');
    await page.waitForLoadState('networkidle');

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
