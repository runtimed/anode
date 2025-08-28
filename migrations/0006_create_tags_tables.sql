-- Migration number: 0006 	 2025-08-28T22:51:05.213Z

-- Tags table
CREATE TABLE tags (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  color TEXT NOT NULL DEFAULT 'neutral',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
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
CREATE INDEX idx_tags_name ON tags(name);
CREATE INDEX idx_notebook_tags_notebook ON notebook_tags(notebook_id);
CREATE INDEX idx_notebook_tags_tag ON notebook_tags(tag_id);
