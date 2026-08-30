// Trip.com 分數擷取 - 使用純 HTTP 抓取 SSR 頁面解析分數
// （Trip 對無頭瀏覽器開啟會強制跳登入牆，但純 HTTP 的 SSR 頁可直接拿到分數）

const https = require('https');
const http = require('http');

function fetchHtml(url, redirectsLeft = 8) {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith('https') ? https : http;
    const req = mod.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36',
        'Accept-Language': 'zh-TW,zh;q=0.9,en;q=0.8',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      }
    }, res => {
      if ([301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location && redirectsLeft > 0) {
        const loc = res.headers.location;
        const next = loc.startsWith('http') ? loc : new URL(loc, url).toString();
        res.resume();
        fetchHtml(next, redirectsLeft - 1).then(resolve, reject);
        return;
      }
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve({ status: res.statusCode, data }));
    });
    req.on('error', reject);
    req.setTimeout(40000, () => req.destroy(new Error('timeout')));
  });
}

// 解析 Trip SSR 分數。Trip 的分數與評價數出現在 aria-label 內，格式：
//   中文: aria-label="8.6 很好 全部 14 則評論"
//   英文: aria-label="8.6 Very good All 42 reviews"
function parseScore(html) {
  // 分數：aria-label 開頭的帶小數數字，或「滿分 10 分，得 X 分」
  let score = null;
  let reviews = null;

  const full = html.match(/aria-label="([\d.]+) ([^"]*?) (?:全部 |All )?(\d+) (?:則評論|reviews)[^"]*"/);
  if (full) {
    score = parseFloat(full[1]);
    reviews = parseInt(full[3], 10);
  } else {
    const scoreOnly = html.match(/滿分 10 分，得 ([\d.]+) 分/);
    if (scoreOnly) score = parseFloat(scoreOnly[1]);
    const scoreOnlyEn = html.match(/Score: ([\d.]+)\/10/);
    if (scoreOnlyEn) score = parseFloat(scoreOnlyEn[1]);
  }

  if (!reviews) {
    const rc = html.match(/(\d+) (?:則評論|reviews|則評價)/);
    if (rc) reviews = parseInt(rc[1], 10);
  }

  return Number.isFinite(score) ? { score, reviews } : null;
}

// 依分數給出描述（與 Trip 相近的文案），僅供本地卡面使用
function descriptor(score) {
  if (score == null) return null;
  if (score >= 9) return '絕佳';
  if (score >= 8.5) return '很好';
  if (score >= 8) return '佳';
  if (score >= 7) return '尚可';
  if (score >= 6) return '普通';
  return '偏差';
}

module.exports = { fetchHtml, parseScore, descriptor };
