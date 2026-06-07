DROP TABLE IF EXISTS rate_limit_hits;
DROP INDEX IF EXISTS idx_rate_limit_hits_bucket;

CREATE TABLE rate_limit_buckets (
  bucket_key TEXT PRIMARY KEY,
  hit_count INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_rate_limit_buckets_created
  ON rate_limit_buckets (created_at);
