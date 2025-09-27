export interface NotebookRow {
  id: string;
  owner_id: string;
  title: string | null;
  created_at: string;
  updated_at: string;
  collaborators?: Array<{
    id: string;
    givenName: string;
    familyName: string;
  }>;
  tags?: TagRow[];
}

export type NotebookPermission = "OWNER" | "WRITER" | "NONE";

export interface NotebookPermissionRow {
  nodebook_id: string;
  user_id: string;
  permission: NotebookPermission;
  granted_at: string;
}

// Only hex colors are supported for now
export type TagColor = `#${string}`;

export interface TagRow {
  id: string;
  name: string;
  color: TagColor;
  user_id: string;
  created_at: string;
  updated_at: string;
}

export interface NotebookTagRow {
  notebook_id: string;
  tag_id: string;
  created_at: string;
}

export interface SystemPromptRow {
  id: string;
  user_id: string;
  system_prompt: string;
  ai_model: string | null;
  created_at: string;
  updated_at: string;
}
