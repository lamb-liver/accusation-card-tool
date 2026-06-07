CREATE TABLE deck_shares (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  share_id TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  author_name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  deck_json TEXT NOT NULL,
  rule_json TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'hidden', 'deleted')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  reviewed_at TEXT
);

CREATE TABLE guestbook_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  author_name TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'hidden', 'deleted')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  reviewed_at TEXT
);

CREATE INDEX idx_deck_shares_public_list
  ON deck_shares (status, reviewed_at DESC, created_at DESC);

CREATE INDEX idx_guestbook_public_list
  ON guestbook_messages (status, reviewed_at DESC, created_at DESC);

CREATE INDEX idx_deck_shares_admin_list
  ON deck_shares (status, created_at DESC);

CREATE INDEX idx_guestbook_admin_list
  ON guestbook_messages (status, created_at DESC);
