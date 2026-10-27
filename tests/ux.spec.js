const { test, expect } = require('@playwright/test');

const AUDIT_KEY = 'swan_studio_audit_safe_key_2026';

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

const VIEWPORTS = [
  { width: 320, height: 600, name: '320px (Compact Mobile)' },
  { width: 360, height: 800, name: '360px (Standard Mobile)' },
  { width: 390, height: 844, name: '390px (iPhone 14/15)' },
  { width: 414, height: 896, name: '414px (iPhone Plus)' },
  { width: 430, height: 932, name: '430px (iPhone Pro Max)' },
  { width: 768, height: 1024, name: '768px (Tablet)' }
];

const PAGES_TO_TEST = [
  'index.html',
  'shop.html',
  'product.html',
  'cart.html',
  'checkout.html',
  'custom-order.html',
  'about.html',
  'reviews.html',
  'contact.html',
  'blog.html',
  'blog-post.html',
  'shipping.html',
  'returns.html',
  'privacy.html',
  'terms.html',
  '404.html',
  'admin/index.html',
  'admin/reviews.html'
];

test.describe('Swan Studio — Full UI/UX & Responsive Mobile Audit Suite', () => {

  for (const vp of VIEWPORTS) {
    test(`Zero horizontal scroll & zero broken images at ${vp.name}`, async ({ page, context, baseURL }) => {
      test.setTimeout(120000);
      await page.setViewportSize({ width: vp.width, height: vp.height });

      for (const pagePath of PAGES_TO_TEST) {
        if (pagePath.startsWith('admin/')) {
          await authenticateAdmin(context, baseURL);
        }

        const consoleErrors = [];
        page.on('console', msg => {
          if (msg.type() === 'error') {
            const txt = msg.text();
            // Ignore intentional test errors or benign third-party analytics
            if (!txt.includes('favicon') && !txt.includes('404 (Not Found)') && !txt.includes('ERR_CONNECTION_REFUSED')) {
              consoleErrors.push(txt);
            }
          }
        });

        const targetUrl = `${baseURL}/${pagePath}`;
        await page.goto(targetUrl, { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(400);

        // 1. Check Horizontal Scroll Overflow
        const overflow = await page.evaluate(() => {
          const docEl = document.documentElement;
          const body = document.body;
          const scrollWidth = Math.max(docEl.scrollWidth, body.scrollWidth);
          const innerWidth = window.innerWidth;
          const diff = scrollWidth - innerWidth;

          // Find specific culprit elements if overflow detected
          let culprit = null;
          if (diff > 1) {
            const allElements = document.querySelectorAll('*');
            for (const el of allElements) {
              const rect = el.getBoundingClientRect();
              if (rect.right > window.innerWidth + 2) {
                culprit = `${el.tagName}.${el.className || ''} id=${el.id || ''} right=${rect.right}`;
                break;
              }
            }
          }

          return { diff, culprit };
        });

        expect(overflow.diff, `Horizontal scroll overflow detected on ${pagePath} at ${vp.name}! Culprit: ${overflow.culprit}`).toBeLessThanOrEqual(2);

        // 2. Check for Broken Images
        const brokenImages = await page.evaluate(() => {
          const imgs = Array.from(document.querySelectorAll('img'));
          const broken = [];
          for (const img of imgs) {
            const hiddenParent = img.closest('[style*="display: none"], [style*="display:none"], [hidden]');
            if (hiddenParent || window.getComputedStyle(img).display === 'none') {
              continue;
            }
            if (!img.src || img.src.includes('data:image/svg') || img.src === window.location.href) {
              continue;
            }
            if (img.complete && img.naturalWidth === 0) {
              broken.push(img.src);
            }
          }
          return broken;
        });

        expect(brokenImages.length, `Broken images found on ${pagePath} at ${vp.name}: ${brokenImages.join(', ')}`).toBe(0);

        // 3. Check Form Inputs have font-size >= 16px to prevent iOS auto-zoom
        if (vp.width <= 430) {
          const smallInputs = await page.evaluate(() => {
            const inputs = Array.from(document.querySelectorAll('input:not([type="hidden"]):not([type="checkbox"]):not([type="radio"]), textarea, select'));
            const issues = [];
            for (const input of inputs) {
              const fontSize = parseFloat(window.getComputedStyle(input).fontSize);
              if (fontSize < 15.5) {
                issues.push(`${input.tagName}#${input.id || ''}.${input.className || ''} has fontSize=${fontSize}px`);
              }
            }
            return issues;
          });

          expect(smallInputs.length, `Inputs with font-size < 16px found on ${pagePath}: ${smallInputs.join(', ')}`).toBe(0);
        }
      }
    });
  }

});
