-- Migration number: 0004 	 2025-01-27T00:00:00.000Z

CREATE TABLE notebooks (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL,
  title TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE notebook_permissions (
  notebook_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  permission TEXT NOT NULL CHECK (permission = 'writer'),
  granted_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (notebook_id, user_id),
  FOREIGN KEY (notebook_id) REFERENCES notebooks(id) ON DELETE CASCADE
);

-- Performance indexes
CREATE INDEX idx_notebooks_owner ON notebooks(owner_id);
CREATE INDEX idx_permissions_user_notebook ON notebook_permissions(user_id, notebook_id);
