-- Migration number: 0003 	 2025-01-15T17:00:00.000Z

CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,

  given_name TEXT,
  family_name TEXT,
  first_seen_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_seen_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Index for email lookups
CREATE INDEX idx_users_email ON users(email);
