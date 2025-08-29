-- Migration number: 0007 	 2025-08-29T17:47:31.807Z

-- Add user_id column to tags table
ALTER TABLE tags ADD COLUMN user_id TEXT NOT NULL DEFAULT '';

-- Update the unique constraint to be per-user (name + user_id)
-- First drop the existing unique constraint on name
DROP INDEX IF EXISTS idx_tags_name;

-- Add new unique constraint for name + user_id
CREATE UNIQUE INDEX idx_tags_name_user ON tags(name, user_id);

-- Add index for user_id for performance
CREATE INDEX idx_tags_user_id ON tags(user_id);

-- Add foreign key constraint to users table
-- Note: This assumes the users table exists. If it doesn't, you may need to create it first
-- or remove this constraint if the users table is managed elsewhere
-- ALTER TABLE tags ADD CONSTRAINT fk_tags_user_id FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
