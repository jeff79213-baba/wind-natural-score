// 風自然訂房網 - 二館 × 三家訂房網站設定（共用 config）
// 供擷取腳本與前端共用（前端透過 js/app.js 載入 HOTELS 資料）

const HOTELS = [
  {
    id: 'hotel-1',
    name: '風自然親子時尚旅宿',
    alias: '1館',
    color: '#2f6f4f',
    sources: {
      booking: {
        label: 'Booking.com',
        url: 'https://www.booking.com/hotel/tw/feng-zi-ran-qin-zi-shi-shang-lu-su.html'
      },
      agoda: {
        label: 'Agoda',
        url: 'https://www.agoda.com/zh-tw/wind-natural-parent-child-inn/hotel/taichung-tw.html'
      },
      trip: {
        label: 'Trip.com',
        url: 'https://tw.trip.com/hotels/taichung-hotel-detail-25925783/wind-natural-parent-child-inn/'
      }
    }
  },
  {
    id: 'hotel-2',
    name: '后麗安心親子時尚旅宿',
    alias: '2館',
    color: '#6d4a8f',
    sources: {
      booking: {
        label: 'Booking.com',
        url: 'https://www.booking.com/hotel/tw/hou-li-an-xin-qin-zi-shi-shang-lu-su.html'
      },
      agoda: {
        label: 'Agoda',
        url: 'https://www.agoda.com/zh-tw/wind-natural-parent-child-inn_2/hotel/taichung-tw.html'
      },
      trip: {
        label: 'Trip.com',
        url: 'https://www.trip.com/hotels/taichung-hotel-detail-124307430/wind-natural-parent-child-inn-ii/'
      }
    }
  }
];

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { HOTELS };
}
