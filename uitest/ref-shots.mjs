import puppeteer from 'puppeteer-core';
import fs from 'fs';

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const BASE = process.env.BASE || 'http://localhost:3000';
const OUT = 'c:/Users/darak/Desktop/onion zip/uitest/shots';
fs.mkdirSync(OUT, { recursive: true });

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

(async () => {
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--window-size=1440,900'],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });

  const consoleErrors = [];
  page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()); });
  page.on('pageerror', (e) => consoleErrors.push('PAGEERROR: ' + e.message));

  await page.goto(BASE + '/', { waitUntil: 'networkidle2', timeout: 30000 });
  await sleep(3000); // let animations settle

  // 1. Hero (top of page)
  await page.screenshot({ path: `${OUT}/ref_01_hero.png`, fullPage: false });

  // 2. Scroll to mid
  await page.evaluate(() => window.scrollTo(0, 800));
  await sleep(800);
  await page.screenshot({ path: `${OUT}/ref_02_problem.png`, fullPage: false });

  await page.evaluate(() => window.scrollTo(0, 1600));
  await sleep(800);
  await page.screenshot({ path: `${OUT}/ref_03_howitworks.png`, fullPage: false });

  await page.evaluate(() => window.scrollTo(0, 2400));
  await sleep(800);
  await page.screenshot({ path: `${OUT}/ref_04_ai.png`, fullPage: false });

  await page.evaluate(() => window.scrollTo(0, 3200));
  await sleep(800);
  await page.screenshot({ path: `${OUT}/ref_05_iot.png`, fullPage: false });

  await page.evaluate(() => window.scrollTo(0, 4800));
  await sleep(800);
  await page.screenshot({ path: `${OUT}/ref_06_farmers.png`, fullPage: false });

  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await sleep(1000);
  await page.screenshot({ path: `${OUT}/ref_07_footer.png`, fullPage: false });

  // 3. Full page
  await page.evaluate(() => window.scrollTo(0, 0));
  await sleep(500);
  await page.screenshot({ path: `${OUT}/ref_full.png`, fullPage: true });

  // 4. Mobile viewport
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });
  await page.goto(BASE + '/', { waitUntil: 'networkidle2' });
  await sleep(2000);
  await page.screenshot({ path: `${OUT}/ref_mobile.png`, fullPage: false });

  console.log('Console errors:', consoleErrors.length);
  consoleErrors.slice(0, 10).forEach(e => console.log('  !', e));
  console.log('Screenshots saved in:', OUT);
  await browser.close();
})();