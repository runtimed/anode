import { queryDb } from "@livestore/livestore";
import { useQuery, useStore } from "@livestore/react";
import { tables } from "@runtimed/schema";
import React, { useCallback, useRef } from "react";
import type { SidebarPanelProps } from "./types";

import { Input } from "@/components/ui/input";
import { SidebarMenu, SidebarProvider } from "@/components/ui/sidebar";
import { useFileUpload } from "@/hooks/useFileUpload";
import { toast } from "sonner";
import { Button, buttonVariants } from "@/components/ui/button";
import { File, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

export const FilesPanel: React.FC<SidebarPanelProps> = () => {
  const files = useQuery(queryDb(tables.files.select()));
  const { store } = useStore();

  const { uploadFile, isUploading } = useFileUpload({
    notebookId: store.storeId,
    onFileUploaded: ({ fileName }) => {
      toast.success(`File uploaded: ${fileName}`);
    },
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      console.log("file", file);
      if (file && file.type === "text/csv") {
        console.log("uploading file", file);
        uploadFile(file);
      } else if (file) {
        // Show error for non-CSV files
        alert("Please select a CSV file");
      }
      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    },
    [uploadFile]
  );

  if (!files || files.length === 0)
    return (
      <div>
        No files found{" "}
        <Input disabled={isUploading} type="file" onChange={handleFileSelect} />
      </div>
    );

  return (
    <div className="-m-2 space-y-6">
      <SidebarProvider>
        <SidebarMenu>
          {files.map((file) => (
            <FileItem key={file.id} name={file.fileName} />
          ))}
        </SidebarMenu>
      </SidebarProvider>
    </div>
  );
};

function FileItem({ name }: { name: string }) {
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
        size="xs"
        variant="destructiveGhost"
        className="hidden group-focus-within/tree-item:block group-hover/tree-item:block"
      >
        <Trash2 />
      </Button>
    </div>
  );
}
