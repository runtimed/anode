-- Create log permissions table
CREATE TABLE log_permissions (
    id TEXT PRIMARY KEY,              -- ULID
    log_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    permission TEXT NOT NULL CHECK (permission IN ('owner', 'writer')),
    granted_by TEXT NOT NULL,
    granted_at INTEGER NOT NULL,

    FOREIGN KEY (log_id) REFERENCES interaction_logs(id) ON DELETE CASCADE,
    UNIQUE(log_id, user_id)
);

-- Indexes for performance
CREATE INDEX idx_log_permissions_user_id ON log_permissions(user_id);
CREATE INDEX idx_log_permissions_log_id ON log_permissions(log_id);
CREATE INDEX idx_log_permissions_granted_at ON log_permissions(granted_at);
