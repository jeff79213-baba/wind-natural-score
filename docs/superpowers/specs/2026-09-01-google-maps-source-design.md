# Google 地圖評分來源設計

日期：2026/09/01

## 目標

在「風自然訂房網分數查詢」頁面，為每家飯店新增第 4 個來源區塊「Google 地圖」，顯示各館的 Google 地圖評分，點擊可連到對應的 Google Maps 短連結。

## 需求背景與技術事實

- 使用者原希望「只截 Google 地圖店家資訊卡」。
- 實測發現：Google Maps 頁面的店家資訊卡 DOM 為混淆 class 名稱、動態載入、可滾動且高度超過 viewport（約 2300px），無法用穩定選取器精準截取單一區塊。
- 取得的分數正確且穩定，故採「文字分數卡」方式（與 Agoda 現行機制相同）。

## 分數資料（實測讀取）

| 館 | 名稱 | 評分 | 描述 | 短連結 |
|----|------|------|------|--------|
| hotel-1 | 風自然親子時尚旅宿1館 | 4.9 | 4 星級飯店 | `https://maps.app.goo.gl/4GK343adN48mHqYP6?g_st=il` |
| hotel-2 | 后麗安心親子時尚旅宿 | 4.7 | 民宿 | `https://maps.app.goo.gl/dBgSX2WaxN9ug2xa6?g_st=il` |

## 設計

### 1. `config.js`

每館 `sources` 新增 `maps` 來源：

```js
maps: {
  label: 'Google 地圖',
  url: '<短連結>'
}
```

### 2. `scripts/screenshot.js`

新增 `shotMapsCard(browser, hotel, sourceKey, source)`：

- 用 Playwright 無頭瀏覽器開啟短連結（`waitUntil: 'domcontentloaded'` + 等待渲染）。
- 從 `document.body.innerText` 用正則解析分數：`評分 (\d+\.\d)`（如 `4.9`）。
- 描述文字取自能在內文中比對到的「4 星級飯店」或「民宿」。採泛用規則：抓取分數後緊鄰的非數值描述（如依內文 `.split('\n')` 找打分數所在行之後的下一行）。
- 呼叫 `buildSvg` 產生 SVG 卡片，品牌色 `maps: '#1a73e8'`。
- 產出路徑 `screenshots/{hotelId}/maps.svg` → 由既有 `convertTripSvgs` 轉為 `maps.png`。
- `BRAND_COLORS` 增加 `maps`。

### 3. `js/app.js`

- 來源順序由 `['booking', 'agoda', 'trip']` 改為 `['booking', 'agoda', 'trip', 'maps']`。
- 品牌色表增加 `maps: '#1a73e8'`。

### 4. `scripts/build-data.js`

無需改動（自動從 `HOTELS` 迭代來源，讀取 PNG 產 metadata）。

### 5. `data/metadata.json`

由 build-data 產生，無需手動維護。

## 錯誤處理

- 若短連結解析不到分數 → 回傳 `{ ok: false, error: 'maps score not found' }`，該來源標示不可用（前端顯示「暫無分數」）。
- Google Maps 可能出現登入/同意 cookie 牆 → 用 Accept-Language zh-TW + 等待渲染降低機率；失敗時不 crash，僅該館該來源失敗。

## 測試

- `tests/config.test.js`：確認每館 sources 含 `maps`（keys 由 3 個變 4 個，需調整既有斷言）。
- 執行 `node scripts/screenshot.js --all` 全量重建，確認 6→8 個來源皆成功。
- `npx vitest run` 全通過。