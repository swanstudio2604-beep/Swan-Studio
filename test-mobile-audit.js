const puppeteer = require('puppeteer-core');

const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const BASE_URL = 'http://localhost:4000';

const PAGES = [
  '/',
  '/index.html',
  '/shop.html',
  '/shop.html?category=bouquets',
  '/shop.html?category=bags',
  '/shop.html?category=plushies',
  '/shop.html?category=accessories',
  '/shop.html?search=daisy',
  '/shop.html?sort=price-asc',
  '/about.html',
  '/custom-order.html',
  '/reviews.html',
  '/product.html?slug=daisy-delight-bouquet',
  '/cart.html',
  '/contact.html',
  '/shipping.html',
  '/returns.html',
  '/privacy.html',
  '/terms.html'
];

const VIEWPORTS = [
  { width: 320, height: 568, name: '320px (iPhone SE 1st)' },
  { width: 360, height: 800, name: '360px (Galaxy S20)' },
  { width: 375, height: 667, name: '375px (iPhone SE 2nd)' },
  { width: 390, height: 844, name: '390px (iPhone 12/13/14)' },
  { width: 414, height: 896, name: '414px (iPhone 11/XR)' },
  { width: 430, height: 932, name: '430px (iPhone 14/15 Pro Max)' },
  { width: 480, height: 854, name: '480px (Standard Wide)' },
  { width: 667, height: 375, name: '667x375 (Landscape 1)' },
  { width: 844, height: 390, name: '844x390 (Landscape 2)' }
];

async function runAudit() {
  console.log('Starting Mobile-First Responsiveness & Overflow Audit...');
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
  });

  const page = await browser.newPage();
  let totalTests = 0;
  let totalFailures = 0;
  const issues = [];

  for (const pagePath of PAGES) {
    const url = `${BASE_URL}${pagePath}`;
    for (const vp of VIEWPORTS) {
      totalTests++;
      await page.setViewport({ width: vp.width, height: vp.height, isMobile: true, hasTouch: true });
      try {
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 5000 });
        // Give client scripts 200ms to hydrate DOM
        await new Promise(r => setTimeout(r, 200));
      } catch (err) {
        console.warn(`Nav warning for ${pagePath} on ${vp.name}: ${err.message}`);
      }

      const res = await page.evaluate((vpWidth) => {
        const scrollW = document.documentElement.scrollWidth;
        const innerW = window.innerWidth;
        const bodyScrollW = document.body ? document.body.scrollWidth : 0;
        const maxScroll = Math.max(scrollW, bodyScrollW);
        const overflows = maxScroll > innerW + 1; // 1px threshold for subpixel

        let culprits = [];
        if (overflows) {
          const all = document.querySelectorAll('*');
          for (const el of all) {
            const rect = el.getBoundingClientRect();
            if (rect.right > innerW + 1.5) {
              const tag = el.tagName.toLowerCase();
              const id = el.id ? `#${el.id}` : '';
              const cls = el.className && typeof el.className === 'string' ? `.${el.className.trim().split(/\s+/).slice(0, 2).join('.')}` : '';
              culprits.push({
                selector: `${tag}${id}${cls}`,
                rectRight: Math.round(rect.right),
                excess: Math.round(rect.right - innerW)
              });
            }
          }
        }

        const metaVp = document.querySelector('meta[name="viewport"]');

        return {
          maxScroll,
          innerW,
          overflows,
          hasMetaVp: Boolean(metaVp),
          culprits: culprits.slice(0, 3)
        };
      }, vp.width);

      if (res.overflows) {
        totalFailures++;
        issues.push({
          page: pagePath,
          viewport: vp.name,
          maxScroll: res.maxScroll,
          innerW: res.innerW,
          excess: res.maxScroll - res.innerW,
          culprits: res.culprits
        });
      }
    }
  }

  await browser.close();

  console.log(`\n========================================`);
  console.log(`AUDIT RESULTS: Tested ${PAGES.length} pages across ${VIEWPORTS.length} viewports (${totalTests} total tests)`);
  console.log(`Passed: ${totalTests - totalFailures} / ${totalTests}`);
  console.log(`Failures: ${totalFailures}`);
  console.log(`========================================\n`);

  if (issues.length > 0) {
    console.log('CRITICAL: OVERFLOWS DETECTED:');
    issues.forEach(iss => {
      console.log(`❌ ${iss.page} on ${iss.viewport}: scrollWidth=${iss.maxScroll}px > innerWidth=${iss.innerW}px (exceeds by +${iss.excess}px)`);
      if (iss.culprits && iss.culprits.length > 0) {
        iss.culprits.forEach(c => console.log(`   -> Culprit element: ${c.selector} (right edge=${c.rectRight}px, +${c.excess}px)`));
      }
    });
  } else {
    console.log('✅ ALL PAGES PERFECT! Zero horizontal overflow detected on any viewport from 320px to landscape!');
  }
}

runAudit().catch(err => {
  console.error('Audit failed with error:', err);
  process.exit(1);
});
