/**
 * Lighthouse Mobile Audit Runner for Swan Studio
 * Audits Home and Shop pages and outputs Performance, Accessibility, Best Practices, SEO scores.
 */
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const targetUrl = process.argv[2] || 'http://localhost:4000/index.html';
const tempOut = path.join(__dirname, 'temp-lh.json');

console.log(`Running Lighthouse Mobile Audit on: ${targetUrl}...`);

try {
  execSync(
    `npx --yes lighthouse "${targetUrl}" --output=json --output-path="${tempOut}" --chrome-flags="--headless=new --no-sandbox" --form-factor=mobile --quiet --only-categories=performance,accessibility,best-practices,seo`,
    { stdio: 'inherit', timeout: 90000 }
  );

  if (fs.existsSync(tempOut)) {
    const report = JSON.parse(fs.readFileSync(tempOut, 'utf8'));
    const categories = report.categories;

    const scores = {
      performance: Math.round(categories.performance.score * 100),
      accessibility: Math.round(categories.accessibility.score * 100),
      bestPractices: Math.round(categories['best-practices'].score * 100),
      seo: Math.round(categories.seo.score * 100)
    };

    console.log('\n========================================');
    console.log(`📊 LIGHTHOUSE MOBILE REPORT: ${targetUrl}`);
    console.log('========================================');
    console.log(`⚡ Performance:    ${scores.performance}/100`);
    console.log(`♿ Accessibility:  ${scores.accessibility}/100`);
    console.log(`🛡️  Best Practices: ${scores.bestPractices}/100`);
    console.log(`🔍 SEO:            ${scores.seo}/100`);
    console.log('========================================\n');

    fs.unlinkSync(tempOut);
  }
} catch (err) {
  console.error('Lighthouse audit failed:', err.message);
}
