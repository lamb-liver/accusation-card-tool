-- Keyset 分頁的覆蓋索引。
--
-- 新排序為 `<time> DESC, id DESC`（id 作為 tiebreaker 以取得全序），
-- 舊索引的次要欄位是 created_at，無法讓 keyset 的
-- `(time < ? OR (time = ? AND id < ?))` 走索引掃描，會退化成全表排序。
--
-- 舊索引一併移除：新索引的前綴與其相同（status, <time> DESC），
-- 原本吃舊索引的查詢改吃新索引即可，留著只是多一份寫入成本。

DROP INDEX IF EXISTS idx_deck_shares_public_list;
DROP INDEX IF EXISTS idx_guestbook_public_list;
DROP INDEX IF EXISTS idx_deck_shares_admin_list;
DROP INDEX IF EXISTS idx_guestbook_admin_list;

CREATE INDEX idx_deck_shares_public_keyset
  ON deck_shares (status, reviewed_at DESC, id DESC);

CREATE INDEX idx_guestbook_public_keyset
  ON guestbook_messages (status, reviewed_at DESC, id DESC);

CREATE INDEX idx_deck_shares_admin_keyset
  ON deck_shares (status, created_at DESC, id DESC);

CREATE INDEX idx_guestbook_admin_keyset
  ON guestbook_messages (status, created_at DESC, id DESC);

-- admin 的 status='all' 不帶 status 條件，需要不含 status 前綴的索引
CREATE INDEX idx_deck_shares_admin_keyset_all
  ON deck_shares (created_at DESC, id DESC);

CREATE INDEX idx_guestbook_admin_keyset_all
  ON guestbook_messages (created_at DESC, id DESC);
