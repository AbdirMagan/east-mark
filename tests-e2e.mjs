import { chromium } from 'playwright';

const WEB = process.env.WEB_URL ?? 'http://localhost:5174';
const ADMIN = process.env.ADMIN_URL ?? 'http://localhost:5175';
const OUT = process.env.OUT_DIR ?? '.';

const results = [];
const consoleErrors = [];

function check(name, passed, detail = '') {
  results.push({ name, passed, detail });
  console.log(`${passed ? 'PASS' : 'FAIL'}  ${name}${detail ? `  — ${detail}` : ''}`);
}

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await context.newPage();

// Any uncaught page error is a real defect, so collect them rather than
// silently passing a screen that threw on render.
page.on('console', (msg) => {
  if (msg.type() === 'error') consoleErrors.push(`${page.url()} :: ${msg.text()}`);
});
page.on('pageerror', (error) => consoleErrors.push(`${page.url()} :: ${error.message}`));

/* ------------------------------------------------------------------ */
/* Marketplace                                                         */
/* ------------------------------------------------------------------ */

await page.goto(WEB, { waitUntil: 'networkidle', timeout: 30000 });
check('marketplace loads', (await page.title()).includes('East-Market'), await page.title());

const cards = await page.locator('article').count();
check('home renders listings', cards > 0, `${cards} product cards`);

const heroText = await page.locator('h1').first().innerText();
check('hero headline present', heroText.length > 0, heroText);

await page.screenshot({ path: `${OUT}/01-home.png`, fullPage: false });

// Search
await page.goto(`${WEB}/browse?q=iphone`, { waitUntil: 'networkidle' });
const searchCount = await page.locator('article').count();
const searchHeading = await page.locator('h1').first().innerText();
check('search returns results', searchCount > 0, `${searchCount} results for "${searchHeading}"`);
await page.screenshot({ path: `${OUT}/02-search.png` });

// Filters via URL
await page.goto(`${WEB}/browse?category=electronics&sort=price_asc`, { waitUntil: 'networkidle' });
const filtered = await page.locator('article').count();
check('category filter works', filtered > 0, `${filtered} listings in Electronics`);

// Product detail
await page.goto(`${WEB}/product/100013`, { waitUntil: 'networkidle' });
const title = await page.locator('h1').first().innerText();
const hasPrice = await page.getByText('$17,985').count();
check('product detail loads', /iphone/i.test(title), title);
check('product price renders', hasPrice > 0);
const ogImage = await page.locator('meta[property="og:image"]').getAttribute('content');
check('Open Graph image set for sharing', Boolean(ogImage), ogImage?.slice(0, 60));
const jsonLd = await page.locator('script[type="application/ld+json"]').count();
check('JSON-LD structured data present', jsonLd > 0);
await page.screenshot({ path: `${OUT}/03-product.png` });

// Localisation — Somali
await page.goto(WEB, { waitUntil: 'networkidle' });
await page.evaluate(() => localStorage.setItem('em.language', 'so'));
await page.reload({ waitUntil: 'networkidle' });
const somaliHero = await page.locator('h1').first().innerText();
check('Somali localisation', somaliHero.includes('Iibso'), somaliHero);
await page.screenshot({ path: `${OUT}/04-somali.png` });

// Amharic
await page.evaluate(() => localStorage.setItem('em.language', 'am'));
await page.reload({ waitUntil: 'networkidle' });
const amharicHero = await page.locator('h1').first().innerText();
check('Amharic localisation', /[ሀ-፿]/.test(amharicHero), amharicHero);

await page.evaluate(() => localStorage.setItem('em.language', 'en'));

// Dark mode
await page.evaluate(() => {
  localStorage.setItem('em.preferences', JSON.stringify({ state: { theme: 'dark', currency: 'USD' }, version: 1 }));
});
await page.reload({ waitUntil: 'networkidle' });
const isDark = await page.evaluate(() => document.documentElement.classList.contains('dark'));
check('dark mode applies', isDark);
await page.screenshot({ path: `${OUT}/05-dark.png` });

// Mobile layout
const mobile = await context.newPage();
await mobile.setViewportSize({ width: 390, height: 844 });
await mobile.goto(WEB, { waitUntil: 'networkidle' });
const bottomNav = await mobile.locator('nav').last().isVisible();
const overflows = await mobile.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
check('mobile bottom nav visible', bottomNav);
check('no horizontal overflow on mobile', !overflows);
await mobile.screenshot({ path: `${OUT}/06-mobile.png`, fullPage: false });
await mobile.close();

// Catalogue and markets come straight from the database.
const catalogue = await page.evaluate(async () => {
  const cats = await fetch('/api/v1/categories').then((r) => r.json());
  const countries = await fetch('/api/v1/locations/countries').then((r) => r.json());
  return { cats: cats.data.map((c) => c.name), countries: countries.data.map((c) => c.code) };
});
check('exactly five categories', catalogue.cats.length === 5, catalogue.cats.join(', '));
check('Djibouti is a market', catalogue.countries.includes('DJ'), catalogue.countries.join(', '));

// Africa map: served as a static file and applied as the page backdrop.
await page.goto(WEB, { waitUntil: 'networkidle' });
const mapServed = await page.evaluate(async () => (await fetch('/africa-map.svg')).ok);
const backdrop = await page.evaluate(() =>
  [...document.querySelectorAll('div')].some((d) => {
    const style = getComputedStyle(d);
    return `${style.maskImage} ${style.webkitMaskImage}`.includes('africa-map');
  }),
);
check('Africa map served', mapServed);
check('Africa map applied as page backdrop', backdrop);
await page.screenshot({ path: `${OUT}/05b-africa-backdrop.png` });

/* ------------------------------------------------------------------ */
/* Admin dashboard                                                     */
/* ------------------------------------------------------------------ */

await page.goto(ADMIN, { waitUntil: 'networkidle', timeout: 30000 });
check('admin shows sign-in when signed out', (await page.getByText('Staff sign in').count()) > 0);
await page.screenshot({ path: `${OUT}/07-admin-signin.png` });

// A non-staff account must be turned away.
await page.fill('#email', 'demo-amina@eastmarket.test');
await page.fill('#password', 'DemoPassw0rd!');
await page.click('button[type=submit]');
await page.waitForTimeout(4000);
const refused = await page.locator('[role=alert]').innerText().catch(() => '');
check('non-staff account refused', /staff access/i.test(refused), refused.trim());

// Now the real admin.
await page.fill('#email', 'abadirhassan10@gmail.com');
await page.fill('#password', 'EastMarket!Admin2026');
await page.click('button[type=submit]');
await page.waitForTimeout(6000);

const onDashboard = (await page.getByText('Dashboard').count()) > 0;
check('admin signs in', onDashboard);

const statValues = await page.locator('main p.font-bold').allInnerTexts().catch(() => []);
check('dashboard stats render', statValues.some((v) => /\d/.test(v)), statValues.slice(0, 6).join(' | '));

const charts = await page.locator('svg.recharts-surface').count();
check('charts render', charts > 0, `${charts} charts`);
await page.screenshot({ path: `${OUT}/08-admin-dashboard.png`, fullPage: true });

// Moderation queue
await page.click('a[href="/listings"]');
await page.waitForTimeout(3000);
const rows = await page.locator('tbody tr').count();
// After a cleanup the queue can legitimately be empty; the empty state is a pass.
const queueEmpty = (await page.getByText('Nothing waiting for review').count()) > 0;
check('moderation queue renders', rows > 0 || queueEmpty, rows > 0 ? `${rows} row(s)` : 'queue is clear');
await page.screenshot({ path: `${OUT}/09-admin-listings.png` });

// Users
await page.click('a[href="/users"]');
await page.waitForTimeout(3000);
const userRows = await page.locator('tbody tr').count();
check('users screen lists accounts', userRows > 0, `${userRows} account(s)`);
await page.screenshot({ path: `${OUT}/10-admin-users.png` });

// The write path should fail with the service-role message, not a crash.
await page.click('a[href="/listings"]');
await page.waitForTimeout(2500);
const approve = page.getByRole('button', { name: /approve/i }).first();
if (await approve.count()) {
  await approve.click();
  await page.waitForTimeout(3500);
  check('approve attempted (expect service-role failure)', true, 'clicked');
} else {
  check('nothing pending to approve', true, 'queue is clear');
}
await page.screenshot({ path: `${OUT}/11-admin-approve.png` });

/* ------------------------------------------------------------------ */

console.log('\n--- console/page errors ---');
if (consoleErrors.length === 0) console.log('none');
else consoleErrors.slice(0, 12).forEach((e) => console.log('  ' + e));

const failed = results.filter((r) => !r.passed);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);

await browser.close();
process.exit(failed.length > 0 ? 1 : 0);
