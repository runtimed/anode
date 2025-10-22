import { queryDb } from "@livestore/livestore";
import { useQuery, useStore } from "@livestore/react";
import { events, tables } from "@runtimed/schema";
import React, { useCallback, useRef } from "react";
import type { SidebarPanelProps } from "./types";

import { Button, buttonVariants } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { SidebarMenu, SidebarProvider } from "@/components/ui/sidebar";
import { useFileUpload } from "@/hooks/useFileUpload";
import { cn } from "@/lib/utils";
import { File, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";

export const FilesPanel: React.FC<SidebarPanelProps> = () => {
  const files = useQuery(queryDb(tables.files.select()));
  const { store } = useStore();

  const { uploadFile, isUploading } = useFileUpload({
    notebookId: store.storeId,
    onFileUploaded: ({ fileName }) => {
      toast.success(`File uploaded: ${fileName}`);
    },
  });

  const handleDelete = useCallback(
    (fileName: string) => {
      store.commit(events.fileDeleted({ fileName }));
    },
    [store]
  );

  if (!files || files.length === 0)
    return (
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <File className="size-6" />
          </EmptyMedia>
          <EmptyTitle>No files uploaded</EmptyTitle>
          <EmptyDescription>
            Upload files to share them available to your notebook and AI agents.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <UploadButton uploadFile={uploadFile} isUploading={isUploading} />
        </EmptyContent>
      </Empty>
    );

  return (
    <div className="-m-2 space-y-6">
      <SidebarProvider>
        <SidebarMenu>
          {files.map((file) => (
            <FileItem
              key={file.fileName + "-" + file.artifactId}
              name={file.fileName}
              onDelete={() => handleDelete(file.fileName)}
            />
          ))}
          <UploadButton uploadFile={uploadFile} isUploading={isUploading} />
        </SidebarMenu>
      </SidebarProvider>
    </div>
  );
};

function UploadButton({
  uploadFile,
  isUploading,
}: {
  uploadFile: (file: File) => void;
  isUploading: boolean;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (file) {
        uploadFile(file);
      }
      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    },
    [uploadFile]
  );

  return (
    <div
      className={cn(
        buttonVariants({ size: "sm", variant: "outline" }),
        "relative"
      )}
    >
      <Upload />
      {isUploading ? "Uploading..." : "Upload File"}
      <input
        ref={fileInputRef}
        disabled={isUploading}
        type="file"
        className="absolute inset-0 appearance-none opacity-0"
        onChange={handleFileSelect}
      />
    </div>
  );
}

function FileItem({ name, onDelete }: { name: string; onDelete?: () => void }) {
  const handleClick = (event: React.MouseEvent<HTMLDivElement>) => {
    event.currentTarget.focus();
  };

  return (
    <div
      tabIndex={0}
      onClick={handleClick}
      className={cn(
        buttonVariants({ size: "sm", variant: "ghost" }),
        "group/tree-item focus:bg-gray-100"
      )}
    >
      <File />
      {name}
      <div className="grow"></div>
      <Button
        onClick={onDelete}
        size="xs"
        variant="destructiveGhost"
        className="hidden group-focus-within/tree-item:block group-hover/tree-item:block"
      >
        <Trash2 />
      </Button>
    </div>
  );
}
