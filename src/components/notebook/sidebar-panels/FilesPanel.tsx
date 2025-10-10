import { queryDb } from "@livestore/livestore";
import { useQuery } from "@livestore/react";
import { tables } from "@runtimed/schema";
import React from "react";
import type { SidebarPanelProps } from "./types";

import { Tree } from "@/components/ui/file-tree";
import { SidebarMenu, SidebarProvider } from "@/components/ui/sidebar";

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
  console.log(files);

  return (
    <div className="space-y-6">
      <SidebarProvider>
        <SidebarMenu>
          {data2.tree.map((item, index) => (
            <Tree key={index} item={item} />
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
