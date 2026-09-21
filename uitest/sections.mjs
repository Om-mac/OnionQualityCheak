import puppeteer from 'puppeteer-core';
import fs from 'fs';

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const BASE = 'http://localhost:3000';
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

  // Scroll to each section and take a screenshot
  const sections = [
    { name: 'hero', scroll: 0 },
    { name: 'problem', scroll: 1000 },
    { name: 'how-it-works', scroll: 1900 },
    { name: 'ai-inspection', scroll: 2800 },
    { name: 'iot', scroll: 3800 },
    { name: 'fusion', scroll: 4700 },
    { name: 'market', scroll: 5600 },
    { name: 'farmers', scroll: 6700 },
    { name: 'fpos', scroll: 7800 },
    { name: 'buyers', scroll: 8900 },
    { name: 'report', scroll: 9900 },
    { name: 'technology', scroll: 10900 },
    { name: 'features', scroll: 11700 },
    { name: 'testimonials', scroll: 12800 },
    { name: 'faq', scroll: 13700 },
    { name: 'cta-footer', scroll: 14600 },
  ];

  for (const s of sections) {
    await page.evaluate((y) => window.scrollTo(0, y), s.scroll);
    await sleep(800);
    await page.screenshot({ path: `${OUT}/section_${s.name}.png`, fullPage: false });
  }

  await browser.close();
  console.log('All section screenshots done');
})();