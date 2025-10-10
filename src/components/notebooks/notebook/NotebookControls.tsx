import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Store } from "@livestore/livestore";
import { useStore } from "@livestore/react";
import { FileDown, MoreHorizontal } from "lucide-react";
import { tables } from "@runtimed/schema";

export function NotebookControls() {
  const { store } = useStore();

  return (
    <div className="flex items-center gap-1">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="relative">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => exportAsIpynb(store)}>
            {/* Icon for export as .ipynb */}
            <FileDown />
            Export as .ipynb
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

function exportAsIpynb(store: Store) {
  const notebook = store.query(tables.cells.select());
  console.log(notebook);
}
