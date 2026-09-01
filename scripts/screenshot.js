// 風自然訂房網 - 分數截圖擷取腳本
// 用法: node scripts/screenshot.js [--all | --hotel hotel-1 | --source booking]
//
// - Booking: 用 Playwright 無頭瀏覽器開啟頁面，截取分數區塊
// - Agoda / Trip: 讀取頁面真實分數（DOM/SSR），產生風格化分數卡
//   （Agoda 的截圖選取器容易抓到錯誤評分區塊，故改讀文字）
//
// 產出: screenshots/{hotelId}/{source}.png

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const { HOTELS } = require('../config');
const { fetchHtml, parseScore } = require('./lib/trip');
const { buildSvg } = require('./lib/svg-card');

const BRAND_COLORS = { booking: '#003580', agoda: '#0c4258', trip: '#173CD2', maps: '#1a73e8' };

const OUT_DIR = path.join(__dirname, '..', 'screenshots');
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

const SITE_SELECTORS = {
  booking: [
    '[data-testid="review-score-component"]',
    '[data-testid="property-review-score"]'
  ]
};

function fmtTime(d = new Date()) {
  const p = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

async function shotWithPlaywright(browser, hotel, sourceKey, source) {
  const ctx = await browser.newContext({
    userAgent: UA,
    locale: 'zh-TW',
    viewport: { width: 1366, height: 900 },
    extraHTTPHeaders: { 'Accept-Language': 'zh-TW,zh;q=0.9,en;q=0.8' }
  });
  const page = await ctx.newPage();
  try {
    await page.goto(source.url, { waitUntil: 'domcontentloaded', timeout: 60000 });
    // 等待主要內容渲染（Agoda 的 ReviewScore 區塊位在頁面下方，需要較久）
    await page.waitForTimeout(5000);
    const selectors = SITE_SELECTORS[sourceKey];
    let found = false;
    for (const sel of selectors) {
      try {
        await page.waitForSelector(sel, { state: 'visible', timeout: 12000 });
      } catch (e) { continue; }
      try {
        const el = page.locator(sel).first();
        await el.scrollIntoViewIfNeeded({ timeout: 8000 }).catch(() => {});
        await page.waitForTimeout(1200);
        const file = path.join(OUT_DIR, hotel.id, `${sourceKey}.png`);
        fs.mkdirSync(path.dirname(file), { recursive: true });
        await el.screenshot({ path: file, timeout: 20000 });
        found = true;
        break;
      } catch (e) { continue; }
    }
    await ctx.close();
    return found
      ? { ok: true }
      : { ok: false, error: 'score element not found' };
  } catch (e) {
    await ctx.close();
    return { ok: false, error: e.message };
  }
}

async function shotTrip(hotel, sourceKey, source) {
  try {
    const { data } = await fetchHtml(source.url);
    const parsed = parseScore(data);
    if (!parsed) return { ok: false, error: 'trip score parse failed' };
    const svg = buildSvg({
      source: source.label,
      score: parsed.score,
      reviews: parsed.reviews,
      updatedAt: fmtTime(),
      brand: BRAND_COLORS[sourceKey] || BRAND_COLORS.trip
    });
    const svgFile = path.join(OUT_DIR, hotel.id, `${sourceKey}.svg`);
    fs.mkdirSync(path.dirname(svgFile), { recursive: true });
    fs.writeFileSync(svgFile, svg);
    return { ok: true, score: parsed.score, reviews: parsed.reviews };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

// Agoda: 開啟頁面後從 DOM 讀取真實「評鑑分數」與「篇評鑑」文字，產生分數卡
// （Agoda 的截圖選取器常抓到錯誤評分區塊，故改讀文字確保正確）
async function shotAgodaCard(browser, hotel, sourceKey, source) {
  const ctx = await browser.newContext({
    userAgent: UA,
    locale: 'zh-TW',
    viewport: { width: 1366, height: 900 },
    extraHTTPHeaders: { 'Accept-Language': 'zh-TW,zh;q=0.9,en;q=0.8' }
  });
  const page = await ctx.newPage();
  try {
    await page.goto(source.url, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(7000);
    const text = await page.evaluate(() => document.body.innerText);
    // Agoda 主評分格式（版本會變）：可能「評鑑分數8.9（總分10分）很讚 260 篇評鑑」
    // 或新版的「8.9 \n 很讚 \n 260 篇評鑑」
    let score = null;
    let reviews = null;
    const scorePrefix = text.match(/評鑑分數\s*(\d+(?:\.\d+)?)/);
    if (scorePrefix) score = parseFloat(scorePrefix[1]);
    else {
      // 新版：分數緊鄰描述詞（如「8.9\n很讚」）
      const near = text.match(/(\d+\.\d+)\s*\n+\s*(?:超棒|很讚|很好|不錯喔|滿意|低於預期)/);
      if (near) score = parseFloat(near[1]);
    }
    const reviewMatch = text.match(/(\d+)\s*篇評鑑/);
    if (reviewMatch) reviews = parseInt(reviewMatch[1], 10);
    if (score == null) { await ctx.close(); return { ok: false, error: 'agoda score not found' }; }
    const svg = buildSvg({
      source: source.label,
      score,
      reviews,
      updatedAt: fmtTime(),
      brand: BRAND_COLORS[sourceKey] || BRAND_COLORS.agoda
    });
    const svgFile = path.join(OUT_DIR, hotel.id, `${sourceKey}.svg`);
    fs.mkdirSync(path.dirname(svgFile), { recursive: true });
    fs.writeFileSync(svgFile, svg);
    await ctx.close();
    return { ok: true, score, reviews };
  } catch (e) {
    await ctx.close();
    return { ok: false, error: e.message };
  }
}

// Google 地圖: 開啟短連結後從 DOM 讀取「評分」與描述，產生分數卡
// （Google Maps 店家資訊卡 DOM 混淆且可滾動，改用讀文字確保正確穩定）
async function shotMapsCard(browser, hotel, sourceKey, source) {
  const ctx = await browser.newContext({
    userAgent: UA,
    locale: 'zh-TW',
    viewport: { width: 1366, height: 900 },
    extraHTTPHeaders: { 'Accept-Language': 'zh-TW,zh;q=0.9,en;q=0.8' }
  });
  const page = await ctx.newPage();
  try {
    await page.goto(source.url, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(8000);
    const text = await page.evaluate(() => document.body.innerText);
    const scoreMatch = text.match(/^(\d+\.\d)$/m) || text.match(/(?:\n|^)(\d\.\d)(?:\n|$)/);
    if (!scoreMatch) { await ctx.close(); return { ok: false, error: 'maps score not found' }; }
    const score = parseFloat(scoreMatch[1]);
    const svg = buildSvg({
      source: source.label,
      score,
      updatedAt: fmtTime(),
      brand: BRAND_COLORS[sourceKey] || BRAND_COLORS.maps
    });
    const svgFile = path.join(OUT_DIR, hotel.id, `${sourceKey}.svg`);
    fs.mkdirSync(path.dirname(svgFile), { recursive: true });
    fs.writeFileSync(svgFile, svg);
    await ctx.close();
    return { ok: true, score };
  } catch (e) {
    await ctx.close();
    return { ok: false, error: e.message };
  }
}

// SVGs are generated for Trip; convert to PNG via chromium (no network needed)
async function convertTripSvgs(browser) {
  const page = await browser.newPage({ viewport: { width: 420, height: 150 } });
  page.on('response', r => { /* block all network */ });
  const files = [];
  (await walk(OUT_DIR)).forEach(f => { if (f.endsWith('.svg')) files.push(f); });
  for (const svgFile of files) {
    const pngFile = svgFile.replace(/\.svg$/, '.png');
    const svg = fs.readFileSync(svgFile, 'utf8');
    const dataUrl = 'data:image/svg+xml;base64,' + Buffer.from(svg).toString('base64');
    await page.goto(dataUrl, { waitUntil: 'load', timeout: 30000 });
    await page.waitForTimeout(300);
    await page.screenshot({ path: pngFile });
  }
  await page.close();
  return files.map(f => f.replace(/\.svg$/, '.png'));
}

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(e =>
    e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]
  );
}

async function shotOne(browser, hotel, sourceKey, source) {
  if (sourceKey === 'trip') {
    return await shotTrip(hotel, sourceKey, source);
  } else if (sourceKey === 'agoda') {
    return await shotAgodaCard(browser, hotel, sourceKey, source);
  } else if (sourceKey === 'maps') {
    return await shotMapsCard(browser, hotel, sourceKey, source);
  }
  return await shotWithPlaywright(browser, hotel, sourceKey, source);
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function main() {
  const args = process.argv.slice(2);
  const onlyHotel = args.includes('--all') ? null : (args.find(a => a.startsWith('--hotel=')) || '').split('=')[1] || null;
  const onlySource = (args.find(a => a.startsWith('--source=')) || '').split('=')[1] || null;
  const maxRetries = (args.includes('--no-retry')) ? 0 : 1;

  console.log('開啟無頭瀏覽器 ...');
  const browser = await chromium.launch({ headless: true });

  const results = [];
  let idx = 0;
  for (const hotel of HOTELS) {
    if (onlyHotel && hotel.id !== onlyHotel) continue;
    for (const [sourceKey, source] of Object.entries(hotel.sources)) {
      if (onlySource && sourceKey !== onlySource) continue;
      idx++;
      process.stdout.write(`  ${hotel.alias} - ${source.label} ... `);
      let r = await shotOne(browser, hotel, sourceKey, source);
      for (let attempt = 0; attempt < maxRetries && !r.ok; attempt++) {
        process.stdout.write(`(重試${attempt + 1}) `);
        await sleep(3000);
        r = await shotOne(browser, hotel, sourceKey, source);
      }
      if (r.ok) {
        results.push({ hotelId: hotel.id, source: sourceKey, ok: true });
        console.log('✔');
      } else {
        results.push({ hotelId: hotel.id, source: sourceKey, ok: false, error: r.error });
        console.log('✘', r.error || 'unknown');
      }
      // 來源之間稍作停頓，降低被反爬蟲判定的機率
      await sleep(1500);
    }
  }

  process.stdout.write('  轉換 Trip 卡片 PNG ... ');
  const pngs = await convertTripSvgs(browser);
  console.log('✔', pngs.length, '張');

  await browser.close();
  console.log('\n完成。', results.filter(r => r.ok).length + '/' + results.length, '個來源取得分數。');
  results.forEach(r => {
    if (!r.ok) console.log(`  失敗: ${r.hotelId}/${r.source} -> ${r.error}`);
  });
}

main().catch(e => { console.error('致命錯誤:', e); process.exit(1); });
