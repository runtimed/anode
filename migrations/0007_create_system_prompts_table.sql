-- Migration number: 0007 	 2025-01-27T00:00:00.000Z

-- System prompts table
CREATE TABLE system_prompts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  system_prompt TEXT NOT NULL,
  ai_model TEXT DEFAULT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Performance indexes
CREATE INDEX idx_system_prompts_user_id ON system_prompts(user_id);
CREATE INDEX idx_system_prompts_ai_model ON system_prompts(ai_model);
