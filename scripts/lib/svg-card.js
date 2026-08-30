// 產生 Trip 分數卡片（SVG）→ 供轉 PNG
// 因 Trip 對無頭瀏覽器強制登入牆，改用純 HTTP 拿到真實分數後，
// 以與 Trip 相近的視覺呈現分數卡。

const fs = require('fs');
const path = require('path');

function escapeXml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// 分數描述（與 Trip 語意近似）
function descriptor(score) {
  if (score == null) return '分數';
  if (score >= 9) return '絕佳';
  if (score >= 8.5) return '很好';
  if (score >= 8) return '佳';
  if (score >= 7) return '尚可';
  if (score >= 6) return '普通';
  return '偏差';
}

function buildSvg({ source, score, reviews, updatedAt }) {
  const W = 420;
  const H = 150;
  const brand = '#173CD2';
  const desc = descriptor(score);
  const scoreTxt = (score != null && Number.isFinite(score)) ? score.toFixed(1) : '--';
  const reviewTxt = (reviews != null) ? `${reviews} 則評論` : '';
  const timeTxt = updatedAt ? `更新於 ${updatedAt}` : '';

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" rx="14" fill="#ffffff" stroke="#e4e4e4" stroke-width="1"/>
  <text x="20" y="34" font-family="'Noto Sans TC','Microsoft JhengHei',sans-serif" font-size="13" fill="#333">${escapeXml(source)}</text>
  <text x="${W-20}" y="34" text-anchor="end" font-family="'Noto Sans TC','Microsoft JhengHei',sans-serif" font-size="11" fill="#999">${escapeXml(timeTxt)}</text>
  <line x1="20" y1="46" x2="${W-20}" y2="46" stroke="#eee" stroke-width="1"/>
  <text x="24" y="100" font-family="'Noto Sans TC','Microsoft JhengHei',sans-serif" font-size="48" font-weight="bold" fill="${brand}">${scoreTxt}<tspan font-size="20" fill="#888">/10</tspan></text>
  <text x="150" y="86" font-family="'Noto Sans TC','Microsoft JhengHei',sans-serif" font-size="20" fill="#333">${escapeXml(desc)}</text>
  <text x="150" y="112" font-family="'Noto Sans TC','Microsoft JhengHei',sans-serif" font-size="14" fill="#666">${escapeXml(reviewTxt)}</text>
</svg>`;
}

module.exports = { buildSvg };

if (require.main === module) {
  const out = process.argv[2];
  const svg = buildSvg({ source: 'Trip.com', score: 8.6, reviews: 14, updatedAt: '2026-08-30 12:00' });
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, svg);
  console.log('SVG written:', out);
}
