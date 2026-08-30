// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { readFileSync } from 'fs';
import path from 'path';
import { JSDOM } from 'jsdom';

// 載入真實 app.js 於 jsdom 中，並以 fixture metadata 驗證渲染
function setup() {
  const html = readFileSync(path.join(process.cwd(), 'index.html'), 'utf8');
  const dom = new JSDOM(html, { runScripts: 'outside-only', url: 'http://localhost/' });
  const { window } = dom;
  // 提供 fetch stub
  window.fetch = vi.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve({
      generatedAt: '2026/08/30 09:00',
      hotels: [
        {
          id: 'hotel-1', name: '風自然親子時尚旅宿', alias: '1館', color: '#2f6f4f',
          sources: {
            booking: { label: 'Booking.com', url: 'https://b1', image: 'screenshots/hotel-1/booking.png', updatedAt: '09:00', available: true },
            agoda: { label: 'Agoda', url: 'https://a1', image: 'screenshots/hotel-1/agoda.png', updatedAt: '09:00', available: true },
            trip: { label: 'Trip.com', url: 'https://t1', image: null, updatedAt: null, available: false }
          }
        },
        {
          id: 'hotel-2', name: '后麗安心親子時尚旅宿', alias: '2館', color: '#6d4a8f',
          sources: {
            booking: { label: 'Booking.com', url: 'https://b2', image: 'screenshots/hotel-2/booking.png', updatedAt: '09:01', available: true },
            agoda: { label: 'Agoda', url: 'https://a2', image: 'screenshots/hotel-2/agoda.png', updatedAt: '09:01', available: true },
            trip: { label: 'Trip.com', url: 'https://t2', image: null, updatedAt: null, available: false }
          }
        }
      ]
    })
  });
  // 執行 app.js
  const appCode = readFileSync(path.join(process.cwd(), 'js/app.js'), 'utf8');
  window.eval(appCode);
  return { window, document: window.document };
}

describe('前端儀表板渲染', () => {
  let document;

  beforeEach(async () => {
    ({ document } = setup());
    // 等待 async load 完成
    await new Promise(r => setTimeout(r, 20));
  });

  afterEach(() => { vi.restoreAllMocks(); });

  it('渲染兩館卡片', () => {
    const cards = document.querySelectorAll('.hotel-card');
    expect(cards.length).toBe(2);
    expect(document.querySelector('.hotel-card[data-hotel="hotel-1"] h2').textContent).toContain('風自然親子時尚旅宿');
    expect(document.querySelector('.hotel-card[data-hotel="hotel-2"] h2').textContent).toContain('后麗安心親子時尚旅宿');
  });

  it('每館列出三家訂房網站區塊', () => {
    expect(document.querySelectorAll('.source-block').length).toBe(6);
  });

  it('有截圖的顯示圖片，無截圖的顯示暫無提醒', () => {
    expect(document.querySelectorAll('.source-block img').length).toBe(4);
    expect(document.querySelectorAll('.source-block .missing').length).toBe(2);
  });

  it('區塊可點擊且連結正確', () => {
    const bookingBlock = Array.from(document.querySelectorAll('.source-block'))
      .find(a => a.querySelector('.site-name').textContent.includes('Booking'));
    expect(bookingBlock.href).toContain('https://b1');
    expect(bookingBlock.target).toBe('_blank');
  });

  it('顯示資料更新時間', () => {
    expect(document.querySelector('#updated-label').textContent).toContain('2026/08/30 09:00');
  });
});
