import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send } from "lucide-react";
import React, { useState } from "react";

interface MobileOmnibarProps {
  onSubmit: (prompt: string) => void;
  onCellAdded?: () => void;
}

export const MobileOmnibar: React.FC<MobileOmnibarProps> = ({
  onSubmit,
  onCellAdded,
}) => {
  const [input, setInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!input.trim() || isSubmitting) return;

    setIsSubmitting(true);

    try {
      // Clear input
      setInput("");
      // Create AI cell
      onSubmit(input);
      // Notify parent
      onCellAdded?.();
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
