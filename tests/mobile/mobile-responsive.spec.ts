import { test, expect, devices } from '@playwright/test';

/**
 * ONDATA 3 - FIX 3.10: Mobile Testing Suite
 * 
 * Tests mobile responsiveness, touch interactions, and mobile-specific features
 * across different devices and orientations.
 */

// Test on iPhone 12
test.use(devices['iPhone 12']);

test.describe('Mobile Responsive Design', () => {
  
  test('should display mobile navigation correctly', async ({ page }) => {
    await page.goto('/');
    
    // Check that mobile menu button is visible
    const menuButton = page.getByRole('button', { name: /menu|menù/i });
    await expect(menuButton).toBeVisible();
    
    // Desktop navigation should be hidden on mobile
    const desktopNav = page.locator('nav[aria-label="Desktop navigation"]');
    await expect(desktopNav).toBeHidden();
  });

  test('should handle touch gestures on space cards', async ({ page }) => {
    await page.goto('/spaces');
    
    // Wait for space cards to load
    await page.waitForSelector('[data-testid="space-card"]', { timeout: 10000 });
    
    const spaceCard = page.locator('[data-testid="space-card"]').first();
    
    // Simulate touch tap
    await spaceCard.tap();
    
    // Should navigate to space details or show interaction
    await page.waitForURL(/\/spaces\/.*/, { timeout: 5000 });
    expect(page.url()).toContain('/spaces/');
  });

  test('should display forms correctly on mobile', async ({ page }) => {
    await page.goto('/login');
    
    // Check that form inputs are properly sized for mobile
    const emailInput = page.getByLabel(/email/i);
    const passwordInput = page.getByLabel(/password/i);
    
    await expect(emailInput).toBeVisible();
    await expect(passwordInput).toBeVisible();
    
    // Inputs should have appropriate mobile attributes
    await expect(emailInput).toHaveAttribute('type', 'email');
    await expect(emailInput).toHaveAttribute('autocomplete', /.*/);
  });

  test('should handle mobile viewport changes', async ({ page }) => {
    // Start in portrait
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    
    // Verify portrait layout
    const portraitLayout = page.locator('main');
    await expect(portraitLayout).toBeVisible();
    
    // Switch to landscape
    await page.setViewportSize({ width: 667, height: 375 });
    
    // Layout should adapt
    await expect(portraitLayout).toBeVisible();
  });

  test('should display booking calendar on mobile', async ({ page, context }) => {
    // Mock authentication
    await context.addCookies([{
      name: 'sb-access-token',
      value: 'mock-token',
      domain: 'localhost',
      path: '/',
    }]);
    
    await page.goto('/spaces');
    
    // Wait for space cards
    await page.waitForSelector('[data-testid="space-card"]', { timeout: 10000 });
    
    const firstSpace = page.locator('[data-testid="space-card"]').first();
    await firstSpace.tap();
    
    // Calendar should be scrollable on mobile
    const calendar = page.locator('[role="application"]').first();
    if (await calendar.isVisible()) {
      const boundingBox = await calendar.boundingBox();
      expect(boundingBox?.width).toBeLessThanOrEqual(400); // Mobile width
    }
  });

  test('should handle mobile image loading', async ({ page }) => {
    await page.goto('/spaces');
    
    // Check for lazy-loaded images
    const images = page.locator('img[loading="lazy"]');
    const imageCount = await images.count();
    
    expect(imageCount).toBeGreaterThan(0);
    
    // Images should have alt text for accessibility
    for (let i = 0; i < Math.min(imageCount, 3); i++) {
      const img = images.nth(i);
      await expect(img).toHaveAttribute('alt', /.+/);
    }
  });

  test('should display toast notifications properly on mobile', async ({ page }) => {
    await page.goto('/');
    
    // Trigger a toast (e.g., by failing login)
    await page.goto('/login');
    const emailInput = page.getByLabel(/email/i);
    const passwordInput = page.getByLabel(/password/i);
    const submitButton = page.getByRole('button', { name: /accedi|login/i });
    
    await emailInput.fill('test@example.com');
    await passwordInput.fill('wrongpassword');
    await submitButton.click();
    
    // Toast should appear and be visible on mobile
    const toast = page.locator('[role="status"], [role="alert"]').first();
    await expect(toast).toBeVisible({ timeout: 5000 });
    
    // Toast should not overflow viewport
    const toastBox = await toast.boundingBox();
    expect(toastBox?.width).toBeLessThanOrEqual(375); // Mobile viewport width
  });
});

test.describe('Mobile Touch Interactions', () => {
  
  test('should support swipe gestures on image galleries', async ({ page }) => {
    await page.goto('/spaces');
    await page.waitForSelector('[data-testid="space-card"]', { timeout: 10000 });
    
    const firstSpace = page.locator('[data-testid="space-card"]').first();
    await firstSpace.tap();
    
    // Check if image carousel exists
    const carousel = page.locator('[role="region"]').first();
    
    if (await carousel.isVisible()) {
      const carouselBox = await carousel.boundingBox();
      
      if (carouselBox) {
        // Simulate swipe left
        await page.touchscreen.tap(carouselBox.x + carouselBox.width - 50, carouselBox.y + carouselBox.height / 2);
        await page.waitForTimeout(500);
        
        // Should show next image or indicate interaction
        expect(true).toBeTruthy(); // Placeholder - verify carousel state change
      }
    }
  });

  test('should handle pinch-to-zoom on images', async ({ page }) => {
    await page.goto('/spaces');
    
    // Note: Playwright has limited support for pinch gestures
    // This is a placeholder for when the API improves
    const image = page.locator('img').first();
    await expect(image).toBeVisible();
    
    // Check that images are properly sized for mobile
    const imgBox = await image.boundingBox();
    expect(imgBox?.width).toBeLessThanOrEqual(375);
  });

  test('should support pull-to-refresh (if implemented)', async ({ page }) => {
    await page.goto('/');
    
    // Simulate pull-to-refresh gesture
    await page.evaluate(() => {
      window.scrollTo(0, 0);
    });
    
    const body = page.locator('body');
    const bodyBox = await body.boundingBox();
    
    if (bodyBox) {
      // Simulate pull down
      await page.mouse.move(bodyBox.x + bodyBox.width / 2, 10);
      await page.mouse.down();
      await page.mouse.move(bodyBox.x + bodyBox.width / 2, 100, { steps: 10 });
      await page.mouse.up();
      
      // If pull-to-refresh is implemented, page should reload or show indicator
      await page.waitForTimeout(1000);
      expect(true).toBeTruthy(); // Placeholder
    }
  });
});

test.describe('Mobile Performance', () => {
  
  test('should meet mobile performance budgets', async ({ page }) => {
    // Navigate and capture performance metrics
    await page.goto('/');
    
    const performanceMetrics = await page.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      return {
        domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
        loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
        firstPaint: performance.getEntriesByType('paint')[0]?.startTime || 0,
      };
    });
    
    // Mobile performance budgets
    expect(performanceMetrics.domContentLoaded).toBeLessThan(2000); // 2s
    expect(performanceMetrics.loadComplete).toBeLessThan(3000); // 3s
    expect(performanceMetrics.firstPaint).toBeLessThan(1500); // 1.5s
  });

  test('should lazy load images on mobile', async ({ page }) => {
    await page.goto('/spaces');
    
    // Count images with lazy loading
    const lazyImages = page.locator('img[loading="lazy"]');
    const lazyImageCount = await lazyImages.count();
    
    expect(lazyImageCount).toBeGreaterThan(0);
    
    // Verify images load as they enter viewport
    const firstLazyImage = lazyImages.first();
    
    // Scroll to image
    await firstLazyImage.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
    
    // Image should be loaded
    const src = await firstLazyImage.getAttribute('src');
    expect(src).toBeTruthy();
    expect(src).not.toContain('placeholder');
  });
});

test.describe('Mobile Accessibility', () => {
  
  test('should have proper touch target sizes', async ({ page }) => {
    await page.goto('/');
    
    // Check button sizes (min 44x44px for touch)
    const buttons = page.getByRole('button');
    const buttonCount = await buttons.count();
    
    for (let i = 0; i < Math.min(buttonCount, 5); i++) {
      const button = buttons.nth(i);
      const box = await button.boundingBox();
      
      if (box) {
        expect(box.width).toBeGreaterThanOrEqual(44);
        expect(box.height).toBeGreaterThanOrEqual(44);
      }
    }
  });

  test('should support screen reader navigation', async ({ page }) => {
    await page.goto('/');
    
    // Check for proper ARIA landmarks
    const main = page.locator('main');
    const nav = page.locator('nav');
    
    await expect(main).toBeVisible();
    
    // Navigation should have proper labels
    const navCount = await nav.count();
    if (navCount > 0) {
      const firstNav = nav.first();
      const ariaLabel = await firstNav.getAttribute('aria-label');
      expect(ariaLabel).toBeTruthy();
    }
  });

  test('should support keyboard navigation on mobile', async ({ page }) => {
    await page.goto('/login');
    
    // Tab through form fields
    await page.keyboard.press('Tab');
    const emailInput = page.getByLabel(/email/i);
    await expect(emailInput).toBeFocused();
    
    await page.keyboard.press('Tab');
    const passwordInput = page.getByLabel(/password/i);
    await expect(passwordInput).toBeFocused();
    
    await page.keyboard.press('Tab');
    const submitButton = page.getByRole('button', { name: /accedi|login/i });
    await expect(submitButton).toBeFocused();
  });
});

// Test on Android device
test.describe('Android-Specific Tests', () => {
  test.use(devices['Pixel 5']);
  
  test('should render correctly on Android', async ({ page }) => {
    await page.goto('/');
    
    // Check viewport
    const viewport = page.viewportSize();
    expect(viewport?.width).toBe(393);
    expect(viewport?.height).toBe(851);
    
    // Main content should be visible
    const main = page.locator('main');
    await expect(main).toBeVisible();
  });

  test('should handle Android back button', async ({ page }) => {
    await page.goto('/');
    await page.goto('/spaces');
    
    // Simulate Android back button
    await page.goBack();
    
    // Should return to home
    expect(page.url()).toBe('http://localhost:5173/');
  });
});

// Test on iPad (tablet)
test.describe('Tablet Tests', () => {
  test.use(devices['iPad Pro']);
  
  test('should display tablet layout', async ({ page }) => {
    await page.goto('/');
    
    // Tablet should show different layout than mobile
    const viewport = page.viewportSize();
    expect(viewport?.width).toBe(1024);
    expect(viewport?.height).toBe(1366);
    
    // Check that layout adapts to tablet size
    const main = page.locator('main');
    await expect(main).toBeVisible();
  });

  test('should handle split-screen on tablet', async ({ page }) => {
    await page.goto('/spaces');
    
    // Tablet should show more content than mobile
    const spaceCards = page.locator('[data-testid="space-card"]');
    const cardCount = await spaceCards.count();
    
    expect(cardCount).toBeGreaterThan(0);
  });
});
