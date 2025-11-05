import { Button } from "@/components/ui/button";
import { SidebarGroupLabel } from "./components";
import { getRuntimeCommand } from "@/util/runtime-command";
import { Copy } from "lucide-react";
import { useCallback } from "react";

export const SystemRuntimeSection = ({
  notebookId,
}: {
  notebookId: string;
}) => {
  return (
    <div className="space-y-1">
      <SidebarGroupLabel>Launch Python Runtime (system)</SidebarGroupLabel>
      <p className="text-xs text-gray-500">
        Set RUNT_API_KEY in your environment, then run:
      </p>

      <RuntimeCodeBlock notebookId={notebookId} />

      <p className="text-xs text-gray-500">
        Each notebook needs its own runtime instance.
      </p>
    </div>
  );
};

export const RuntimeCodeBlock = ({ notebookId }: { notebookId: string }) => {
  const runtimeCommand = getRuntimeCommand(notebookId);

  const copyRuntimeCommand = useCallback(() => {
    navigator.clipboard.writeText(runtimeCommand);
  }, [runtimeCommand]);

  return (
    <div className="rounded bg-slate-900 p-2">
      <div className="flex items-start gap-2">
        <code className="flex-1 overflow-x-auto font-mono text-xs break-all whitespace-pre-wrap text-slate-100">
          {runtimeCommand}
        </code>
        <Button
          variant="ghost"
          size="sm"
          onClick={copyRuntimeCommand}
          className="h-6 w-6 shrink-0 p-0 text-slate-300 hover:bg-slate-700 hover:text-slate-100"
          title="Copy command"
        >
          <Copy className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
};
