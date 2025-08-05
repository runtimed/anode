import React, { useState } from "react";
import { useStore, useQuery } from "@livestore/react";
import { events, CellData, tables } from "@/schema";
import { queryDb } from "@livestore/livestore";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider.js";

interface MobileOmnibarProps {
  onCellAdded?: () => void;
}

export const MobileOmnibar: React.FC<MobileOmnibarProps> = ({
  onCellAdded,
}) => {
  const { store } = useStore();
  const {
    user: { sub: userId },
  } = useAuth();
  const [input, setInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Get current cells to calculate position
  const cells = useQuery(queryDb(tables.cells.select())) as CellData[];

  const handleSubmit = async () => {
    if (!input.trim() || isSubmitting) return;

    setIsSubmitting(true);

    try {
      // Create AI cell at the bottom of the notebook
      const cellId = crypto.randomUUID();
      const queueId = crypto.randomUUID();

      // Calculate position at end
      const newPosition =
        Math.max(...cells.map((c: CellData) => c.position), -1) + 1;

      // Create the cell
      store.commit(
        events.cellCreated({
          id: cellId,
          position: newPosition,
          cellType: "ai",
          createdBy: userId,
          actorId: userId,
        })
      );

      // Set the source
      store.commit(
        events.cellSourceChanged({
          id: cellId,
          source: input.trim(),
          modifiedBy: userId,
        })
      );

      // Clear input and notify parent
      setInput("");
      onCellAdded?.();

      // Auto-execute the AI cell
      store.commit(
        events.executionRequested({
          queueId,
          cellId,
          executionCount: 1,
          requestedBy: userId,
        })
      );
    } catch (error) {
      console.error("Failed to create AI cell:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Submit on Ctrl+Enter or Cmd+Enter
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="fixed right-0 bottom-0 left-0 z-40 border-t border-gray-200 bg-white p-3 shadow-lg sm:hidden">
      <div className="flex items-end gap-2">
        <div className="relative flex-1">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="vibe it"
            className="max-h-[8rem] min-h-[3rem] resize-none border-gray-200 bg-gray-50 px-3 py-3 placeholder:text-gray-400 focus:border-gray-300 focus:ring-gray-300/20"
            disabled={isSubmitting}
          />
        </div>
        <Button
          onClick={handleSubmit}
          disabled={!input.trim() || isSubmitting}
          className="h-12 w-12 flex-shrink-0 bg-purple-600 p-0 text-white hover:bg-purple-700"
          size="sm"
        >
          {isSubmitting ? (
            <div className="h-4 w-4 animate-spin rounded-full border border-white border-t-transparent" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </div>
    </div>
  );
};
