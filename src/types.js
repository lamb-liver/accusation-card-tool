/**
 * 專案核心資料結構的 JSDoc 類型定義。
 * 供編輯器自動補全與 checkJs 靜態檢查使用，不產生任何執行期程式碼。
 */

// ── 卡牌 ────────────────────────────────────────────────────────────────────

/**
 * @typedef {'白狐神社'|'鴉教團'|'瘋人院'|'門教團'|'逐光者'|'禁忌廚房'|'放逐者'} Faction
 * @typedef {'教主'|'儀式'|'信徒'|'魔法'|'地點'} CardType
 * @typedef {'橋'|'聖地'|'墓園'|'荒野'|'圖書館'|'庭院'} LocationType
 */

/**
 * @typedef {Object} Card
 * @property {string}        id           - 唯一識別碼（對應圖片檔名）
 * @property {string}        name         - 卡牌名稱
 * @property {Faction}       faction      - 所屬教團
 * @property {CardType}      type         - 卡牌種類
 * @property {string}        [effect]     - 效果描述文字
 * @property {string}        [source]     - 取得方式
 * @property {string[]}      [symbols]    - 符號標籤列表
 * @property {number}        [volume]     - 聲量數值（信徒）
 * @property {number}        [calamity]   - 災厄數值
 * @property {number}        [guard]      - 守護數值（地點）
 * @property {number}        [stardust]   - 星塵數值（魔法）
 * @property {LocationType}  [locationType] - 地點子類型（地點卡）
 */

// ── 牌組 ────────────────────────────────────────────────────────────────────

/**
 * @typedef {Object} Deck
 * @property {Card[]} leader   - 教主欄位（上限 1 張）
 * @property {Card[]} rituals  - 儀式欄位（上限 3 張）
 * @property {Card[]} main     - 主牌組（上限 20 張）
 */

// ── 規則 ────────────────────────────────────────────────────────────────────

/**
 * @typedef {'rule1'|'rule2'} RuleType
 *
 * @typedef {Object} DeckRule
 * @property {boolean}   isActive   - 是否已套用規則
 * @property {RuleType}  type       - rule1 = 單教團；rule2 = 雙教團
 * @property {string}    primary    - 主要教團名稱
 * @property {string}    secondary  - 次要教團名稱（rule2 限定）
 */

// ── 篩選 ────────────────────────────────────────────────────────────────────

/**
 * @typedef {Object} CardFilters
 * @property {string} faction   - 篩選教團（'' = 全部）
 * @property {string} type      - 篩選種類（'' = 全部）
 * @property {string} symbol    - 篩選符號（'' = 全部）
 * @property {string} mechanic  - 篩選效果關鍵字（'' = 全部）
 */

// ── Toast ────────────────────────────────────────────────────────────────────

/**
 * @typedef {'success'|'error'|'warning'|'info'} ToastType
 *
 * @typedef {Object} Toast
 * @property {number}    id      - 唯一流水號
 * @property {string}    message - 顯示文字
 * @property {ToastType} type    - 樣式類型
 */

// ── 已儲存牌組 ───────────────────────────────────────────────────────────────

/**
 * @typedef {Object} SavedDeck
 * @property {string}   name     - 牌組名稱
 * @property {Deck}     deck     - 牌組內容
 * @property {DeckRule} rule     - 構築規則
 * @property {number}   savedAt  - 儲存時間戳（Date.now()）
 */

export {};
