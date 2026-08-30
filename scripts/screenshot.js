// 風自然訂房網 - 分數截圖擷取腳本
// 用法: node scripts/screenshot.js [--all | --hotel hotel-1 | --source booking]
//
// - Booking / Agoda: 用 Playwright 無頭瀏覽器開啟頁面，截取分數區塊
// - Trip: 用純 HTTP 抓 SSR 分數，產生風格化分數卡（因 Trip 對無頭瀏覽器強制登入牆）
//
// 產出: screenshots/{hotelId}/{source}.png

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const { HOTELS } = require('../config');
const { fetchHtml, parseScore, descriptor } = require('./lib/trip');
const { buildSvg } = require('./lib/svg-card');

const OUT_DIR = path.join(__dirname, '..', 'screenshots');
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

const SITE_SELECTORS = {
  booking: [
    '[data-testid="review-score-component"]',
    '[data-testid="property-review-score"]'
  ],
  agoda: [
    '[class*="ReviewPlate"]',
    '[class*="reviewBranding"]',
    '[class*="ReviewScore"]'
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
      updatedAt: fmtTime()
    });
    const svgFile = path.join(OUT_DIR, hotel.id, `${sourceKey}.svg`);
    fs.mkdirSync(path.dirname(svgFile), { recursive: true });
    fs.writeFileSync(svgFile, svg);
    return { ok: true, score: parsed.score, reviews: parsed.reviews };
  } catch (e) {
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

async function main() {
  const args = process.argv.slice(2);
  const onlyHotel = args.includes('--all') ? null : (args.find(a => a.startsWith('--hotel=')) || '').split('=')[1] || null;
  const onlySource = (args.find(a => a.startsWith('--source=')) || '').split('=')[1] || null;

  console.log('開啟無頭瀏覽器 ...');
  const browser = await chromium.launch({ headless: true });

  const results = [];
  for (const hotel of HOTELS) {
    if (onlyHotel && hotel.id !== onlyHotel) continue;
    for (const [sourceKey, source] of Object.entries(hotel.sources)) {
      if (onlySource && sourceKey !== onlySource) continue;
      process.stdout.write(`  ${hotel.alias} - ${source.label} ... `);
      let r;
      if (sourceKey === 'trip') {
        r = await shotTrip(hotel, sourceKey, source);
      } else {
        r = await shotWithPlaywright(browser, hotel, sourceKey, source);
      }
      if (r.ok) {
        results.push({ hotelId: hotel.id, source: sourceKey, ok: true });
        console.log('✔');
      } else {
        results.push({ hotelId: hotel.id, source: sourceKey, ok: false, error: r.error });
        console.log('✘', r.error || 'unknown');
      }
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
