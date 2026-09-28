// ONIONSURE — Real browser walkthrough (puppeteer-core driving installed Chrome)
import puppeteer from 'puppeteer-core';
import fs from 'fs';

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const BASE = 'http://localhost:3000';
const OUT = 'c:/Users/darak/Desktop/onion zip/uitest/shots';
fs.mkdirSync(OUT, { recursive: true });

let PASS = 0, FAIL = 0;
const log = [];
function check(name, ok, detail = '') {
  if (ok) { PASS++; log.push(`  [PASS] ${name}`); }
  else { FAIL++; log.push(`  [FAIL] ${name} :: ${detail}`); }
}
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function clickByText(page, text, tag = '*', timeout = 8000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    const h = await page.evaluateHandle((text, tag) => {
      const els = [...document.querySelectorAll(tag)];
      const matches = els.filter(e => e.textContent.trim().includes(text) && e.offsetParent !== null);
      return matches[matches.length - 1]; // deepest element = the actual button/link
    }, text, tag);
    const el = h.asElement();
    if (el) { await el.click(); return true; }
    await sleep(200);
  }
  throw new Error('clickable text not found: ' + text);
}
async function fillByPlaceholder(page, placeholder, value, tag = 'input') {
  const sel = `${tag}[placeholder="${placeholder}"]`;
  await page.waitForSelector(sel, { timeout: 8000 });
  await page.click(sel);
  // Fields may be pre-filled (demo defaults). Select-all + backspace so React's onChange fires.
  await page.keyboard.down('Control'); await page.keyboard.press('KeyA'); await page.keyboard.up('Control');
  await page.keyboard.press('Backspace');
  await page.type(sel, value);
}
async function textPresent(page, text, timeout = 8000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    const found = await page.evaluate((t) => document.body.innerText.includes(t), text);
    if (found) return true;
    await sleep(200);
  }
  return false;
}

(async () => {
  const consoleErrors = [];
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--window-size=1366,900'],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1366, height: 900 });
  page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()); });
  page.on('pageerror', (e) => consoleErrors.push('PAGEERROR: ' + e.message));
  const badResponses = new Set();
  page.on('response', (res) => { if (res.status() >= 400) badResponses.add(res.status() + ' ' + res.url()); });

  const ts = Date.now();
  const user = `uifarmer_${ts}`;
  const mobile = `777${String(ts).slice(-7)}`;

  try {
    // STEP 1 — App loads
    console.log('STEP 1: load /login');
    await page.goto(BASE + '/login', { waitUntil: 'networkidle2', timeout: 30000 });
    const loaded = await textPresent(page, 'onionsure', 5000);
    check('App loads with branding (onionsure)', loaded);
    await page.screenshot({ path: `${OUT}/01_login.png` });

    // STEP 2 — Toggle to signup
    console.log('STEP 2: switch to farmer signup form');
    await clickByText(page, 'Create Farmer Account');
    await sleep(1500);
    await page.screenshot({ path: `${OUT}/02_signup_toggled.png` });
    const signupShown = await page.$('input[placeholder="Ramesh Patil"]') !== null;
    if (!signupShown) {
      const body = await page.evaluate(() => document.body.innerText.slice(0, 400));
      console.log('  [debug] signup form NOT shown. Body snippet:', body.replace(/\n/g,' '));
    }
    check('Signup form appears (Full Name field present)', signupShown);
    if (signupShown) await page.screenshot({ path: `${OUT}/02_signup_form.png` });

    // STEP 3 — Fill + submit signup
    console.log('STEP 3: submit farmer signup');
    await fillByPlaceholder(page, 'Ramesh Patil', 'UI Test Farmer');
    await fillByPlaceholder(page, '9876543210', mobile);
    await fillByPlaceholder(page, 'Nashik', 'UI Village');
    await fillByPlaceholder(page, 'ramesh_patil', user); // username placeholder
    await fillByPlaceholder(page, 'Min 6 characters', 'secret123');
    await page.screenshot({ path: `${OUT}/03_signup_filled.png` });
    await clickByText(page, 'Create Farmer Account', 'button');
    // Wait for navigation to farmer dashboard
    let onDash = false;
    for (let i = 0; i < 25; i++) {
      const url = page.url();
      if (url.includes('/farmer/dashboard')) { onDash = true; break; }
      await sleep(300);
    }
    check('Signup auto-logs in → Farmer Dashboard', onDash, 'url=' + page.url());
    await sleep(800);
    await page.screenshot({ path: `${OUT}/04_farmer_dashboard.png` });

    // STEP 4 — Lot creation (NO ACTIVE LOT -> create -> Central Lot ID)
    console.log('STEP 4: create lot from dashboard');
    const noActive = await textPresent(page, 'NO ACTIVE LOT', 5000);
    check('Empty state "NO ACTIVE LOT" shown', noActive);
    await clickByText(page, 'Create / Submit Lot');
    await sleep(500);
    const formShown = await page.$('input[placeholder="Onion"]') !== null;
    check('Lot creation form appears', formShown);
    await fillByPlaceholder(page, '1000', '750');
    await clickByText(page, 'Submit Lot', 'button');
    // Wait for Central Lot ID banner
    let centralOk = false;
    for (let i = 0; i < 25; i++) {
      if (await textPresent(page, 'CENTRAL LOT ID', 500)) { centralOk = true; break; }
      await sleep(300);
    }
    check('Lot created → Central Lot ID banner shown', centralOk);
    // Capture the actual lot number text
    const lotNo = await page.evaluate(() => {
      const m = document.body.innerText.match(/ON-2026-\d+/);
      return m ? m[0] : null;
    });
    check('Central Lot ID has format ON-2026-NNNNN', !!lotNo, 'got ' + lotNo);
    await page.screenshot({ path: `${OUT}/05_lot_created.png` });

    // STEP 5 — Officer login + dashboard (clear farmer session first)
    console.log('STEP 5: officer login + dashboard');
    await page.evaluate(() => { try { localStorage.clear(); sessionStorage.clear(); } catch (e) {} });
    await page.goto(BASE + '/login', { waitUntil: 'networkidle2' });
    await sleep(1200);
    await fillByPlaceholder(page, 'Enter username', 'officer1');
    await fillByPlaceholder(page, 'Enter password', 'password123');
    await clickByText(page, 'Sign In', 'button');
    let officerHome = false;
    for (let i = 0; i < 30; i++) {
      if (page.url().includes('/quality/dashboard') || page.url().includes('/dashboard')) { officerHome = true; break; }
      await sleep(300);
    }
    await sleep(1000);
    check('Officer login succeeds (dashboard reached)', officerHome, 'url=' + page.url());
    await page.screenshot({ path: `${OUT}/06_officer_dashboard.png` });
    // Navigate to inspections/lots to confirm the mandatory lot is visible
    const sawMandatory = await page.evaluate(() => document.body.innerText.includes('ON-2026-00421'));
    if (!sawMandatory) {
      // try navigating to an inspections page
      for (const p of ['/inspections', '/officer/inspections', '/lots']) {
        await page.goto(BASE + p, { waitUntil: 'networkidle2' }).catch(()=>{});
        await sleep(800);
        if (await page.evaluate(() => document.body.innerText.includes('ON-2026-00421'))) break;
      }
    }
    const sawMandatory2 = await page.evaluate(() => document.body.innerText.includes('ON-2026-00421'));
    check('Officer can see mandatory lot ON-2026-00421', sawMandatory2);
    await page.screenshot({ path: `${OUT}/07_officer_lots.png` });

    // STEP 6 — QR verify public page (use a real cert from the live DB via API)
    console.log('STEP 6: public QR verification page');
    const qr = await (await fetch('http://localhost:4000/api/lots/lookup/ON-2026-00421', {
      headers: { Authorization: 'Bearer ' + (await fetch('http://localhost:4000/api/auth/login', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:'officer1',password:'password123'})}).then(r=>r.json()).then(j=>j.token)) }
    }).then(r=>r.json()));
    // get a certificate's qrToken from cert list
    const certs = await fetch('http://localhost:4000/api/certificates', { headers: { Authorization: 'Bearer ' + (await fetch('http://localhost:4000/api/auth/login', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:'officer1',password:'password123'})}).then(r=>r.json()).then(j=>j.token)) } }).then(r=>r.json());
    const someQr = certs[0]?.qrToken;
    if (someQr) {
      await page.goto(BASE + '/verify/' + someQr, { waitUntil: 'networkidle2' });
      await sleep(1000);
      const verified = await textPresent(page, 'VERIFIED', 5000);
      check('Public QR verify page shows VERIFIED', verified);
      await page.screenshot({ path: `${OUT}/08_qr_verify.png` });
    } else {
      check('Public QR verify page shows VERIFIED', false, 'no qrToken available');
    }

  } catch (e) {
    check('Unexpected error during walkthrough', false, e.message);
  }

  check('No console/page errors during UI journey', consoleErrors.length === 0, consoleErrors.slice(0,5).join(' | '));

  console.log('\n================ UI WALKTHROUGH ================');
  log.forEach(l => console.log(l));
  console.log(`RESULT: ${PASS} passed, ${FAIL} failed`);
  console.log('Console errors captured:', consoleErrors.length);
  if (consoleErrors.length) consoleErrors.slice(0, 10).forEach(e => console.log('  !', e));
  console.log('Failing HTTP responses:');
  [...badResponses].forEach(u => console.log('  !', u));
  console.log('Screenshots in:', OUT);
  await browser.close();
  process.exit(FAIL > 0 ? 1 : 0);
})();
