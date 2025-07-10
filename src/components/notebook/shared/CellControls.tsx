import React from "react";
import { Button } from "@/components/ui/button";
import {
  Plus,
  ChevronUp,
  ChevronDown,
  Eye,
  EyeOff,
  ArrowUp,
  ArrowDown,
  X,
} from "lucide-react";
import { tables } from "@runt/schema";

interface CellControlsProps {
  cell: typeof tables.cells.Type;
  contextSelectionMode?: boolean;
  onAddCell: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDeleteCell: () => void;
  toggleSourceVisibility: () => void;
  toggleAiContextVisibility?: () => void;
  playButton?: React.ReactNode;
}

export const CellControls: React.FC<CellControlsProps> = ({
  cell,
  contextSelectionMode = false,
  onAddCell,
  onMoveUp,
  onMoveDown,
  onDeleteCell,
  toggleSourceVisibility,
  toggleAiContextVisibility,
  playButton,
}) => {
  return (
    <div className="cell-controls flex items-center gap-0.5 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100">
      {/* Mobile Play Button */}
      {playButton}

      {/* Add Cell Button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={onAddCell}
        className="hover:bg-muted/80 h-8 w-8 p-0 sm:h-7 sm:w-7"
        title="Add cell below"
      >
        <Plus className="h-4 w-4 sm:h-3 sm:w-3" />
      </Button>

      {/* Source Visibility Toggle */}
      <Button
        variant="ghost"
        size="sm"
        onClick={toggleSourceVisibility}
        className={`hover:bg-muted/80 h-8 w-8 p-0 sm:h-7 sm:w-7 ${
          cell.sourceVisible ? "" : "text-muted-foreground/60"
        }`}
        title={cell.sourceVisible ? "Hide source" : "Show source"}
      >
        {cell.sourceVisible ? (
          <ChevronUp className="h-4 w-4 sm:h-3 sm:w-3" />
        ) : (
          <ChevronDown className="h-4 w-4 sm:h-3 sm:w-3" />
        )}
      </Button>

      {/* Context Selection Mode Button */}
      {contextSelectionMode && toggleAiContextVisibility && (
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleAiContextVisibility}
          className={`hover:bg-muted/80 h-8 w-8 p-0 sm:h-7 sm:w-7 ${
            cell.aiContextVisible ? "text-purple-600" : "text-gray-500"
          }`}
          title={
            cell.aiContextVisible
              ? "Hide from AI context"
              : "Show in AI context"
          }
        >
          {cell.aiContextVisible ? (
            <Eye className="h-4 w-4 sm:h-3 sm:w-3" />
          ) : (
            <EyeOff className="h-4 w-4 sm:h-3 sm:w-3" />
          )}
        </Button>
      )}

      {/* Desktop-only controls */}
      <div className="desktop-controls hidden items-center gap-0.5 sm:flex">
        {/* Separator */}
        <div className="bg-border/50 mx-1 h-4 w-px" />
        <Button
          variant="ghost"
          size="sm"
          onClick={onMoveUp}
          className="hover:bg-muted/80 h-7 w-7 p-0"
          title="Move cell up"
        >
          <ArrowUp className="h-3 w-3" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onMoveDown}
          className="hover:bg-muted/80 h-7 w-7 p-0"
          title="Move cell down"
        >
          <ArrowDown className="h-3 w-3" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onDeleteCell}
          className="hover:bg-muted/80 h-7 w-7 p-0 text-red-500 hover:text-red-600"
          title="Delete cell"
        >
          <X className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
};
