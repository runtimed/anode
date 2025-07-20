import { useQuery } from "@livestore/react";
import { queryDb } from "@livestore/livestore";
import { tables } from "@runt/schema";
import { useCallback } from "react";

import { useCurrentUserId } from "./useCurrentUser.js";
import { useUserRegistry } from "./useUserRegistry.js";

export const useCellPresence = (cellId: string) => {
  const currentUserId = useCurrentUserId();
  const { getUserInfo } = useUserRegistry();

  // Query users present on this specific cell, excluding current user
  const presenceOnCell = useQuery(
    queryDb(
      tables.presence.select().where({
        cellId: cellId,
        userId: { op: "!=", value: currentUserId },
      })
    )
  );

  // Convert presence data to user info
  const usersOnCell = presenceOnCell.map((p) => getUserInfo(p.userId));

  return {
    usersOnCell,
    hasPresence: usersOnCell.length > 0,
    userCount: usersOnCell.length,
  };
};

// Hook for getting users on any cell (for components that need to check multiple cells)
export const useMultiCellPresence = () => {
  const currentUserId = useCurrentUserId();
  const { getUserInfo } = useUserRegistry();

  // Query all presence data excluding current user
  const allPresence = useQuery(
    queryDb(
      tables.presence.select().where({
        userId: { op: "!=", value: currentUserId },
      })
    )
  );

  // Helper function to get users on a specific cell
  const getUsersOnCell = useCallback(
    (cellId: string) => {
      return allPresence
        .filter((p) => p.cellId === cellId)
        .map((p) => getUserInfo(p.userId));
    },
    [allPresence, getUserInfo]
  );

  return { getUsersOnCell };
};
