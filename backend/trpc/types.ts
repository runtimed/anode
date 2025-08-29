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
}

export type NotebookPermission = "OWNER" | "WRITER" | "NONE";

export interface NotebookPermissionRow {
  nodebook_id: string;
  user_id: string;
  permission: NotebookPermission;
  granted_at: string;
}
