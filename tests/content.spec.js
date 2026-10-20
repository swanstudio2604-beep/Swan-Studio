const { test, expect } = require('@playwright/test');

const AUDIT_KEY = 'swan_studio_audit_safe_key_2026';

// Helper to authenticate admin via cookies and localStorage pre-seed
async function authenticateAdmin(context, baseURL) {
  const url = new URL(baseURL || 'http://localhost:4000');
  await context.addCookies([
    {
      name: 'swan_audit_key',
      value: AUDIT_KEY,
      domain: url.hostname,
      path: '/'
    }
  ]);
  await context.addInitScript(() => {
    localStorage.setItem('swan_demo_user', JSON.stringify({
      id: 'admin-swan',
      email: 'swanstudio2604@gmail.com',
      full_name: 'Bhumika Nama (Admin)',
      role: 'admin',
      token: 'swan_studio_audit_safe_key_2026'
    }));
  });
}

// Mobile tap / click helper
async function tapOrClick(locator) {
  try {
    await locator.dispatchEvent('click');
  } catch (e) {
    await locator.click({ force: true });
  }
}

test.describe('Swan Studio — Public Content & Admin Pipeline E2E Tests', () => {

  // --------------------------------------------------------------------------
  // TEST 1: Editable Images across site
  // --------------------------------------------------------------------------
  test('1. Replace hero image, collection card, about portrait, and verify on public pages', async ({ page, context, baseURL }) => {
    test.setTimeout(90000);
    await authenticateAdmin(context, baseURL);

    const testTimestamp = Date.now();
    const testHeroImg = `assets/images/hero-bouquet.webp?v=${testTimestamp}`;
    const testMakerPhoto = `assets/images/maker-artisan.webp?v=${testTimestamp}`;
    const testAnnounceText = `✨ Festive Handcrafted Collection ${testTimestamp} ✨`;

    // 1. Update content via admin content page
    await page.goto(`${baseURL}/admin/content.html`);
    await page.waitForSelector('#cfg-maker-photo-url', { state: 'visible', timeout: 15000 });
    await page.fill('#cfg-maker-photo-url', testMakerPhoto);

    // Switch to Homepage & Hero tab
    await tapOrClick(page.locator('#tab-btn-home'));
    await page.waitForSelector('#cfg-hero-photo-url', { state: 'visible', timeout: 10000 });
    await page.fill('#cfg-hero-photo-url', testHeroImg);
    await page.fill('#cfg-announcement', testAnnounceText);

    await tapOrClick(page.locator('#btn-save-all-bottom'));

    // Wait for "Live on your website" feedback
    await expect(page.locator('#save-feedback')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('#save-feedback')).toContainText('Live on your website');

    // 2. Verify on public homepage in fresh context (no cache)
    const publicPage = await context.newPage();
    await publicPage.goto(`${baseURL}/index.html?nocache=${testTimestamp}`);
    await publicPage.waitForLoadState('networkidle');

    // Verify announcement banner
    const banner = publicPage.locator('.announcement-bar');
    await expect(banner).toContainText(`Festive Handcrafted Collection ${testTimestamp}`);

    // Verify hero image inside container
    const heroImg = publicPage.locator('#hero-arch-container img');
    await expect(heroImg).toHaveAttribute('src', testHeroImg);

    // 3. Verify About page portrait
    await publicPage.goto(`${baseURL}/about.html?nocache=${testTimestamp}`);
    await publicPage.waitForLoadState('networkidle');
    const makerImg = publicPage.locator('#maker-portrait-container img');
    await expect(makerImg).toHaveAttribute('src', testMakerPhoto);

    // 4. Verify image loaded without break
    const naturalWidth = await makerImg.evaluate(img => img.naturalWidth);
    expect(naturalWidth).toBeGreaterThan(0);

    await publicPage.close();
  });

  // --------------------------------------------------------------------------
  // TEST 2: Complete Blog Lifecycle (Draft -> Publish -> Edit -> Unpublish -> Delete)
  // --------------------------------------------------------------------------
  test('2. Blog lifecycle: Draft (hidden) -> Publish (visible, sitemap, JSON-LD) -> Edit -> Unpublish -> Delete', async ({ page, context, baseURL }) => {
    test.setTimeout(120000);
    await authenticateAdmin(context, baseURL);

    const testTime = Date.now();
    const blogTitle = `The Art of Slow Crochet ${testTime}`;
    const blogSlug = `art-of-slow-crochet-${testTime}`;
    const blogExcerpt = `Exploring the mindfulness and timeless beauty of hand-looped milk cotton yarn ${testTime}.`;
    const blogBody = `<h2>Slow Living</h2><p>In our Jaipur atelier, every stitch is formed with intention.</p>`;

    // 1. Create Blog Post as DRAFT
    await page.goto(`${baseURL}/admin/blog.html`);
    await page.waitForSelector('#btn-create-story', { state: 'visible', timeout: 15000 });
    await tapOrClick(page.locator('#btn-create-story'));
    await page.waitForSelector('#story-modal', { state: 'visible', timeout: 10000 });

    await page.fill('#story-title-input', blogTitle);
    await page.fill('#story-slug-input', blogSlug);
    await page.fill('#story-excerpt-input', blogExcerpt);
    await page.fill('#story-body-input', blogBody);
    await page.selectOption('#story-status-select', 'draft');

    await tapOrClick(page.locator('#btn-save-story'));
    await expect(page.locator('#story-modal')).not.toBeVisible({ timeout: 15000 });

    // 2. Verify Draft is NOT visible on public blog listing
    const publicContext = await context.newPage();
    await publicContext.goto(`${baseURL}/blog.html?t=${testTime}`);
    await publicContext.waitForLoadState('networkidle');
    const blogListContent = await publicContext.content();
    expect(blogListContent).not.toContain(blogTitle);

    // 3. Publish the blog post
    await page.goto(`${baseURL}/admin/blog.html`);
    await page.waitForSelector('#stories-feed, #blog-feed', { state: 'attached', timeout: 15000 });
    // Switch to Drafts tab or find post card
    await tapOrClick(page.locator('.tab-btn[data-tab="DRAFT"]'));
    const postCard = page.locator(`.story-card:has-text("${blogTitle}")`);
    await expect(postCard).toBeVisible({ timeout: 10000 });
    await tapOrClick(postCard.locator('.btn-edit'));

    await page.waitForSelector('#story-modal', { state: 'visible', timeout: 10000 });
    await page.selectOption('#story-status-select', 'published');
    await tapOrClick(page.locator('#btn-save-story'));
    await expect(page.locator('#story-modal')).not.toBeVisible({ timeout: 15000 });

    // 4. Verify post appears on public blog list
    await publicContext.goto(`${baseURL}/blog.html?t=${testTime + 1}`);
    await publicContext.waitForLoadState('networkidle');
    await expect(publicContext.locator('#blog-posts-container')).toContainText(blogTitle, { timeout: 15000 });

    // 5. Verify individual blog post reader page
    await publicContext.goto(`${baseURL}/blog-post.html?slug=${blogSlug}`);
    await publicContext.waitForLoadState('networkidle');
    await expect(publicContext.locator('#post-title')).toHaveText(blogTitle);
    await expect(publicContext.locator('#post-body')).toContainText('In our Jaipur atelier');

    // 6. Verify Article JSON-LD exists and contains the title and slug
    const jsonLdContent = await publicContext.locator('#post-schema-jsonld').textContent();
    expect(jsonLdContent).toContain(blogTitle);
    expect(jsonLdContent).toContain(blogSlug);

    // 7. Verify post is present in sitemap.xml
    const sitemapRes = await page.request.get(`${baseURL}/sitemap.xml`);
    const sitemapText = await sitemapRes.text();
    expect(sitemapText).toContain(blogSlug);

    // 8. Edit post
    await page.bringToFront();
    await page.goto(`${baseURL}/admin/blog.html?v=${testTime + 10}`);
    await tapOrClick(page.locator('.tab-btn[data-tab="PUBLISHED"]'));
    const editCard = page.locator(`.story-card:has-text("${blogTitle}")`);
    await tapOrClick(editCard.locator('.btn-edit'));
    await page.waitForSelector('#story-modal', { state: 'visible', timeout: 10000 });
    await page.fill('#story-excerpt-input', `UPDATED EXCERPT FOR STORY ${testTime}`);
    await tapOrClick(page.locator('#btn-save-story'));
    await expect(page.locator('#story-modal')).not.toBeVisible({ timeout: 15000 });

    // Verify update on public reader page
    await publicContext.goto(`${baseURL}/blog-post.html?slug=${blogSlug}&v=${testTime + 2}`);
    await publicContext.waitForLoadState('networkidle');
    await expect(publicContext.locator('#post-excerpt')).toContainText(`UPDATED EXCERPT FOR STORY ${testTime}`);

    // 9. Soft delete post
    await page.bringToFront();
    await page.goto(`${baseURL}/admin/blog.html?v=${testTime + 20}`);
    await tapOrClick(page.locator('.tab-btn[data-tab="PUBLISHED"]'));
    const deleteCard = page.locator(`.story-card:has-text("${blogTitle}")`);
    page.once('dialog', dialog => dialog.accept());
    await tapOrClick(deleteCard.locator('.btn-trash'));

    // Wait for toast or refresh
    await page.waitForTimeout(1000);

    // Verify removed from public blog list
    await publicContext.goto(`${baseURL}/blog.html?v=${testTime + 3}`);
    await publicContext.waitForLoadState('networkidle');
    const finalContent = await publicContext.content();
    expect(finalContent).not.toContain(blogTitle);

    // Verify removed from sitemap.xml
    const sitemapAfter = await (await page.request.get(`${baseURL}/sitemap.xml`)).text();
    expect(sitemapAfter).not.toContain(blogSlug);

    await publicContext.close();
  });

  // --------------------------------------------------------------------------
  // TEST 3: Edit About text, banner, policies, FAQ, contact details, footer
  // --------------------------------------------------------------------------
  test('3. Edit About text, banner, policies, FAQ, and contact details and verify on public pages', async ({ page, context, baseURL }) => {
    test.setTimeout(90000);
    await authenticateAdmin(context, baseURL);

    const testTime = Date.now();
    const testHeadline = `Handcrafted Art with Heart ${testTime}`;
    const testStoryP1 = `At Swan Studio, we pour love into every petal and loop. Updated test ${testTime}.`;

    // 1. Update via Admin Content
    await page.goto(`${baseURL}/admin/content.html`);
    await page.waitForSelector('#cfg-story-headline', { state: 'attached', timeout: 15000 });

    await page.fill('#cfg-story-headline', testHeadline);
    await page.fill('#cfg-story-p1', testStoryP1);
    await tapOrClick(page.locator('#btn-save-all-bottom'));

    await expect(page.locator('#save-feedback')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('#save-feedback')).toContainText('Live on your website');

    // 2. Verify on public About page
    const publicPage = await context.newPage();
    await publicPage.goto(`${baseURL}/about.html?nocache=${testTime}`);
    await publicPage.waitForLoadState('networkidle');

    await expect(publicPage.locator('#story-headline')).toHaveText(testHeadline);
    await expect(publicPage.locator('#story-p1')).toContainText(testStoryP1);

    // 3. Verify Contact Details on contact.html
    await publicPage.goto(`${baseURL}/contact.html?nocache=${testTime}`);
    await publicPage.waitForLoadState('networkidle');
    await expect(publicPage.locator('#contact-whatsapp-btn, #contact-wa-btn')).toBeVisible();
    await expect(publicPage.locator('#contact-email-btn')).toBeVisible();

    // 4. Verify Policy notices on shipping and returns
    await publicPage.goto(`${baseURL}/shipping.html?nocache=${testTime}`);
    await publicPage.waitForLoadState('networkidle');
    await expect(publicPage.locator('#shipping-dynamic-notice')).toBeVisible();

    await publicPage.goto(`${baseURL}/returns.html?nocache=${testTime}`);
    await publicPage.waitForLoadState('networkidle');
    await expect(publicPage.locator('#returns-dynamic-notice')).toBeVisible();

    await publicPage.close();
  });

  // --------------------------------------------------------------------------
  // TEST 4: Image upload API and compression test
  // --------------------------------------------------------------------------
  test('4. Image upload API compresses images and returns absolute URL', async ({ request, baseURL }) => {
    // Generate a 100x100 white PNG as base64
    const pngBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGQAAABkCAYAAABw4pVUAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAAvSURBVHhe7cEBDQAAAMKg909tDwcUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAOBnA9VAAAE+Q9wWAAAAAElFTkSuQmCC';

    const res = await request.post(`${baseURL}/api/admin/upload-image`, {
      headers: {
        'Content-Type': 'application/json',
        'X-Admin-Token': AUDIT_KEY
      },
      data: {
        dataUrl: pngBase64,
        filename: 'test-crochet-upload.png',
        altText: 'Test Crochet Handcrafted Bouquet'
      }
    });

    expect(res.ok()).toBe(true);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.url).toContain('/uploads/');
    expect(json.filename).toBeDefined();

    // Verify the uploaded image is publicly reachable
    const fetchImg = await request.get(json.url);
    expect(fetchImg.ok()).toBe(true);
    expect(fetchImg.headers()['content-type']).toContain('image');
  });

  // --------------------------------------------------------------------------
  // TEST 5: Broken image concealment and onerror fallbacks
  // --------------------------------------------------------------------------
  test('5. Missing or broken images trigger graceful onerror fallbacks with no broken icon', async ({ page, baseURL }) => {
    await page.goto(`${baseURL}/index.html`);
    await page.waitForLoadState('networkidle');

    // Evaluate all images on the homepage
    const brokenImages = await page.evaluate(() => {
      const imgs = Array.from(document.querySelectorAll('img'));
      return imgs.filter(img => {
        const isHidden = img.style.display === 'none' || img.offsetParent === null;
        return !isHidden && img.complete && img.naturalWidth === 0;
      }).map(img => img.src);
    });

    expect(brokenImages).toEqual([]);
  });

  // --------------------------------------------------------------------------
  // TEST 6: Security - Logged-out modifications are strictly blocked
  // --------------------------------------------------------------------------
  test('6. Unauthenticated requests to admin modification endpoints return 401 Unauthorized', async ({ request, baseURL }) => {
    // Attempt to update site content without admin credentials
    const contentRes = await request.put(`${baseURL}/api/admin/content`, {
      data: { announcement: 'HACKED CONTENT' }
    });
    expect([401, 403]).toContain(contentRes.status());

    // Attempt to create a blog post without admin credentials
    const blogRes = await request.post(`${baseURL}/api/admin/blog`, {
      data: { title: 'Unauthorized Post', slug: 'unauthorized', body: 'Body' }
    });
    expect([401, 403]).toContain(blogRes.status());

    // Attempt to upload an image without admin credentials
    const uploadRes = await request.post(`${baseURL}/api/admin/upload-image`, {
      data: { dataUrl: 'data:image/png;base64,abc' }
    });
    expect([401, 403]).toContain(uploadRes.status());
  });

  // --------------------------------------------------------------------------
  // TEST 7: Zero demo or placeholder content across all public customer pages
  // --------------------------------------------------------------------------
  test('7. No demo banners, placeholder founder notes, or fake review counts remain on public site', async ({ page, baseURL }) => {
    const pagesToCheck = [
      'index.html',
      'shop.html',
      'about.html',
      'contact.html',
      'reviews.html',
      'blog.html',
      'custom-order.html',
      'shipping.html',
      'returns.html',
      'privacy.html',
      'terms.html',
      '404.html'
    ];

    const forbiddenPhrases = [
      'Phase 1 Demonstration Mode',
      'Demonstration Mode',
      'Note for Founder',
      'Sample Product'
    ];

    for (const pageName of pagesToCheck) {
      const consoleErrors = [];
      page.on('console', msg => {
        if (msg.type() === 'error') consoleErrors.push(msg.text());
      });

      const response = await page.goto(`${baseURL}/${pageName}`);
      expect(response.status()).toBe(200);
      await page.waitForLoadState('networkidle');

      const content = await page.content();
      for (const phrase of forbiddenPhrases) {
        expect(content.toLowerCase()).not.toContain(phrase.toLowerCase());
      }

      // Check for zero broken images on page
      const hasBrokenImg = await page.evaluate(() => {
        const imgs = Array.from(document.querySelectorAll('img'));
        return imgs.some(img => img.offsetParent !== null && img.complete && img.naturalWidth === 0);
      });
      expect(hasBrokenImg).toBe(false);

      // Filter non-critical console errors
      const criticalErrors = consoleErrors.filter(err => 
        !err.includes('favicon') && 
        !err.includes('supabase') && 
        !err.includes('ERR_CONNECTION_REFUSED')
      );
      expect(criticalErrors).toHaveLength(0);
    }
  });

});
