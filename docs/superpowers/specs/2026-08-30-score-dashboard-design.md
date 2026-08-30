# 風自然訂房網分數查詢 — 設計文件

日期：2026-08-30

## 目標

建立一個網頁介面，一次顯示風自然訂房網一、二館在 Booking.com、Agoda、Trip.com 三個訂房網站上的**最新民宿評分畫面（截圖）**。使用者看到的即為各家網站的實際分數區塊截圖，點擊可跳轉到對應訂房網站。畫面需清楚區分一館／二館以及不同訂房網站。

## 範圍

- 兩個旅宿館：**風自然親子時尚旅宿（1館）**、**后麗安心親子時尚旅宿（2館）**
- 三個訂房網站：Booking.com、Agoda、Trip.com
- 每個「館 × 網站」組合 = 6 個來源，都要顯示最新分數

## 架構

後端截圖腳本（Playwright 無頭瀏覽器）+ Firebase Storage/Firestore 儲存 + 前端靜態介面。

```
截圖腳本 (Node.js + Playwright)  ──截取分數區塊──▶  Firebase Storage ──顯示──▶  前端靜態頁
   (本機排程/手動)                    + Firestore 記錄          (簡潔卡片式)
```

### 1. 後端截圖（Node.js + Playwright）

- 用無頭 Chromium 開啟三家訂房網站 × 二館共 6 個頁面。
- 每個頁面等待分數區塊元素出現後，對**分數區塊**做 element screenshot（而非整頁）。
- 各站分數區塊定位（依實際 DOM 調整）：
  - **Booking.com**：`.hp-review_snippet` / review score component（若有防護頁則等待或截圖現有內容）
  - **Agoda**：Reviews 分數區塊（`[data-element-name="overall-score"]` 或 Reviews 摘要）
  - **Trip.com**：`.components_review` / `outerReviewList` 分數區塊
- 產生的圖片存到 Firebase Storage，路徑：`fs-scores/{hotelId}/{source}-latest.png`。
- 每個來源另存一個「上一版」以防新版截圖失敗。
- 抓不到時：保留上一版圖片並在 Firestore 標記 `lastError`。

> **可行性實測結論**（2026-08-30）：
> - Trip.com 純 HTTP 可抓（分數 8.6 / 14），也無 frame 阻擋。
> - Agoda `X-Frame-Options: SAMEORIGIN` 無法 iframe，分數在初始 HTML 找不到（JS 動態），需無頭瀏覽器。
> - Booking 純 HTTP 回 202 防護頁，需無頭瀏覽器並可能顯示防護內容。
> 因此採「無頭瀏覽器截取分數區塊」統一處理三站最穩。

### 2. 儲存與部署（最終定案）

> **調整歷程**：原規劃存「Firebase Storage + Firestore」，但 `opencode-sk` 專案 billing 未啟用、無法建立 Storage bucket（403）。故改為**靜態檔案方案**：
>
> - 截圖存本機 `screenshots/{hotelId}/{source}.png`，`build-data.js` 產生 `data/metadata.json`（含時間與圖片路徑）。
> - 整包隨 Firebase Hosting 靜態部署上線。
> - 每來源固定檔名（`booking.png`/`agoda.png`/`trip.png`），重新截圖即**覆蓋**、只保留最新（需求：只留最新一張，不存歷史）。

```
screenshots/{hotelId}/{source}.png   ← 截圖（固定檔名覆蓋）
data/metadata.json                    ← 產生時間 + 圖片路徑
```

### 3. 前端介面（簡潔卡片式）

- 兩張上下排列的大卡片，分別代表 1 館、2 館，以不同色帶清楚區分。
- 每張卡內列三家訂房網站區塊，每個區塊顯示該網站的分數區塊**截圖**、網站名稱、更新時間。
- 點擊任一網站區塊 → 新分頁開啟該館該網站的訂房頁 URL。
- 無截圖時顯示「暫無截圖」與「前往網站」按鈕。

## 資料來源 URL

### 1 館 — 風自然親子時尚旅宿
- Booking: https://www.booking.com/hotel/tw/feng-zi-ran-qin-zi-shi-shang-lu-su.html
- Agoda: https://www.agoda.com/zh-tw/wind-natural-parent-child-inn/hotel/taichung-tw.html
- Trip: https://tw.trip.com/hotels/taichung-hotel-detail-25925783/wind-natural-parent-child-inn/

### 2 館 — 后麗安心親子時尚旅宿
- Booking: https://www.booking.com/hotel/tw/hou-li-an-xin-qin-zi-shi-shang-lu-su.html
- Agoda: https://www.agoda.com/zh-tw/wind-natural-parent-child-inn_2/hotel/taichung-tw.html
- Trip: https://www.trip.com/hotels/taichung-hotel-detail-124307430/wind-natural-parent-child-inn-ii/
