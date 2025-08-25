import { Bug, BugOff } from "lucide-react";
import { Button } from "../ui/button";
import { useDebug } from "./debug-mode.js";

export const DebugModeToggle = () => {
  const debug = useDebug();

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => debug.setEnabled(!debug.enabled)}
      className={`h-6 w-6 p-0 transition-opacity ${
        debug.enabled ? "opacity-100" : "opacity-30 hover:opacity-60"
      }`}
      title={debug.enabled ? "Hide debug info" : "Show debug info"}
    >
      {debug.enabled ? (
        <Bug className="h-3 w-3" />
      ) : (
        <BugOff className="h-3 w-3" />
      )}
    </Button>
  );
};
