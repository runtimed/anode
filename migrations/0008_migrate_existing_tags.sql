-- Migration number: 0008 	 2025-08-29T17:47:41.836Z

-- Remove existing tags that don't have a user_id
-- This is necessary because we can't determine which user should own existing tags
-- In a production system, you might want to assign them to a specific user or handle this differently
DELETE FROM tags WHERE user_id = '';

-- Also remove any notebook_tags entries that reference deleted tags
DELETE FROM notebook_tags 
WHERE tag_id NOT IN (SELECT id FROM tags);
