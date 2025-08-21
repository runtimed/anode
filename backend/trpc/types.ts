export interface NotebookRow {
  id: string;
  owner_id: string;
  title: string | null;
  created_at: string;
  updated_at: string;
}

export type NotebookPermission = "OWNER" | "WRITER" | "NONE";
