export interface NotebookRow {
  id: string;
  owner_id: string;
  title: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  collaborators?: Array<{
    id: string;
    givenName: string;
    familyName: string;
  }>;
}

export type NotebookPermission = "OWNER" | "WRITER" | "NONE";
