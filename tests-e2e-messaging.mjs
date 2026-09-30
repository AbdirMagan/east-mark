import { chromium } from 'playwright';

// Two real accounts in two browser contexts: a buyer on a phone and the
// seller on a desktop, messaging about the same listing in real time.
const WEB = process.env.WEB_URL ?? 'http://localhost:5173';
const OUT = process.env.OUT_DIR ?? '.';
const LISTING_REF = process.env.LISTING_REF ?? '100013';
// The staff account's credentials never live in the repository.
const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
  console.error('Set ADMIN_EMAIL and ADMIN_PASSWORD (a staff account) to run the messaging test (it signs in as the seller).');
  process.exit(2);
}

const results = [];
const errors = [];

function check(name, passed, detail = '') {
  results.push({ name, passed });
  console.log(`${passed ? 'PASS' : 'FAIL'}  ${name}${detail ? `  — ${detail}` : ''}`);
}

// On a phone the inbox stays in the DOM (hidden) while a thread is open, so
// the same text can match twice. Only what the person can see counts.
function seen(page, text) {
  return page.getByText(text).filter({ visible: true });
}

async function open(browser, viewport, label) {
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();
  page.on('pageerror', (error) => errors.push(`${label} :: ${error.message}`));
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(`${label} :: ${msg.text()}`);
  });
  return page;
}

async function signIn(page, email, password) {
  await page.goto(`${WEB}/signin`, { waitUntil: 'networkidle' });
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForURL((url) => !url.pathname.startsWith('/signin'), { timeout: 20000 });
}

const browser = await chromium.launch();
const buyer = await open(browser, { width: 390, height: 844 }, 'buyer');
const seller = await open(browser, { width: 1280, height: 900 }, 'seller');

try {
  await signIn(buyer, 'demo-amina@eastmarket.test', 'DemoPassw0rd!');
  await signIn(seller, ADMIN_EMAIL, ADMIN_PASSWORD);
  check('both accounts signed in', true);

  // The seller sees a notice instead of messaging themselves.
  await seller.goto(`${WEB}/product/${LISTING_REF}`, { waitUntil: 'networkidle' });
  check('seller sees "This is your listing"', (await seen(seller, 'This is your listing').count()) > 0);

  // The buyer starts the conversation from the listing.
  await buyer.goto(`${WEB}/product/${LISTING_REF}`, { waitUntil: 'networkidle' });
  await buyer.getByRole('button', { name: /message/i }).first().click();
  await buyer.waitForURL(/\/messages\/[0-9a-f-]{36}$/, { timeout: 20000 });
  const threadPath = new URL(buyer.url()).pathname;
  check('Message opens a conversation', true, threadPath);
  await seen(buyer, /iphone 18/i).first().waitFor({ timeout: 15000 });
  check('thread shows the listing', true);

  // The seller has the thread open before the buyer writes.
  await seller.goto(`${WEB}${threadPath}`, { waitUntil: 'networkidle' });
  await seller.locator('#message-draft').waitFor({ timeout: 15000 });
  await seller.waitForTimeout(2500); // let the websocket subscribe

  const stamp = Date.now();
  const hello = `Is the phone still available? #${stamp}`;
  await buyer.fill('#message-draft', hello);
  await buyer.keyboard.press('Enter');

  await seen(seller, hello).first().waitFor({ timeout: 15000 });
  check('buyer message arrives live at the seller', true);

  const reply = `Yes, still available. #${stamp}`;
  await seller.fill('#message-draft', reply);
  await seller.keyboard.press('Enter');
  await seen(buyer, reply).first().waitFor({ timeout: 15000 });
  check('seller reply arrives live at the buyer', true);

  await seen(buyer, 'Seen').first().waitFor({ timeout: 15000 });
  check('buyer sees a read receipt', true);

  // History survives a reload, in order, without duplicates.
  await buyer.reload({ waitUntil: 'networkidle' });
  await seen(buyer, reply).first().waitFor({ timeout: 15000 });
  const visibleReplies = await seen(buyer, reply).count();
  check('no duplicated message after reload', visibleReplies === 1, `${visibleReplies} visible`);
  const body = await buyer.locator('body').innerText();
  check(
    'messages persist in order after reload',
    body.indexOf(hello) > -1 && body.indexOf(hello) < body.indexOf(reply),
  );

  await buyer.screenshot({ path: `${OUT}/msg-buyer-mobile.png` });
  await seller.screenshot({ path: `${OUT}/msg-seller-desktop.png` });

  await buyer.goto(`${WEB}/messages`, { waitUntil: 'networkidle' });
  await seen(buyer, 'Abadir Hassan').first().waitFor({ timeout: 15000 });
  check('buyer inbox lists the conversation', true);
  await buyer.screenshot({ path: `${OUT}/msg-buyer-inbox.png` });
} catch (error) {
  check('messaging flow', false, error.message.split('\n')[0]);
  await buyer.screenshot({ path: `${OUT}/msg-fail-buyer.png` }).catch(() => {});
  await seller.screenshot({ path: `${OUT}/msg-fail-seller.png` }).catch(() => {});
}

await browser.close();

if (errors.length) console.log(`\nConsole errors:\n${errors.join('\n')}`);
const failed = results.filter((r) => !r.passed).length;
console.log(`\n${results.length - failed}/${results.length} passed`);
process.exit(failed ? 1 : 0);
