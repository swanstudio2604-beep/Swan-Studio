const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 360, height: 780 },
    deviceScaleFactor: 2,
    userAgent: 'Mozilla/5.0 (Linux; Android 13; SM-G981B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Mobile Safari/537.36'
  });
  const page = await context.newPage();

  // 1. Cart Page (Populate item and capture)
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
  await page.screenshot({ path: path.join(__dirname, 'screenshot_cart_fixed.png'), fullPage: false });
  console.log('Saved screenshot_cart_fixed.png');

  // 2. Home Reviews Section
  await page.goto('http://localhost:4000/index.html');
  await page.waitForSelector('.home-reviews-cta-row');
  await page.$eval('.home-reviews-cta-row', el => el.scrollIntoView({ behavior: 'instant', block: 'center' }));
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(__dirname, 'screenshot_reviews_clean.png'), fullPage: false });
  console.log('Saved screenshot_reviews_clean.png');

  // 3. Login Page
  await page.goto('http://localhost:4000/login.html');
  await page.waitForSelector('#login-form');
  await page.screenshot({ path: path.join(__dirname, 'screenshot_login_clean.png'), fullPage: false });
  console.log('Saved screenshot_login_clean.png');

  // 4. Admin Reviews Page
  await page.goto('http://localhost:4000/admin/reviews.html');
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(__dirname, 'screenshot_admin_reviews_clean.png'), fullPage: false });
  console.log('Saved screenshot_admin_reviews_clean.png');

  await browser.close();
})();
