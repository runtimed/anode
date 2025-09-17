import { TagColor } from "backend/trpc/types";

type NotebookPermission = "OWNER" | "WRITER" | "NONE";

type NotebookUser = {
  id: string;
  givenName: string | null;
  familyName: string | null;
};

export type Collaborator = {
  id: string;
  givenName: string | null;
  familyName: string | null;
};

export type Tag = {
  id: string;
  name: string;
  color: TagColor;
  created_at: string;
  updated_at: string;
};

export type NotebookProcessed = {
  id: string;
  owner_id: string;
  title: string | null;
  created_at: string;
  updated_at: string;
  myPermission: NotebookPermission;
  owner: NotebookUser;
  collaborators: readonly Collaborator[];
  tags?: readonly Tag[];
};
