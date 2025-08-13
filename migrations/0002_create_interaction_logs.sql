-- Create interaction logs table
CREATE TABLE interaction_logs (
    id TEXT PRIMARY KEY,              -- ULID
    title TEXT NOT NULL,
    vanity_url TEXT NOT NULL,         -- URL-friendly version of title
    created_by TEXT NOT NULL,         -- User ID from auth
    created_at INTEGER NOT NULL,      -- Unix timestamp
    updated_at INTEGER NOT NULL
);

-- Indexes for performance
CREATE INDEX idx_interaction_logs_created_by ON interaction_logs(created_by);
CREATE INDEX idx_interaction_logs_created_at ON interaction_logs(created_at);
CREATE INDEX idx_interaction_logs_vanity_url ON interaction_logs(vanity_url);
