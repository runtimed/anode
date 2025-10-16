import { queryDb } from "@livestore/livestore";
import { useQuery, useStore } from "@livestore/react";
import { tables } from "@runtimed/schema";
import React, { useCallback, useRef } from "react";
import type { SidebarPanelProps } from "./types";

import { FileItem, Tree } from "@/components/ui/file-tree";
import { SidebarMenu, SidebarProvider } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useFileUpload } from "@/hooks/useFileUpload";
import { toast } from "sonner";

const data2 = {
  tree: [
    [
      "app",
      [
        "api",
        ["hello", ["route.ts"]],
        "page.tsx",
        "layout.tsx",
        ["blog", ["page.tsx"]],
      ],
    ],
    [
      "components",
      ["ui", "button.tsx", "card.tsx"],
      "header.tsx",
      "footer.tsx",
    ],
    ["lib", ["util.ts"]],
    ["public", "favicon.ico", "vercel.svg"],
    ".eslintrc.json",
    ".gitignore",
    "next.config.js",
    "tailwind.config.js",
    "package.json",
    "README.md",
  ],
};

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
          {/* {data2.tree.map((item, index) => (
            <Tree key={index} item={item} />
          ))} */}
          {files.map((file) => (
            <FileItem key={file.id} name={file.fileName} />
          ))}
        </SidebarMenu>
      </SidebarProvider>

      {/* <Tree>
        <File value="page.tsx">page.tsx</File>
        {files.map((file) => (
          <File value={file.id} key={file.id}>
            {file.fileName}
          </File>
        ))}
      </Tree> */}
    </div>
  );
};
