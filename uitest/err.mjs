import puppeteer from 'puppeteer-core';

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const BASE = 'http://localhost:3100';

(async () => {
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });
  const page = await browser.newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push({ msg: e.message, stack: e.stack }));
  page.on('console', (m) => { if (m.type() === 'error') errs.push({ msg: '[console]' + m.text(), stack: m.stack && m.stack() }); });
  await page.goto(BASE + '/', { waitUntil: 'networkidle2', timeout: 30000 });
  await new Promise(r => setTimeout(r, 3000));
  console.log(JSON.stringify(errs, null, 2));
  await browser.close();
})();