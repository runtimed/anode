import { File, Folder, Trash2 } from "lucide-react";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
} from "@/components/ui/sidebar";
import { useState } from "react";
import { Button } from "./button";
import { cn } from "@/lib/utils";

export function FileItem({
  name,
  isActive,
}: {
  name: string;
  isActive?: boolean;
}) {
  return (
    <SidebarMenuButton
      className={cn(
        "group/tree-item data-[active=true]:bg-transparent",
        isActive && "data-[active=true]:bg-transparent"
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
    </SidebarMenuButton>
  );
}

export function FolderItem({
  name,
  children,
}: {
  name: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Collapsible
      className="group/collapsible"
      open={open}
      onOpenChange={setOpen}
      defaultOpen={name === "components" || name === "ui"}
    >
      <CollapsibleTrigger asChild>
        <SidebarMenuButton>
          {/* <ChevronRight className="transition-transform" /> */}
          <Folder />
          {name}
        </SidebarMenuButton>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <SidebarMenuSub>{children}</SidebarMenuSub>
      </CollapsibleContent>
    </Collapsible>
  );
}

export function Tree({ item }: { item: string | any[] }) {
  const [name, ...items] = Array.isArray(item) ? item : [item];

  if (!items.length) {
    return <FileItem name={name} />;
  }

  return (
    <SidebarMenuItem>
      <Collapsible
        className="group/collapsible"
        defaultOpen={name === "components" || name === "ui"}
      >
        <CollapsibleTrigger asChild>
          <SidebarMenuButton>
            {/* <ChevronRight className="transition-transform" /> */}
            <Folder />
            {name}
          </SidebarMenuButton>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <SidebarMenuSub>
            {items.map((subItem, index) => (
              <Tree key={index} item={subItem} />
            ))}
          </SidebarMenuSub>
        </CollapsibleContent>
      </Collapsible>
    </SidebarMenuItem>
  );
}
