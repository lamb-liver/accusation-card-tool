# 控訴 — 卡牌查詢與組牌（accusation-v2）

> English: [README.en.md](./README.en.md)

《控訴》LCG（Living Card Game）的卡牌瀏覽、篩選與牌組構築輔助工具（純前端）。執行時從 `public/cards/` 分片載入卡資料；卡圖位於 `public/images/`。

## 技術棧

- **React 19** + **Vite 8**
- **Tailwind CSS 4**
- **react-window**（長列表虛擬化）
- **PWA**（`vite-plugin-pwa` / Workbox）
- **html2canvas**（匯出牌組圖片）
- **lucide-react**、**SortableJS**

## 開發指令

| 指令 | 說明 |
|------|------|
| `npm install` | 安裝依賴 |
| `npm run dev` | 本機開發伺服器 |
| `npm run build` | 正式建置（輸出至 `dist/`） |
| `npm run build:ci` | 建置並檢查 PWA service worker |
| `npm run preview` | 預覽建置結果 |
| `npm run lint` | ESLint |
| `npm run split:cards` | 由 `public/cards.json` 產生 `public/cards/` 分片與 `index.json` |
| `npm run optimize:images` | 批次產生 WebP / AVIF 響應式圖（`scripts/optimize-images.mjs`） |

> 編輯卡資料後請執行 `npm run split:cards`，再建置或部署，讓執行時分片與索引同步。

## 專案結構（精簡）

```
public/
  cards.json              # 卡資料單一來源（編輯用）
  cards/
    index.json            # 分片索引（version、shards）
    {cro,fox,dor,asy,exi}.json
  images/{id}.webp        # 主圖；異畫為 {id}alt.webp

src/
  App.jsx                 # 模式切換、篩選／分頁／組牌編排
  hooks/
    useCardData.js        # 分片 fetch + IndexedDB 快取
    useCardFilters.js     # 搜尋／篩選（Transition、Deferred、Worker）
    usePagination.js      # 查牌分頁
    deck/                 # 牌組儲存、規則、匯入匯出
  workers/
    cardFilter.worker.js  # 大量卡牌時的背景 filter
  utils/
    cardFilterLogic.js    # 篩選邏輯（主執行緒與 Worker 共用）
    cardCache.js          # IndexedDB 讀寫
    cardAlternateArt.js   # 異畫路徑、localStorage、同步事件
    imageHints.js         # preload / idle prefetch
  components/
    Card.jsx, CardGallery.jsx, CardModal.jsx
    common/OptimizedImage.jsx
    DeckBuilder.jsx, FilterToolbar.jsx, …
```

## 卡牌資料流程

1. **編輯**：維護 `public/cards.json`（id、名稱、教團、類型、效果、符號、`source` 等）。
2. **分片**：`npm run split:cards` 依卡號前綴寫入 `public/cards/*.json` 與 `index.json`。
3. **執行時載入**（`useCardData`）：
   - 讀取 `/cards/index.json`，並行 fetch 各分片；
   - 若 IndexedDB 有相同 `version` 的快取，先顯示快取再背景更新；
   - PWA Workbox 另以 `StaleWhileRevalidate` 快取 `/cards/` 路徑（離線／二次造訪）。

## 效能與 UI 行為

| 機制 | 位置 | 說明 |
|------|------|------|
| `startTransition` | `useCardFilters` | 搜尋／篩選更新標記為低優先，輸入框不卡頓 |
| `useDeferredValue` | `useCardFilters` → `App` | 列表用 deferred 結果渲染，捲動較順 |
| Web Worker | `cardFilter.worker.js` | 卡牌數 ≥ 80 時 filter 在背景執行緒；未就緒前以主執行緒兜底 |
| 虛擬化 | `CardGallery`（react-window） | 單頁超過 24 張或組牌池強制虛擬化 |
| `content-visibility` | `index.css` `.card-list-cell` | 視窗外略過 layout/paint（固定列高約 320px） |
| IndexedDB | `cardCache.js` | 避免每次造訪重複 parse 全部分片 JSON |
| 圖片 | `OptimizedImage` | AVIF/WebP `<picture>`、Intersection Observer 延遲載入、卸載時清空 `src` 釋放 decode 後 bitmap |
| PWA 圖片快取 | `vite.config.js` | WebP/AVIF `CacheFirst`；符號等小圖 PNG 另設快取 |

查牌模式預設每頁 24 張；選「顯示全部」且結果 > 24 時啟用虛擬化。篩選條件變更時分頁會回到第 1 頁。

## 卡牌資料與圖檔

- 每張卡需有 **`public/images/{id}.webp`**（`id` 與 `cards.json` 一致）。
- 執行 `npm run optimize:images` 可產生 **160 / 320 / 640** 寬度 WebP/AVIF 與 `srcset`（與 `CARD_GALLERY_SIZES` 對齊，避免 browser 選到過大圖）。
- 圖示使用 WebP（`optimize:images` 另產 32px AVIF）；頁面背景使用 `images/icons/背景.webp`。
- **取得方式**欄位使用 `source`（字串）；無則小卡／詳情可不顯示該列。

## 異畫（alternate art）

具異畫的卡需在 `cards.json` 該物件上設定：

- `hasAlternateArt`: `true`
- `alternateSource`: 異畫版本專用的「取得方式」說明（字串，必填才會啟用異畫 UI）

圖檔慣例：

- 主圖：`public/images/{id}.webp`
- 異畫：`public/images/{id}alt.webp`（例如 `cro01` → `cro01alt.webp`）

使用者在小卡或詳情 modal 以 **`<` `>`** 切換主圖／異畫；偏好儲存在瀏覽器 **localStorage**（鍵名：`accusation-card-art-variant`），同一張卡在不同畫面會同步。

小卡右下與 modal 內的「取得方式」會隨主圖／異畫切換顯示 `source` 或 `alternateSource`。

## 匯出牌組圖片

- 匯出 PNG 為牌組內卡圖的網格，**僅卡圖**（無標題列、無每張卡名 overlay）。
- 有異畫且已標記的卡會依 **localStorage 與畫面相同的版本**（主圖或異畫）輸出；其餘卡固定主圖。

## 授權與資產

卡圖、規則文字等著作權屬原出版／設計方；本 repo 若含卡圖僅供個人／開發用途，請勿用於未經授權之商業散佈。

## 授權（程式碼）

若未另附 `LICENSE`，預設與專案根目錄授權檔一致；無檔案時請視為未宣告開源授權。
