-- Create notebooks table
CREATE TABLE IF NOT EXISTS notebooks (
    id TEXT PRIMARY KEY,              -- UUID
    title TEXT NOT NULL,
    slug TEXT NOT NULL,               -- URL-safe slug for vanity URLs
    created_by TEXT NOT NULL,         -- User ID who created the notebook
    created_at INTEGER NOT NULL       -- Unix timestamp
);

-- Index for listing notebooks by user
CREATE INDEX IF NOT EXISTS idx_notebooks_created_by ON notebooks(created_by);

-- Index for sorting by creation date
CREATE INDEX IF NOT EXISTS idx_notebooks_created_at ON notebooks(created_at);

-- Index for slug lookups (future use)
CREATE INDEX IF NOT EXISTS idx_notebooks_slug ON notebooks(slug);
