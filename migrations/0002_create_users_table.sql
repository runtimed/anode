-- Migration number: 0002 	 2025-08-16T15:41:28.000Z

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
