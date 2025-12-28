-- MyGrowth Radar D1 Schema
-- Run: wrangler d1 execute mygrowth --file=./schema.sql

-- Sources (RSS, Web, Upload)
CREATE TABLE IF NOT EXISTS sources (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('rss', 'web', 'upload')),
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  schedule TEXT DEFAULT '0 */6 * * *',
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused')),
  last_fetched_at INTEGER,
  etag TEXT,
  created_at INTEGER NOT NULL
);

-- Jobs Queue
CREATE TABLE IF NOT EXISTS jobs (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('fetch', 'analyze', 'report')),
  source_id TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  cursor TEXT,
  retry_count INTEGER DEFAULT 0,
  next_run_at INTEGER NOT NULL,
  started_at INTEGER,
  completed_at INTEGER,
  error_message TEXT,
  FOREIGN KEY (source_id) REFERENCES sources(id) ON DELETE CASCADE
);

-- Content Items
CREATE TABLE IF NOT EXISTS items (
  id TEXT PRIMARY KEY,
  source_id TEXT,
  url TEXT NOT NULL UNIQUE,
  title TEXT,
  published_at INTEGER,
  content_hash TEXT NOT NULL,
  r2_raw_key TEXT,
  r2_content_key TEXT,
  vectorize_id TEXT,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (source_id) REFERENCES sources(id) ON DELETE SET NULL
);

-- AI Insights (Three-Pillar Analysis)
CREATE TABLE IF NOT EXISTS insights (
  id TEXT PRIMARY KEY,
  item_id TEXT NOT NULL,
  pillar TEXT NOT NULL CHECK (pillar IN ('career_business', 'market_startup', 'self_growth')),
  relevance_score INTEGER DEFAULT 0,
  summary TEXT NOT NULL,
  action_items TEXT DEFAULT '[]',  -- JSON array
  maturity_rating TEXT CHECK (maturity_rating IN ('ADOPT', 'TRIAL', 'ASSESS', 'HOLD')),
  tags TEXT DEFAULT '[]',  -- JSON array
  model_version TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE
);

-- Reports
CREATE TABLE IF NOT EXISTS reports (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('daily', 'weekly')),
  period_start INTEGER NOT NULL,
  period_end INTEGER NOT NULL,
  r2_report_key TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

-- Report-Insight Links
CREATE TABLE IF NOT EXISTS report_insights (
  report_id TEXT NOT NULL,
  insight_id TEXT NOT NULL,
  rank INTEGER,
  PRIMARY KEY (report_id, insight_id),
  FOREIGN KEY (report_id) REFERENCES reports(id) ON DELETE CASCADE,
  FOREIGN KEY (insight_id) REFERENCES insights(id) ON DELETE CASCADE
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_jobs_pending ON jobs(status, next_run_at);
CREATE INDEX IF NOT EXISTS idx_items_source ON items(source_id, created_at);
CREATE INDEX IF NOT EXISTS idx_items_url ON items(url);
CREATE INDEX IF NOT EXISTS idx_insights_pillar ON insights(pillar, created_at);
CREATE INDEX IF NOT EXISTS idx_insights_item ON insights(item_id);
