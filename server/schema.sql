-- TourNet accounts + trips — Cloudflare D1 schema.
-- Apply with: wrangler d1 execute tournet --file schema.sql [--local | --remote]

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  settings TEXT NOT NULL DEFAULT '{}',
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS sessions_user_id ON sessions(user_id);

CREATE TABLE IF NOT EXISTS trips (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  destination TEXT NOT NULL,
  start_date TEXT,
  end_date TEXT,
  budget TEXT,
  interests TEXT NOT NULL,      -- JSON array of Interest
  duration_days INTEGER NOT NULL,
  days TEXT NOT NULL,           -- JSON: ItineraryDay[]
  source TEXT NOT NULL,         -- 'mock' | 'ai'
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS trips_user_id ON trips(user_id);
