CREATE TABLE rate_limit_hits (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  bucket_key TEXT NOT NULL,
  hit_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_rate_limit_hits_bucket
  ON rate_limit_hits (bucket_key, hit_at);
