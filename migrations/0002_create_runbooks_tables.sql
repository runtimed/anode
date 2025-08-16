-- Migration number: 0002 	 2025-01-15T00:00:00.000Z

CREATE TABLE runbooks (
  ulid TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL,
  title TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE runbook_permissions (
  runbook_ulid TEXT NOT NULL,
  user_id TEXT NOT NULL,
  permission TEXT NOT NULL CHECK (permission = 'writer'),
  granted_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (runbook_ulid, user_id),
  FOREIGN KEY (runbook_ulid) REFERENCES runbooks(ulid) ON DELETE CASCADE
);

-- Performance indexes
CREATE INDEX idx_runbooks_owner ON runbooks(owner_id);
CREATE INDEX idx_permissions_user_runbook ON runbook_permissions(user_id, runbook_ulid);
