const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 360, height: 780 },
    userAgent: 'Mozilla/5.0 (Linux; Android 13; SM-G981B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Mobile Safari/537.36'
  });
  const page = await context.newPage();

  console.log('--- TEST 1: Cart Mobile Buttons & Truncation ---');
  await page.goto('http://localhost:4000/cart.html');
  await page.evaluate(() => {
    localStorage.setItem('swan_cart', JSON.stringify([
      {
        id: 'c1',
        slug: 'pink-white-crochet-flower',
        title: 'Pink & White Crochet Flower',
        price: 399,
        quantity: 1,
        image: 'assets/images/products/crochet-flower.webp'
      }
    ]));
  });
  await page.reload();
  await page.waitForSelector('.cart-item-row');

  // Verify full price visible (not truncated to ₹3)
  const lineTotal = await page.$eval('.cart-item-line-total', el => el.textContent.trim());
  console.log('Initial Line Total:', lineTotal);
  if (lineTotal !== '₹399') {
    throw new Error(`Expected ₹399 but got ${lineTotal}`);
  }

  // Click Plus button
  const plusBtn = await page.$('.btn-cart-plus');
  await plusBtn.click();
  await page.waitForTimeout(100);
  const qtyAfterPlus = await page.$eval('.qty-input', el => el.value.trim());
  const totalAfterPlus = await page.$eval('.cart-item-line-total', el => el.textContent.trim());
  console.log(`After Plus: qty = ${qtyAfterPlus}, total = ${totalAfterPlus}`);
  if (qtyAfterPlus !== '2' || totalAfterPlus !== '₹798') {
    throw new Error(`Plus failed: qty=${qtyAfterPlus}, total=${totalAfterPlus}`);
  }

  // Click Minus button
  const minusBtn = await page.$('.btn-cart-minus');
  await minusBtn.click();
  await page.waitForTimeout(100);
  const qtyAfterMinus = await page.$eval('.qty-input', el => el.value.trim());
  const totalAfterMinus = await page.$eval('.cart-item-line-total', el => el.textContent.trim());
  console.log(`After Minus: qty = ${qtyAfterMinus}, total = ${totalAfterMinus}`);
  if (qtyAfterMinus !== '1' || totalAfterMinus !== '₹399') {
    throw new Error(`Minus failed: qty=${qtyAfterMinus}, total=${totalAfterMinus}`);
  }

  // Click Remove button
  const removeBtn = await page.$('.btn-cart-remove');
  await removeBtn.click();
  await page.waitForTimeout(400);
  const emptyStateVisible = await page.isVisible('#cart-empty-state');
  console.log('Cart Empty State Visible after Remove:', emptyStateVisible);
  if (!emptyStateVisible) {
    throw new Error('Remove failed: empty state not visible');
  }

  console.log('\n--- TEST 2: Admin Reviews Exception Check ---');
  let pageErrors = [];
  page.on('pageerror', err => pageErrors.push(err.message));
  await page.goto('http://localhost:4000/admin/reviews.html');
  await page.waitForTimeout(1500);

  const hasFetchErrException = await page.evaluate(() => {
    return document.body.innerText.includes('fetchErr is not defined');
  });
  console.log('Has fetchErr exception on admin page:', hasFetchErrException);
  console.log('Admin Page Errors:', pageErrors);
  if (hasFetchErrException || pageErrors.length > 0) {
    throw new Error('Admin reviews page has error: ' + JSON.stringify(pageErrors));
  }

  console.log('\n--- TEST 3: Login Page Forgot Password & No Alert Popup ---');
  let dialogTriggered = false;
  page.on('dialog', async dialog => {
    dialogTriggered = true;
    console.log('Dialog opened:', dialog.message());
    await dialog.dismiss();
  });
  await page.goto('http://localhost:4000/login.html');
  await page.waitForSelector('#login-form');

  // Switch to admin atelier mode
  await page.click('#tab-admin-mode');
  const adminIdVal = await page.$eval('#login-email', el => el.value);
  console.log('Admin Atelier Default Identifier:', adminIdVal);

  // Click Forgot password with swanstudio2604@gmail.com
  await page.click('#forgot-password-link');
  await page.waitForTimeout(1200);
  const feedbackMsg = await page.$eval('#login-feedback', el => el.textContent.trim());
  console.log('Login Feedback Message:', feedbackMsg);
  console.log('Dialog Triggered:', dialogTriggered);
  if (dialogTriggered) {
    throw new Error('Native alert dialog was triggered!');
  }

  console.log('\n--- TEST 4: Floating Dock Overlap Suppression on Home Page ---');
  await page.goto('http://localhost:4000/index.html');
  await page.waitForSelector('.home-reviews-cta-row');
  
  // Scroll to reviews CTA row
  await page.$eval('.home-reviews-cta-row', el => el.scrollIntoView({ behavior: 'instant', block: 'center' }));
  await page.waitForTimeout(400);

  const dockCtaHidden = await page.$eval('#swan-action-dock', el => el.classList.contains('dock-cta-hidden'));
  console.log('Is action dock hidden when review CTAs are in view:', dockCtaHidden);
  if (!dockCtaHidden) {
    throw new Error('Action dock should be hidden when review CTAs are in view to prevent overlap');
  }

  console.log('\n>>> ALL 4 VERIFICATION SUITES PASSED FLAWLESSLY! <<<');
  await browser.close();
})();
