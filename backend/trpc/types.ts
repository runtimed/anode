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

export const TAG_COLORS = [
  "red",
  "orange",
  "amber",
  "yellow",
  "lime",
  "green",
  "emerald",
  "teal",
  "cyan",
  "sky",
  "blue",
  "indigo",
  "violet",
  "purple",
  "fuchsia",
  "pink",
  "rose",
  "neutral",
] as const;

export type TagColor = (typeof TAG_COLORS)[number];

export interface TagRow {
  id: string;
  name: string;
  color: TagColor;
  created_at: string;
  updated_at: string;
}

export interface NotebookTagRow {
  notebook_id: string;
  tag_id: string;
  created_at: string;
}
