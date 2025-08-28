-- Migration number: 0006 	 2025-08-28T21:06:37.003Z

-- Add deleted_at column to notebooks table for soft delete functionality
ALTER TABLE notebooks ADD COLUMN deleted_at TEXT DEFAULT NULL;

-- Create index for efficient filtering of non-deleted notebooks
CREATE INDEX idx_notebooks_deleted_at ON notebooks(deleted_at);

-- Create composite index for efficient queries that filter by owner and deleted status
CREATE INDEX idx_notebooks_owner_deleted ON notebooks(owner_id, deleted_at);
