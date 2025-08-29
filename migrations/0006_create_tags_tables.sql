-- Migration number: 0006 	 2025-08-28T22:51:05.213Z

-- Tags table
CREATE TABLE tags (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  user_id TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#000000',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  -- Make tag names unique per user
  UNIQUE(name, user_id)
);

-- Notebook-tag relationships table
CREATE TABLE notebook_tags (
  notebook_id TEXT NOT NULL,
  tag_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (notebook_id, tag_id),
  FOREIGN KEY (notebook_id) REFERENCES notebooks(id) ON DELETE CASCADE,
  FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
);

-- Performance indexes
CREATE INDEX idx_tags_name_user ON tags(name, user_id);
CREATE INDEX idx_tags_user_id ON tags(user_id);
CREATE INDEX idx_notebook_tags_notebook ON notebook_tags(notebook_id);
CREATE INDEX idx_notebook_tags_tag ON notebook_tags(tag_id);
