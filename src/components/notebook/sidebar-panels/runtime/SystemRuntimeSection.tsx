import { Button } from "@/components/ui/button";
import { getRuntimeCommand } from "@/util/runtime-command";
import { useCallback } from "react";

export const SystemRuntimeSection = ({
  notebookId,
}: {
  notebookId: string;
}) => {
  return (
    <>
      <div>
        <h4 className="mb-2 text-xs font-medium text-gray-700">
          Launch Python Runtime (system)
        </h4>
        <p className="mb-2 text-xs text-gray-500">
          Set RUNT_API_KEY in your environment, then run:
        </p>
      </div>

      <RuntimeCodeBlock notebookId={notebookId} />

      <p className="text-xs text-gray-500">
        Each notebook needs its own runtime instance.
      </p>
    </>
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
