import React, { ReactNode } from "react";
import { tables } from "@runt/schema";
import "./PresenceIndicators.css";

interface CellContainerProps {
  cell: typeof tables.cells.Type;
  autoFocus?: boolean;
  contextSelectionMode?: boolean;
  onFocus?: () => void;
  children: ReactNode;
  focusColor?: string;
  focusBgColor?: string;
}

export const CellContainer: React.FC<CellContainerProps> = ({
  cell,
  autoFocus = false,
  contextSelectionMode = false,
  onFocus,
  children,
  focusColor = "bg-primary/60",
  focusBgColor = "bg-primary/5",
}) => {
  return (
    <div
      className={`cell-container group relative pt-2 transition-all duration-200 ${
        autoFocus && !contextSelectionMode ? focusBgColor : "hover:bg-muted/10"
      } ${contextSelectionMode && !cell.aiContextVisible ? "opacity-60" : ""} ${
        contextSelectionMode
          ? cell.aiContextVisible
            ? "bg-purple-50/30 ring-2 ring-purple-300"
            : "bg-gray-50/30 ring-2 ring-gray-300"
          : ""
      }`}
      onClick={contextSelectionMode ? onFocus : undefined}
      style={{
        position: "relative",
      }}
    >
      {/* Custom left border with controlled height */}
      <div
        className={`cell-border absolute top-0 left-3 w-0.5 transition-all duration-200 sm:left-0 ${
          autoFocus && !contextSelectionMode ? focusColor : "bg-border/30"
        }`}
        style={{
          height: "100%", // Will be controlled by content
        }}
      />

      {children}
    </div>
  );
};
