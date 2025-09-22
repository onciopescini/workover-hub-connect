import { test, expect } from '@playwright/test';

test.describe('Photo Gallery', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to a space detail page with photos
    await page.goto('/spaces/test-space-with-photos');
    await page.waitForLoadState('networkidle');
  });

  test('displays 5-tile gallery layout', async ({ page }) => {
    // Check that main gallery tiles are visible
    await expect(page.getByTestId('gallery-tile-0')).toBeVisible();
    await expect(page.getByTestId('gallery-tile-1')).toBeVisible();
    await expect(page.getByTestId('gallery-tile-2')).toBeVisible();
    await expect(page.getByTestId('gallery-tile-3')).toBeVisible();
    await expect(page.getByTestId('gallery-tile-4')).toBeVisible();

    // Check "Show all photos" button
    await expect(page.getByTestId('show-all-photos-button')).toBeVisible();
  });

  test('opens lightbox when clicking on tile #3', async ({ page }) => {
    // Wait for gallery to load
    await page.waitForSelector('[data-testid="gallery-tile-2"]');
    
    // Click on the third tile (index 2)
    await page.getByTestId('gallery-tile-2').click();

    // Check that lightbox opens
    await expect(page.getByTestId('photo-lightbox')).toBeVisible();
    
    // Check that it shows the 3rd photo (index 2)
    await expect(page.getByTestId('lightbox-image-2')).toBeVisible();
    await expect(page.getByText('3 /')).toBeVisible();
  });

  test('keyboard navigation in lightbox', async ({ page }) => {
    // Wait for gallery to load and open lightbox
    await page.waitForSelector('[data-testid="gallery-tile-0"]');
    await page.getByTestId('gallery-tile-0').click();
    await expect(page.getByTestId('photo-lightbox')).toBeVisible();

    // Test right arrow key
    await page.keyboard.press('ArrowRight');
    await expect(page.getByTestId('lightbox-image-1')).toBeVisible();
    await expect(page.getByText('2 /')).toBeVisible();

    // Test left arrow key
    await page.keyboard.press('ArrowLeft');
    await expect(page.getByTestId('lightbox-image-0')).toBeVisible();
    await expect(page.getByText('1 /')).toBeVisible();

    // Test Escape key closes lightbox
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('photo-lightbox')).not.toBeVisible();
  });

  test('focus management in lightbox', async ({ page }) => {
    // Store the element that will open the lightbox
    const trigger = page.getByTestId('gallery-tile-0');
    await trigger.waitFor();
    
    // Open lightbox
    await trigger.click();
    await expect(page.getByTestId('photo-lightbox')).toBeVisible();

    // Check that focus is on the close button (first focusable element)
    await expect(page.getByTestId('close-button')).toBeFocused();

    // Close with Escape and check focus returns
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('photo-lightbox')).not.toBeVisible();
    
    // Focus should return to the trigger element
    await expect(trigger).toBeFocused();
  });

  test('mobile swipe navigation', async ({ page, browserName }) => {
    // Skip in Firefox as it has different touch behavior
    test.skip(browserName === 'firefox', 'Touch events behave differently in Firefox');

    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Wait for gallery to load and open lightbox
    await page.waitForSelector('[data-testid="gallery-tile-0"]');
    await page.getByTestId('gallery-tile-0').click();
    await expect(page.getByTestId('photo-lightbox')).toBeVisible();

    const lightboxImage = page.getByTestId('lightbox-image-0');
    
    // Simulate swipe left (next image)
    await lightboxImage.dispatchEvent('touchstart', {
      touches: [{ clientX: 200, clientY: 300 }]
    });
    await lightboxImage.dispatchEvent('touchmove', {
      touches: [{ clientX: 100, clientY: 300 }]
    });
    await lightboxImage.dispatchEvent('touchend', {});

    // Should move to next image
    await expect(page.getByTestId('lightbox-image-1')).toBeVisible();
    await expect(page.getByText('2 /')).toBeVisible();

    // Simulate swipe right (previous image)
    const nextImage = page.getByTestId('lightbox-image-1');
    await nextImage.dispatchEvent('touchstart', {
      touches: [{ clientX: 100, clientY: 300 }]
    });
    await nextImage.dispatchEvent('touchmove', {
      touches: [{ clientX: 200, clientY: 300 }]
    });
    await nextImage.dispatchEvent('touchend', {});

    // Should move back to first image
    await expect(page.getByTestId('lightbox-image-0')).toBeVisible();
    await expect(page.getByText('1 /')).toBeVisible();
  });

  test('handles different photo counts', async ({ page }) => {
    // Test with 1 photo
    await page.goto('/spaces/test-space-one-photo');
    await expect(page.getByTestId('gallery-tile-0')).toBeVisible();
    await expect(page.getByText('Mostra tutte le foto (1)')).toBeVisible();
    
    // Should show empty slots
    await expect(page.getByTestId('empty-slot-0')).toBeVisible();
    await expect(page.getByTestId('empty-slot-1')).toBeVisible();
    await expect(page.getByTestId('empty-slot-2')).toBeVisible();
    await expect(page.getByTestId('empty-slot-3')).toBeVisible();

    // Test with 12 photos (overlay)
    await page.goto('/spaces/test-space-many-photos');
    await expect(page.getByText('+7')).toBeVisible(); // 12 - 5 = 7
    await expect(page.getByText('Mostra tutte le foto (12)')).toBeVisible();

    // Test with no photos
    await page.goto('/spaces/test-space-no-photos');
    await expect(page.getByTestId('no-photos-message')).toBeVisible();
    await expect(page.getByText('Nessuna foto disponibile')).toBeVisible();
  });

  test('navigation buttons work correctly', async ({ page }) => {
    // Open lightbox
    await page.getByTestId('gallery-tile-0').click();
    await expect(page.getByTestId('photo-lightbox')).toBeVisible();

    // Test next button
    await page.getByTestId('next-button').click();
    await expect(page.getByTestId('lightbox-image-1')).toBeVisible();

    // Test previous button
    await page.getByTestId('prev-button').click();
    await expect(page.getByTestId('lightbox-image-0')).toBeVisible();

    // Test close button
    await page.getByTestId('close-button').click();
    await expect(page.getByTestId('photo-lightbox')).not.toBeVisible();
  });

  test('thumbnail toggle functionality', async ({ page }) => {
    // Open lightbox
    await page.getByTestId('gallery-tile-0').click();
    await expect(page.getByTestId('photo-lightbox')).toBeVisible();

    // Toggle thumbnails on
    await page.getByTestId('thumbnail-toggle').click();
    
    // Should show thumbnail strip
    await expect(page.getByText('Nascondi miniature')).toBeVisible();
    
    // Should see thumbnail images
    const thumbnails = page.locator('[aria-label^="Vai alla foto"]');
    await expect(thumbnails.first()).toBeVisible();

    // Toggle thumbnails off
    await page.getByTestId('thumbnail-toggle').click();
    await expect(page.getByText('Mostra miniature')).toBeVisible();
  });

  test('accessibility features', async ({ page }) => {
    // Check gallery has proper structure
    const gallery = page.locator('.grid.grid-cols-4');
    await expect(gallery).toBeVisible();

    // Open lightbox and check accessibility attributes
    await page.getByTestId('gallery-tile-0').click();
    
    const lightbox = page.getByTestId('photo-lightbox');
    await expect(lightbox).toHaveAttribute('role', 'dialog');
    await expect(lightbox).toHaveAttribute('aria-modal', 'true');
    await expect(lightbox).toHaveAttribute('aria-labelledby', 'lightbox-title');

    // Check buttons have proper labels
    await expect(page.getByTestId('close-button')).toHaveAttribute('aria-label', 'Chiudi galleria');
    await expect(page.getByTestId('prev-button')).toHaveAttribute('aria-label', 'Foto precedente');
    await expect(page.getByTestId('next-button')).toHaveAttribute('aria-label', 'Foto successiva');
  });

  test('handles hover states and transitions', async ({ page }) => {
    // Check hover state on gallery tiles
    const mainTile = page.getByTestId('gallery-tile-0');
    await mainTile.hover();
    
    // Check that "Show all photos" button appears on hover
    const showAllButton = page.getByTestId('show-all-photos-button');
    await expect(showAllButton).toBeVisible();
  });
});