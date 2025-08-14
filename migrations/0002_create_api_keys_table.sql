-- Create API keys table for japikey integration
-- This table stores API key metadata and is managed by the japikey library

CREATE TABLE IF NOT EXISTS api_keys (
    id TEXT PRIMARY KEY,
    metadata TEXT NOT NULL,
    expiresAt TEXT NOT NULL,
    createdAt TEXT NOT NULL DEFAULT (datetime('now')),
    updatedAt TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Index for querying keys by user ID (stored in metadata JSON)
CREATE INDEX IF NOT EXISTS idx_api_keys_user_id
ON api_keys (JSON_EXTRACT(metadata, '$.userId'));

-- Index for querying by expiration
CREATE INDEX IF NOT EXISTS idx_api_keys_expires_at
ON api_keys (expiresAt);

-- Index for querying by creation time
CREATE INDEX IF NOT EXISTS idx_api_keys_created_at
ON api_keys (createdAt);
