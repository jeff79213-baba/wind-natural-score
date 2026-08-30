import { describe, it, expect } from 'vitest';
import { HOTELS } from '../config.js';

describe('風自然訂房網設定', () => {
  it('包含兩館', () => {
    expect(HOTELS).toHaveLength(2);
    expect(HOTELS[0].id).toBe('hotel-1');
    expect(HOTELS[1].id).toBe('hotel-2');
  });

  it('每館包含三家訂房網站', () => {
    for (const hotel of HOTELS) {
      expect(Object.keys(hotel.sources).sort()).toEqual(['agoda', 'booking', 'trip']);
    }
  });

  it('每家都有訂房網址且為有效 URL', () => {
    for (const hotel of HOTELS) {
      for (const src of Object.values(hotel.sources)) {
        expect(src.url).toMatch(/^https:\/\//);
        expect(src.label).toBeTruthy();
      }
    }
  });

  it('一館與二館網址不同', () => {
    for (const key of ['booking', 'agoda', 'trip']) {
      expect(HOTELS[0].sources[key].url).not.toBe(HOTELS[1].sources[key].url);
    }
  });
});
