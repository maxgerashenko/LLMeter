// Take desktop and phone screenshots of each page of the site.
// Usage: node scripts/preview-screenshots.mjs <base-url> <out-dir>
// Used by .github/workflows/pr-preview.yml.
import { chromium, devices } from 'playwright';
import { mkdirSync } from 'node:fs';

const [base = 'http://localhost:8000', out = 'preview-screenshots'] = process.argv.slice(2);
const pages = ['index', 'horizon', 'rack', 'runs', 'research', 'techniques', 'jobs', 'economy', 'finance', 'ipo', 'sources'];
const views = {
  desktop: { viewport: { width: 1280, height: 800 } },
  phone: devices['iPhone 13'],
};

mkdirSync(out, { recursive: true });
const browser = await chromium.launch();
let failed = false;
for (const [view, options] of Object.entries(views)) {
  const context = await browser.newContext(options);
  for (const name of pages) {
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(`${base}/${name}.html`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${out}/${name}-${view}.png`, fullPage: true });
    if (errors.length) {
      failed = true;
      console.log(`::error::${name}.html (${view}) has script errors: ${errors.join('; ')}`);
    }
    await page.close();
  }
  await context.close();
}
await browser.close();
if (failed) process.exit(1);
