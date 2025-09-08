-- Migration to drop orphaned runbook tables
-- These tables were created by the deleted 0003_create_runbooks_and_permissions.sql migration
-- This cleanup is safe to run whether the tables exist or not

-- Drop dependent table first (due to foreign key constraints)
DROP TABLE IF EXISTS runbook_permissions;

-- Drop main runbooks table
DROP TABLE IF EXISTS runbooks;

-- Note: Indexes are automatically dropped when their associated tables are dropped
