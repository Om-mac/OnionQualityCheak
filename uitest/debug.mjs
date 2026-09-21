import puppeteer from 'puppeteer-core';
import fs from 'fs';

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const BASE = 'http://localhost:3000';

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

(async () => {
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--window-size=1440,900'],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  const consoleMessages = [];
  const pageErrors = [];
  page.on('console', (m) => { consoleMessages.push(`[${m.type()}] ${m.text()}`); });
  page.on('pageerror', (e) => pageErrors.push('PAGEERROR: ' + e.message + '\n' + e.stack));
  page.on('requestfailed', (r) => consoleMessages.push('REQUEST FAILED: ' + r.url() + ' :: ' + r.failure().errorText));

  await page.goto(BASE + '/', { waitUntil: 'networkidle2', timeout: 30000 });
  await sleep(3000);

  const html = await page.content();
  const rootHtml = await page.evaluate(() => document.getElementById('root')?.innerHTML?.slice(0, 2000) || 'NO ROOT');
  const title = await page.title();

  console.log('Title:', title);
  console.log('---HTML root snippet---');
  console.log(rootHtml);
  console.log('---console messages---');
  consoleMessages.forEach(m => console.log(m));
  console.log('---page errors---');
  pageErrors.forEach(m => console.log(m));

  await browser.close();
})();