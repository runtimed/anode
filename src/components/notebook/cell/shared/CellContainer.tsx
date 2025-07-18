import React, { ReactNode } from "react";
import { tables } from "@runt/schema";
import { useUserRegistry } from "@/hooks/useUserRegistry.js";
import { useCurrentUserId } from "@/hooks/useCurrentUser.js";

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
  const { getUsersOnCell, getUserColor } = useUserRegistry();
  const currentUserId = useCurrentUserId();

  // Get users present on this cell (excluding current user)
  const usersOnCell = getUsersOnCell(cell.id).filter(
    (user) => user.id !== currentUserId
  );
  return (
    <div
      className={`cell-container group relative mb-2 pt-2 transition-all duration-200 sm:mb-3 ${
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

      {/* Presence indicators - colored dots for users on this cell */}
      {usersOnCell.length > 0 && (
        <div className="absolute top-1 right-2 flex -space-x-1">
          {usersOnCell.slice(0, 3).map((user) => (
            <div
              key={user.id}
              className="h-2 w-2 rounded-full border border-white"
              style={{
                backgroundColor: getUserColor(user.id),
              }}
              title={user.name}
            />
          ))}
          {usersOnCell.length > 3 && (
            <div
              className="h-2 w-2 rounded-full border border-white bg-gray-500"
              title={`+${usersOnCell.length - 3} more`}
            />
          )}
        </div>
      )}

      {children}
    </div>
  );
};
