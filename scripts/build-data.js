// 風自然訂房網 - 從 screenshots/ 產生 data/metadata.json（供前端顯示）
// 用法: node scripts/build-data.js
// 需先執行 scripts/screenshot.js

const fs = require('fs');
const path = require('path');
const { HOTELS } = require('../config');

const SCREENSHOT_DIR = path.join(__dirname, '..', 'screenshots');
const DATA_DIR = path.join(__dirname, '..', 'data');

function p2(n) { return String(n).padStart(2, '0'); }
function fmt(d) { return `${d.getFullYear()}/${p2(d.getMonth()+1)}/${p2(d.getDate())} ${p2(d.getHours())}:${p2(d.getMinutes())}`; }

function statOf(file) {
  try { return fs.statSync(file).mtime; } catch (e) { return null; }
}

function build() {
  const hotels = HOTELS.map(hotel => {
    const sources = {};
    for (const [key, src] of Object.entries(hotel.sources)) {
      const png = path.join(SCREENSHOT_DIR, hotel.id, `${key}.png`);
      const exists = fs.existsSync(png);
      sources[key] = {
        label: src.label,
        url: src.url,
        image: exists ? `screenshots/${hotel.id}/${key}.png` : null,
        updatedAt: exists ? fmt(statOf(png)) : null,
        available: exists
      };
    }
    return { id: hotel.id, name: hotel.name, alias: hotel.alias, color: hotel.color, sources };
  });

  const data = {
    generatedAt: fmt(new Date()),
    hotels
  };
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(path.join(DATA_DIR, 'metadata.json'), JSON.stringify(data, null, 2));
  console.log('已寫入 data/metadata.json');
}

build();
