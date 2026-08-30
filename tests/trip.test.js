import { describe, it, expect } from 'vitest';
import { parseScore, descriptor } from '../scripts/lib/trip.js';

describe('Trip SSR 分數解析', () => {
  it('解析中文 aria-label 分數與評價數', () => {
    const html = '<div aria-label="8.6 很好 全部 14 則評論"></div>';
    expect(parseScore(html)).toEqual({ score: 8.6, reviews: 14 });
  });

  it('解析英文 aria-label 分數與評價數', () => {
    const html = '<div aria-label="8.6 Very good All 42 reviews"></div>';
    expect(parseScore(html)).toEqual({ score: 8.6, reviews: 42 });
  });

  it('解析「滿分 10 分，得 X 分」格式', () => {
    const html = '<span>滿分 10 分，得 9.2 分</span>';
    const r = parseScore(html);
    expect(r.score).toBe(9.2);
  });

  it('找不到分數時回傳 null', () => {
    expect(parseScore('<div>沒有分數</div>')).toBeNull();
  });
});

describe('分數描述', () => {
  it('依分數給出對應描述', () => {
    expect(descriptor(9.2)).toBe('絕佳');
    expect(descriptor(8.6)).toBe('很好');
    expect(descriptor(8.2)).toBe('佳');
    expect(descriptor(7.5)).toBe('尚可');
    expect(descriptor(6.5)).toBe('普通');
    expect(descriptor(5)).toBe('偏差');
  });
});
