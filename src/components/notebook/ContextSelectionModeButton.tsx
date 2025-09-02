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
      size="xs"
      onClick={() =>
        store.setSignal(contextSelectionMode$, !contextSelectionMode)
      }
      className="flex items-center"
    >
      {contextSelectionMode ? (
        <X className="size-3" />
      ) : (
        <Filter className="size-3" />
      )}
      <span className="text-xs">
        {contextSelectionMode ? "Done" : "Context"}
      </span>
    </Button>
  );
}
