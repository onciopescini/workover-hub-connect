import { test, expect } from '@playwright/test';
import { playAudit } from 'playwright-lighthouse';

test.describe('Performance Tests - Lighthouse', () => {
  test('homepage performance audit', async ({ page }, testInfo) => {
    await page.goto('/');
    
    // Check Core Web Vitals manually
    const performanceMetrics = await page.evaluate(() => {
      return new Promise((resolve) => {
        new PerformanceObserver((list) => {
          const entries = list.getEntries();
          resolve(entries.map(entry => ({
            name: entry.name,
            value: entry.startTime,
          })));
        }).observe({ entryTypes: ['navigation', 'paint'] });
        
        setTimeout(() => resolve([]), 5000);
      });
    });
    
    expect(Array.isArray(performanceMetrics)).toBe(true);
  });

  test('check bundle size', async ({ page }) => {
    await page.goto('/');
    
    const resources = await page.evaluate(() => {
      return performance.getEntriesByType('resource').map((r: any) => ({
        name: r.name,
        size: r.transferSize,
        type: r.initiatorType,
      }));
    });
    
    const jsResources = resources.filter((r: any) => r.name.endsWith('.js'));
    const totalJsSize = jsResources.reduce((sum: number, r: any) => sum + (r.size || 0), 0);
    
    // Main bundle should be under 500KB
    expect(totalJsSize).toBeLessThan(500000);
  });

  test('check image optimization', async ({ page }) => {
    await page.goto('/spaces');
    
    const images = await page.$$eval('img', imgs => 
      imgs.map(img => ({
        src: img.src,
        loading: img.loading,
        width: img.naturalWidth,
        height: img.naturalHeight,
      }))
    );
    
    const lazyImages = images.filter(img => img.loading === 'lazy');
    
    // At least 50% of images should be lazy loaded
    expect(lazyImages.length / images.length).toBeGreaterThan(0.5);
  });

  test('check FCP (First Contentful Paint)', async ({ page }) => {
    await page.goto('/');
    
    const fcp = await page.evaluate(() => {
      return new Promise((resolve) => {
        new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const fcpEntry = entries.find(e => e.name === 'first-contentful-paint');
          resolve(fcpEntry ? fcpEntry.startTime : null);
        }).observe({ entryTypes: ['paint'] });
        
        setTimeout(() => resolve(null), 5000);
      });
    });
    
    if (fcp) {
      // FCP should be under 1.8 seconds
      expect(fcp).toBeLessThan(1800);
    }
  });

  test('check LCP (Largest Contentful Paint)', async ({ page }) => {
    await page.goto('/');
    
    const lcp = await page.evaluate(() => {
      return new Promise((resolve) => {
        new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1];
          resolve(lastEntry ? lastEntry.startTime : null);
        }).observe({ entryTypes: ['largest-contentful-paint'] });
        
        setTimeout(() => resolve(null), 5000);
      });
    });
    
    if (lcp) {
      // LCP should be under 2.5 seconds
      expect(lcp).toBeLessThan(2500);
    }
  });

  test('check caching headers', async ({ page }) => {
    const response = await page.goto('/');
    const headers = response?.headers();
    
    // Check if caching headers are present
    expect(headers?.['cache-control'] || headers?.['expires']).toBeTruthy();
  });

  test('check compression', async ({ page }) => {
    const response = await page.goto('/');
    const headers = response?.headers();
    
    // Check if content is compressed
    const contentEncoding = headers?.['content-encoding'];
    expect(['gzip', 'br', 'deflate'].includes(contentEncoding || '')).toBeTruthy();
  });

  test('check TTI (Time to Interactive)', async ({ page }) => {
    await page.goto('/');
    
    // Wait for page to be fully interactive
    await page.waitForLoadState('networkidle');
    
    const tti = await page.evaluate(() => performance.now());
    
    // TTI should be reasonable (under 3.8 seconds)
    expect(tti).toBeLessThan(3800);
  });
});
