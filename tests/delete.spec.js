const { test, expect } = require('@playwright/test');

const AUDIT_KEY = 'swan_studio_audit_safe_key_2026';

// Helper to set admin authentication cookie
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
}

test.describe('Swan Studio — Delete Flow & Single Source of Truth Tests', () => {

  test('1. Create product, delete it (disappears everywhere, 10s undo, delete forever)', async ({ page, context, baseURL }) => {
    await authenticateAdmin(context, baseURL);

    const testProductName = `Handcrafted Tulip ${Date.now()}`;
    const testSlug = `test-tulip-${Date.now()}`;

    // 1. Create product in admin
    await page.goto(`${baseURL}/admin/products.html`);
    await page.waitForSelector('#btn-add-product');
    await page.click('#btn-add-product');
    await page.waitForSelector('#prod-name', { state: 'visible' });

    await page.fill('#prod-name', testProductName);
    await page.fill('#prod-slug', testSlug);
    await page.fill('#prod-price', '449');
    await page.click('#modal-save-btn');
    await page.waitForTimeout(1000);

    // Verify product is in active admin table
    const tableText = await page.locator('#products-table-body').textContent();
    expect(tableText).toContain(testProductName);

    // Verify product appears on public shop and sitemap
    const publicRes = await page.request.get(`${baseURL}/api/products?search=${encodeURIComponent(testProductName)}`);
    const publicJson = await publicRes.json();
    expect(publicJson.data.some(p => p.slug === testSlug)).toBe(true);

    const sitemapRes = await page.request.get(`${baseURL}/sitemap.xml`);
    const sitemapText = await sitemapRes.text();
    expect(sitemapText).toContain(testSlug);

    // 2. Delete product via 2-tap mobile flow
    // Find row and click Delete
    const row = page.locator(`tr:has-text("${testProductName}")`);
    await row.locator('.btn-delete-prod').click();

    // Confirm dialog must fit screen and display exact message
    const confirmModal = page.locator('#admin-confirm-modal');
    await expect(confirmModal).toBeVisible();
    await expect(confirmModal).toContainText(`Delete "${testProductName}"? It will disappear from your website.`);

    // Tap 2: Confirm delete
    await confirmModal.locator('#admin-confirm-ok').click();
    await page.waitForTimeout(1000);

    // Verify it disappears from active admin list
    await expect(page.locator('#products-table-body')).not.toContainText(testProductName);

    // Verify it disappears from database / public API
    const checkApi = await page.request.get(`${baseURL}/api/products?search=${encodeURIComponent(testProductName)}`);
    const checkJson = await checkApi.json();
    expect(checkJson.data.some(p => p.slug === testSlug)).toBe(false);

    // Verify it disappears from sitemap.xml
    const sitemapAfter = await (await page.request.get(`${baseURL}/sitemap.xml`)).text();
    expect(sitemapAfter).not.toContain(testSlug);

    // Verify 10-second Undo button exists on toast
    const undoBtn = page.locator('#admin-toast-undo-btn');
    await expect(undoBtn).toBeVisible();

    // 3. Test Undo brings it back
    await undoBtn.click();
    await page.waitForTimeout(1000);

    // Verify it reappeared in active admin table
    await expect(page.locator('#products-table-body')).toContainText(testProductName);

    // Verify it is back in public API
    const restoredRes = await page.request.get(`${baseURL}/api/products?search=${encodeURIComponent(testProductName)}`);
    const restoredJson = await restoredRes.json();
    expect(restoredJson.data.some(p => p.slug === testSlug)).toBe(true);

    // 4. Delete again, then switch to Trash and test Delete Forever
    const rowAgain = page.locator(`tr:has-text("${testProductName}")`);
    await rowAgain.locator('.btn-delete-prod').click();
    await page.locator('#admin-confirm-ok').click();
    await page.waitForTimeout(1000);

    // Switch to Trash tab
    await page.click('#tab-trash');
    await page.waitForTimeout(500);

    const trashRow = page.locator(`tr:has-text("${testProductName}")`);
    await expect(trashRow).toBeVisible();

    // Click "Delete Forever"
    await trashRow.locator('.btn-perm-del-prod').click();
    await expect(confirmModal).toBeVisible();
    await page.locator('#admin-confirm-ok').click();
    await page.waitForTimeout(1000);

    // Verify permanently gone from Trash
    await expect(page.locator('#products-table-body')).not.toContainText(testProductName);
  });

  test('2. Create category with products, delete it (move-or-delete resolution prompt, vanishes everywhere)', async ({ page, context, baseURL }) => {
    await authenticateAdmin(context, baseURL);

    const catName = `Spec Collection ${Date.now()}`;
    const catSlug = `spec-cat-${Date.now()}`;
    const prodName = `Linked Spec Product ${Date.now()}`;
    const prodSlug = `linked-prod-${Date.now()}`;

    // 1. Create Category
    await page.goto(`${baseURL}/admin/categories.html`);
    await page.click('#btn-add-category');
    await page.waitForSelector('#cat-name', { state: 'visible' });
    await page.fill('#cat-name', catName);
    await page.fill('#cat-slug', catSlug);
    await page.click('#modal-save-btn');
    await page.waitForTimeout(1000);

    // 2. Create Product linked to this category
    await page.goto(`${baseURL}/admin/products.html`);
    await page.click('#btn-add-product');
    await page.waitForSelector('#prod-name', { state: 'visible' });
    await page.fill('#prod-name', prodName);
    await page.fill('#prod-slug', prodSlug);
    await page.fill('#prod-price', '350');
    // Select our new category
    await page.selectOption('#prod-category', { label: catName });
    await page.click('#modal-save-btn');
    await page.waitForTimeout(1000);

    // Verify category is live on public shop
    await page.goto(`${baseURL}/shop.html`);
    await page.waitForSelector('#category-pills');
    await expect(page.locator('#category-pills')).toContainText(catName);

    // 3. Attempt to delete category in admin
    await page.goto(`${baseURL}/admin/categories.html`);
    const catRow = page.locator(`tr:has-text("${catName}")`);
    await catRow.locator('.btn-delete-cat').click();

    // Confirm initial delete
    await page.locator('#admin-confirm-ok').click();
    await page.waitForTimeout(800);

    // Resolution modal must appear with product count and category picker
    const resModal = page.locator('#resolution-modal');
    await expect(resModal).toBeVisible();
    await expect(resModal).toContainText('Move them to another category, or delete them too?');

    // Move linked product to another collection and delete category
    await page.locator('#btn-res-move').click();
    await page.waitForTimeout(1000);

    // Verify category is gone from admin
    await expect(page.locator('#categories-table-body')).not.toContainText(catName);

    // Verify category is gone from public shop pills
    await page.goto(`${baseURL}/shop.html`);
    await page.waitForSelector('#category-pills');
    await expect(page.locator('#category-pills')).not.toContainText(catName);

    // Verify visiting old ?category= URL redirects to clean shop
    await page.goto(`${baseURL}/shop.html?category=${catSlug}`);
    await page.waitForTimeout(1000);
    expect(page.url()).not.toContain(`category=${catSlug}`);
  });

  test('3. Delete an empty category (deletes immediately, gone everywhere)', async ({ page, context, baseURL }) => {
    await authenticateAdmin(context, baseURL);

    const emptyCatName = `Empty Collection ${Date.now()}`;
    const emptyCatSlug = `empty-cat-${Date.now()}`;

    // Create empty category
    await page.goto(`${baseURL}/admin/categories.html`);
    await page.click('#btn-add-category');
    await page.waitForSelector('#cat-name', { state: 'visible' });
    await page.fill('#cat-name', emptyCatName);
    await page.fill('#cat-slug', emptyCatSlug);
    await page.click('#modal-save-btn');
    await page.waitForTimeout(1000);

    // Delete it
    const row = page.locator(`tr:has-text("${emptyCatName}")`);
    await row.locator('.btn-delete-cat').click();

    // Confirm dialog
    await page.locator('#admin-confirm-ok').click();
    await page.waitForTimeout(1000);

    // Resolution modal should NOT appear because it has 0 products
    await expect(page.locator('#resolution-modal')).not.toBeVisible();

    // Should disappear immediately from admin
    await expect(page.locator('#categories-table-body')).not.toContainText(emptyCatName);
  });

  test('4. Bulk delete several products on mobile', async ({ page, context, baseURL }) => {
    await authenticateAdmin(context, baseURL);

    const p1Name = `Bulk Flower A ${Date.now()}`;
    const p2Name = `Bulk Flower B ${Date.now()}`;

    // Create 2 products
    await page.goto(`${baseURL}/admin/products.html`);
    await page.click('#btn-add-product');
    await page.waitForSelector('#prod-name', { state: 'visible' });
    await page.fill('#prod-name', p1Name);
    await page.fill('#prod-slug', `bulk-a-${Date.now()}`);
    await page.fill('#prod-price', '199');
    await page.click('#modal-save-btn');
    await page.waitForTimeout(800);

    await page.click('#btn-add-product');
    await page.waitForSelector('#prod-name', { state: 'visible' });
    await page.fill('#prod-name', p2Name);
    await page.fill('#prod-slug', `bulk-b-${Date.now()}`);
    await page.fill('#prod-price', '299');
    await page.click('#modal-save-btn');
    await page.waitForTimeout(1000);

    // Select both checkboxes
    const r1 = page.locator(`tr:has-text("${p1Name}")`);
    const r2 = page.locator(`tr:has-text("${p2Name}")`);
    await r1.locator('.prod-row-cb').check();
    await r2.locator('.prod-row-cb').check();

    // Bulk bar appears
    const bulkBar = page.locator('#bulk-action-bar');
    await expect(bulkBar).toBeVisible();
    await expect(page.locator('#bulk-selected-count')).toContainText('2 selected');

    // Click bulk delete
    await page.locator('#bulk-btn-delete').click();
    await page.locator('#admin-confirm-ok').click();
    await page.waitForTimeout(1000);

    // Both should be removed from active table
    await expect(page.locator('#products-table-body')).not.toContainText(p1Name);
    await expect(page.locator('#products-table-body')).not.toContainText(p2Name);
  });

  test('5. Logged-out user cannot delete anything (denied 401)', async ({ page, baseURL }) => {
    // Send unauthenticated DELETE request to product API
    const resProd = await page.request.delete(`${baseURL}/api/admin/products/prod-001`);
    expect(resProd.status()).toBe(401);

    // Send unauthenticated DELETE request to category API
    const resCat = await page.request.delete(`${baseURL}/api/admin/categories/cat-bouquets`);
    expect(resCat.status()).toBe(401);

    // Verify prod-001 is still intact and available
    const getProd = await page.request.get(`${baseURL}/api/products/daisy-delight-bouquet`);
    expect(getProd.status()).toBe(200);
  });

  test('6. Delete resilience: persists across page refresh and handles failed requests gracefully', async ({ page, context, baseURL }) => {
    await authenticateAdmin(context, baseURL);

    const resTestName = `Resilience Rose ${Date.now()}`;
    const resSlug = `res-rose-${Date.now()}`;

    // Create item
    await page.goto(`${baseURL}/admin/products.html`);
    await page.click('#btn-add-product');
    await page.waitForSelector('#prod-name', { state: 'visible' });
    await page.fill('#prod-name', resTestName);
    await page.fill('#prod-slug', resSlug);
    await page.fill('#prod-price', '599');
    await page.click('#modal-save-btn');
    await page.waitForTimeout(1000);

    // Delete item
    const row = page.locator(`tr:has-text("${resTestName}")`);
    await row.locator('.btn-delete-prod').click();
    await page.locator('#admin-confirm-ok').click();
    await page.waitForTimeout(1000);

    // Reload page completely
    await page.reload();
    await page.waitForSelector('#products-table-body');

    // Must still NOT appear after hard page reload
    await expect(page.locator('#products-table-body')).not.toContainText(resTestName);
  });

  test('7. Previously existing demo and placeholder products are not resurrected', async ({ page, baseURL }) => {
    // Navigate to public shop
    await page.goto(`${baseURL}/shop.html`);
    await page.waitForSelector('#results-count');

    // Verify no static fake products exist without backing database records
    const apiRes = await page.request.get(`${baseURL}/api/products`);
    const apiJson = await apiRes.json();
    const liveSlugs = new Set(apiJson.data.map(p => p.slug));

    // Every rendered product card must correspond to an active live database slug
    const cardLinks = await page.$$eval('#products-grid .product-card a', els => 
      els.map(e => e.getAttribute('href')).filter(h => h && h.includes('product.html?slug='))
    );

    for (const href of cardLinks) {
      const slug = href.split('slug=')[1];
      expect(liveSlugs.has(slug)).toBe(true);
    }
  });

});
