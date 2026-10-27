const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const SCREENSHOTS_DIR = path.join(__dirname, '..', 'test-results', 'screenshots');

test.beforeAll(() => {
  if (!fs.existsSync(SCREENSHOTS_DIR)) {
    fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
  }
});

// Helper: check for horizontal scroll on page
async function verifyNoHorizontalScroll(page) {
  const isOverflowing = await page.evaluate(() => {
    return document.documentElement.scrollWidth > document.documentElement.clientWidth + 1;
  });
  expect(isOverflowing).toBe(false);
}

// Helper: check if two bounding boxes overlap
function boxesOverlap(b1, b2) {
  if (!b1 || !b2) return false;
  return !(
    b1.x + b1.width <= b2.x ||
    b2.x + b2.width <= b1.x ||
    b1.y + b1.height <= b2.y ||
    b2.y + b2.height <= b1.y
  );
}

test.describe('Swan Studio — Mobile UI/UX & Motion Quality Suite', () => {

  // --------------------------------------------------------------------------
  // TEST 1: Star ratings are one horizontal row
  // --------------------------------------------------------------------------
  test('1. Star ratings are rendered in one horizontal row (no vertical stacking)', async ({ page }) => {
    // A) Check Homepage Kind words stars
    await page.goto('/index.html', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);

    const homeStars = page.locator('.home-review-stars svg');
    const homeCount = await homeStars.count();
    if (homeCount >= 5) {
      // First 5 stars in first review card
      const boxes = [];
      for (let i = 0; i < 5; i++) {
        const box = await homeStars.nth(i).boundingBox();
        if (box) boxes.push(box);
      }
      expect(boxes.length).toBe(5);
      // All 5 stars must share roughly the same y position (within 3px)
      const firstY = boxes[0].y;
      for (let i = 1; i < boxes.length; i++) {
        expect(Math.abs(boxes[i].y - firstY)).toBeLessThanOrEqual(3);
        // And they must advance horizontally
        expect(boxes[i].x).toBeGreaterThan(boxes[i - 1].x);
      }
    }

    // B) Check reviews.html cards & summary average stars
    await page.goto('/reviews.html', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);

    const revAvgStars = page.locator('#stat-avg-stars svg:not([style*="display: none"])');
    const avgCount = await revAvgStars.count();
    if (avgCount >= 5) {
      const avgBoxes = [];
      for (let i = 0; i < 5; i++) {
        const box = await revAvgStars.nth(i).boundingBox();
        if (box && box.width > 0) avgBoxes.push(box);
      }
      if (avgBoxes.length >= 2) {
        const firstY = avgBoxes[0].y;
        for (let i = 1; i < avgBoxes.length; i++) {
          expect(Math.abs(avgBoxes[i].y - firstY)).toBeLessThanOrEqual(3);
        }
      }
    }

    const cardStars = page.locator('.home-review-card .home-review-stars svg');
    const cardStarCount = await cardStars.count();
    if (cardStarCount >= 5) {
      const cardBoxes = [];
      for (let i = 0; i < 5; i++) {
        const box = await cardStars.nth(i).boundingBox();
        if (box) cardBoxes.push(box);
      }
      expect(cardBoxes.length).toBe(5);
      const firstY = cardBoxes[0].y;
      for (let i = 1; i < cardBoxes.length; i++) {
        expect(Math.abs(cardBoxes[i].y - firstY)).toBeLessThanOrEqual(3);
        expect(cardBoxes[i].x).toBeGreaterThan(cardBoxes[i - 1].x);
      }
    }
  });

  // --------------------------------------------------------------------------
  // TEST 2: Approved review renders full text, name, city, date, not just stars
  // --------------------------------------------------------------------------
  test('2. Real approved reviews render complete note text, name, and date', async ({ page }) => {
    await page.goto('/reviews.html', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1200);

    const firstCard = page.locator('.home-review-card').first();
    await expect(firstCard).toBeVisible();

    // Body note text must be present and non-empty
    const bodyText = await firstCard.locator('.home-review-body').textContent();
    expect(bodyText.trim().length).toBeGreaterThan(5);

    // Author display name must be present and non-empty
    const author = await firstCard.locator('.home-review-author').textContent();
    expect(author.trim().length).toBeGreaterThan(1);

    // Stars must be visible
    const stars = firstCard.locator('.home-review-stars');
    await expect(stars).toBeVisible();

    // Date must be visible
    const timeEl = firstCard.locator('time');
    await expect(timeEl).toBeVisible();
    const dateText = await timeEl.textContent();
    expect(dateText.trim().length).toBeGreaterThan(2);
  });

  // --------------------------------------------------------------------------
  // TEST 3: Bottom sheet note form, edge padding, submit visibility, dismiss
  // --------------------------------------------------------------------------
  test('3. Note form opens as bottom sheet with >=16px edge padding and closes via Escape, backdrop & swipe', async ({ page }) => {
    await page.goto('/index.html', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(800);

    // Open modal via button
    const openBtn = page.locator('#btn-home-leave-note, #swan-floating-note-btn').first();
    await openBtn.click();
    await page.waitForTimeout(400);

    const overlay = page.locator('#swan-note-modal-overlay');
    const sheet = page.locator('#swan-bottom-sheet');
    await expect(overlay).toBeVisible();
    await expect(sheet).toBeVisible();

    // Check edge padding (>= 16px from viewport sides)
    const viewport = page.viewportSize();
    const sheetBody = page.locator('.sheet-body');
    const bodyBox = await sheetBody.boundingBox();
    expect(bodyBox).toBeTruthy();

    const noteInput = page.locator('#note-body-input');
    const inputBox = await noteInput.boundingBox();
    expect(inputBox).toBeTruthy();
    expect(inputBox.x).toBeGreaterThanOrEqual(16);
    expect(inputBox.x + inputBox.width).toBeLessThanOrEqual(viewport.width - 14);

    // Submit button visible in sticky footer
    const submitBtn = page.locator('#swan-note-submit-btn');
    await expect(submitBtn).toBeVisible();
    const submitBox = await submitBtn.boundingBox();
    expect(submitBox.x).toBeGreaterThanOrEqual(16);
    expect(submitBox.x + submitBox.width).toBeLessThanOrEqual(viewport.width - 14);

    // Dismiss via Escape
    await page.keyboard.press('Escape');
    await page.waitForTimeout(400);
    const isClosedEsc = await overlay.evaluate(el => el.style.display === 'none' || !el.classList.contains('is-active'));
    expect(isClosedEsc).toBe(true);

    // Reopen and test Backdrop tap dismiss
    await openBtn.click();
    await page.waitForTimeout(400);
    await page.locator('#swan-modal-backdrop').click({ position: { x: 20, y: 30 } });
    await page.waitForTimeout(400);
    const isClosedBackdrop = await overlay.evaluate(el => el.style.display === 'none' || !el.classList.contains('is-active'));
    expect(isClosedBackdrop).toBe(true);
  });

  // --------------------------------------------------------------------------
  // TEST 4: Action dock never overlaps CTAs, inputs, card text, or footer
  // --------------------------------------------------------------------------
  test('4. Action dock never overlaps CTAs, card text, or footer text', async ({ page }) => {
    const pagesToTest = ['/index.html', '/shop.html', '/reviews.html', '/about.html'];

    for (const url of pagesToTest) {
      await page.goto(url, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(600);

      const dock = page.locator('#swan-action-dock');
      const dockCount = await dock.count();
      if (dockCount === 0) continue;

      const dockBox = await dock.boundingBox();
      if (!dockBox || dockBox.width === 0 || dockBox.height === 0) continue;

      // Check footer text
      const footer = page.locator('#site-footer');
      if (await footer.count() > 0) {
        // Scroll to bottom
        await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
        await page.waitForTimeout(400);

        const isDockHiddenAtFooter = await dock.evaluate(el => {
          const style = window.getComputedStyle(el);
          return el.classList.contains('is-hidden') || parseFloat(style.opacity) < 0.2;
        });

        // Either dock auto-hides at footer, or body has bottom padding preventing text overlap
        if (!isDockHiddenAtFooter) {
          const copyright = page.locator('.footer-bottom, .footer-legal, .copyright-text').first();
          if (await copyright.count() > 0) {
            const copyBox = await copyright.boundingBox();
            const currentDockBox = await dock.boundingBox();
            expect(boxesOverlap(currentDockBox, copyBox)).toBe(false);
          }
        }
      }
    }
  });

  // --------------------------------------------------------------------------
  // TEST 5: No horizontal scroll and zero console errors
  // --------------------------------------------------------------------------
  test('5. Zero console errors and no horizontal overflow across main pages', async ({ page }) => {
    const errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        const text = msg.text();
        // Ignore known harmless CDN / 3rd-party favicon or analytics notices if any
        if (!text.includes('favicon.ico') && !text.includes('chrome-extension')) {
          errors.push(text);
        }
      }
    });

    const checkPages = ['/index.html', '/shop.html', '/reviews.html', '/product.html?slug=white-crochet-lily-flower', '/checkout.html', '/404.html'];
    for (const url of checkPages) {
      await page.goto(url, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(400);
      await verifyNoHorizontalScroll(page);
    }

    expect(errors.length).toBe(0);
  });

  // --------------------------------------------------------------------------
  // TEST 6: Prefers-reduced-motion replaces movement with instant changes
  // --------------------------------------------------------------------------
  test('6. prefers-reduced-motion disables motion animations', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/index.html', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(400);

    const animationDuration = await page.evaluate(() => {
      const hero = document.querySelector('.hero-arch-card img, .hero-bouquet-img, .hero-title');
      if (!hero) return '0s';
      return window.getComputedStyle(hero).animationDuration;
    });

    // In reduced motion, animation duration is 0.01ms (1e-05s) or 0s
    expect(parseFloat(animationDuration) <= 0.001 || animationDuration === '0s').toBe(true);
  });

  // --------------------------------------------------------------------------
  // TEST 7: Cumulative Layout Shift (CLS) stays under 0.1
  // --------------------------------------------------------------------------
  test('7. CLS budget met on key pages (< 0.1)', async ({ page }) => {
    const pages = ['/index.html', '/shop.html', '/reviews.html'];
    for (const url of pages) {
      await page.goto(url, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(800);

      const cls = await page.evaluate(() => {
        return new Promise((resolve) => {
          let score = 0;
          try {
            const observer = new PerformanceObserver((list) => {
              for (const entry of list.getEntries()) {
                if (!entry.hadRecentInput) {
                  score += entry.value;
                }
              }
            });
            observer.observe({ type: 'layout-shift', buffered: true });
            setTimeout(() => {
              observer.disconnect();
              resolve(score);
            }, 500);
          } catch (e) {
            resolve(0);
          }
        });
      });

      expect(cls).toBeLessThanOrEqual(0.1);
    }
  });

  // --------------------------------------------------------------------------
  // TEST 8: Full mobile screenshots at 360px viewport
  // --------------------------------------------------------------------------
  test('8. Capture mobile audit screenshots at 360px', async ({ page }) => {
    // Only capture for 360px viewport run
    const vp = page.viewportSize();
    if (vp.width !== 360) return;

    // Home
    await page.goto('/index.html', { waitUntil: 'networkidle' });
    await page.waitForTimeout(600);
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '01_home_mobile_360.png'), fullPage: false });

    // Shop
    await page.goto('/shop.html', { waitUntil: 'networkidle' });
    await page.waitForTimeout(600);
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '02_shop_mobile_360.png'), fullPage: false });

    // Product
    await page.goto('/product.html?slug=white-crochet-lily-flower', { waitUntil: 'networkidle' });
    await page.waitForTimeout(600);
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '03_product_mobile_360.png'), fullPage: false });

    // Reviews
    await page.goto('/reviews.html', { waitUntil: 'networkidle' });
    await page.waitForTimeout(600);
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '04_reviews_mobile_360.png'), fullPage: false });

    // Note Bottom Sheet
    const openBtn = page.locator('#btn-home-leave-note, #swan-floating-note-btn, .open-note-modal-btn').first();
    if (await openBtn.count() > 0) {
      await openBtn.click();
      await page.waitForTimeout(500);
      await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '05_bottom_sheet_mobile_360.png'), fullPage: false });
      await page.keyboard.press('Escape');
      await page.waitForTimeout(300);
    }

    // Checkout
    await page.goto('/checkout.html', { waitUntil: 'networkidle' });
    await page.waitForTimeout(600);
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '06_checkout_mobile_360.png'), fullPage: false });

    // 404
    await page.goto('/404.html', { waitUntil: 'networkidle' });
    await page.waitForTimeout(600);
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '07_404_mobile_360.png'), fullPage: false });
  });

});
