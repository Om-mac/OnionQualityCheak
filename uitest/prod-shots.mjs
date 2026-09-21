import puppeteer from 'puppeteer-core';
import fs from 'fs';

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const BASE = 'http://localhost:3001';
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
  await page.setViewport({ width: 1440, height: 900 });

  await page.goto(BASE + '/', { waitUntil: 'networkidle2', timeout: 30000 });
  await sleep(2500);

  // Hero
  await page.screenshot({ path: `${OUT}/prod_01_hero.png`, fullPage: false });

  // Scroll through sections
  const sections = [
    { name: '02_problem', scroll: 950 },
    { name: '03_how', scroll: 1900 },
    { name: '04_ai', scroll: 2900 },
    { name: '05_iot', scroll: 3800 },
    { name: '06_fusion', scroll: 4700 },
    { name: '07_market', scroll: 5600 },
    { name: '08_farmers', scroll: 6700 },
    { name: '09_fpos', scroll: 7800 },
    { name: '10_buyers', scroll: 8900 },
    { name: '11_report', scroll: 9900 },
    { name: '12_technology', scroll: 10900 },
    { name: '13_features', scroll: 11700 },
    { name: '14_testimonials', scroll: 12800 },
    { name: '15_faq', scroll: 13700 },
    { name: '16_cta_footer', scroll: 14600 },
  ];

  for (const s of sections) {
    await page.evaluate((y) => window.scrollTo(0, y), s.scroll);
    await sleep(800);
    await page.screenshot({ path: `${OUT}/prod_${s.name}.png`, fullPage: false });
  }

  // Mobile
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });
  await page.goto(BASE + '/', { waitUntil: 'networkidle2' });
  await sleep(2000);
  await page.screenshot({ path: `${OUT}/prod_mobile.png`, fullPage: false });

  console.log('Screenshots done');
  await browser.close();
})();