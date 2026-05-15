# 控訴 — 卡牌查詢與組牌（accusation-v2）

> English: [README.en.md](./README.en.md)

《控訴》LCG（Living Card Game）的卡牌瀏覽、篩選與牌組構築輔助工具（純前端）。資料來自 `public/cards.json` 與 `public/images/` 下的卡圖。

## 技術棧

- **React 19** + **Vite 8**
- **Tailwind CSS 4**
- **PWA**（`vite-plugin-pwa`）
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

## 專案結構（精簡）

- `public/cards.json` — 全卡資料（id、名稱、教團、類型、效果、符號、`source` 等）
- `public/images/{id}.webp` — 主圖
- `src/components/` — UI（如 `Card.jsx`、`CardGallery.jsx`、`CardModal.jsx`、組牌相關）
- `src/hooks/` — 資料、牌組、篩選、modal 等邏輯
- `src/hooks/deck/importExport.js` — 文字／JSON／**圖片**匯出
- `src/utils/cardAlternateArt.js` — 異畫路徑、localStorage 偏好、與列表同步用事件

## 卡牌資料與圖檔

- 每張卡需有對應 **`public/images/{id}.webp`**（`id` 與 `cards.json` 一致）。
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
