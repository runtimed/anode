import { useQuery, useStore } from "@livestore/react";
import { Filter, X } from "lucide-react";
import { Button } from "../ui/button";
import { contextSelectionMode$ } from "./signals/ai-context.js";

export function ContextSelectionModeButton() {
  const { store } = useStore();
  const contextSelectionMode = useQuery(contextSelectionMode$);

  return (
    <Button
      variant={contextSelectionMode ? "default" : "outline"}
      size="sm"
      onClick={() =>
        store.setSignal(contextSelectionMode$, !contextSelectionMode)
      }
      className="flex items-center gap-1 sm:gap-2"
    >
      {contextSelectionMode ? (
        <X className="h-3 w-3 sm:h-4 sm:w-4" />
      ) : (
        <Filter className="h-3 w-3 sm:h-4 sm:w-4" />
      )}
      <span className="text-xs sm:text-sm">
        {contextSelectionMode ? "Done" : "Context"}
      </span>
    </Button>
  );
}
