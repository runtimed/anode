import { useCallback, useMemo } from "react";
import { useQuery } from "@livestore/react";
import { queryDb } from "@livestore/livestore";
import { tables } from "@runt/schema";

import { generateInitials } from "../util/avatar.js";

export interface UserInfo {
  id: string;
  name: string;
  email?: string;
  picture?: string;
  isAnonymous: boolean;
  lastSeen: number;
}

// Queries for user presence and profile information from LiveStore
const actorsQuery = queryDb(tables.actors);
const presenceQuery = queryDb(tables.presence);

export const useUserRegistry = () => {
  // Fetch all actor profiles and presence data from LiveStore
  const actors = useQuery(actorsQuery);
  const presence = useQuery(presenceQuery);

  // Actor profile emission is now handled in useCurrentUser hook

  // Create a reactive map of user info from actors and presence data
  const userRegistry = useMemo(() => {
    const registry = new Map<string, UserInfo>();

    // Populate registry with profile information from the actors table
    actors.forEach((actor) => {
      registry.set(actor.id, {
        id: actor.id,
        name: actor.displayName,
        picture: actor.avatar || undefined,
        isAnonymous: actor.type !== "human",
        lastSeen: 0, // We'll update this with presence data
      });
    });

    // TODO: Add lastSeen timestamp to presence table schema for better user activity tracking
    // For now, user existence in presence table indicates they are currently active

    return registry;
  }, [actors]);

  // Get user info by ID with fallback display logic
  const getUserInfo = useCallback(
    (userId: string): UserInfo => {
      const userInfo = userRegistry.get(userId);
      if (userInfo) {
        return userInfo;
      }

      // Generate fallback display info for unknown users
      let name: string;
      let isAnonymous = true;

      if (/^\d{15,}$/.test(userId)) {
        // Google OAuth user ID (long number)
        name = `User ${userId.slice(-4)}`;
        isAnonymous = false;
      } else if (
        userId.startsWith("session-") ||
        userId.startsWith("client-")
      ) {
        // Session/client ID
        name = `Guest ${userId.slice(-4)}`;
      } else if (userId === "runtime-agent") {
        name = "Runtime Agent";
        isAnonymous = false;
      } else if (userId === "local-dev-user") {
        name = "Local Dev";
      } else {
        // Other unknown IDs
        name = userId.length > 8 ? `${userId.slice(0, 8)}...` : userId;
      }

      const fallbackInfo: UserInfo = {
        id: userId,
        name,
        isAnonymous,
        lastSeen: Date.now(),
      };
      return fallbackInfo;
    },
    [userRegistry]
  );

  // Get display name for a user ID
  const getDisplayName = useCallback(
    (userId: string): string => {
      return getUserInfo(userId).name;
    },
    [getUserInfo]
  );

  // Get user initials for avatar
  const getUserInitials = useCallback(
    (userId: string): string => {
      const userInfo = getUserInfo(userId);
      if (userInfo.isAnonymous) {
        return generateInitials(userId);
      }
      return generateInitials(userInfo.name);
    },
    [getUserInfo]
  );

  // Get consistent color for user (memoized)
  const getUserColor = useCallback((userId: string): string => {
    return generateColor(userId);
  }, []);

  // Get users present on a specific cell (excluding current user)
  const getUsersOnCell = useCallback(
    (cellId: string) => {
      return presence
        .filter((p) => p.cellId === cellId)
        .map((p) => getUserInfo(p.userId));
    },
    [presence, getUserInfo]
  );

  return {
    getUserInfo,
    getDisplayName,
    getUserInitials,
    getUserColor,
    getUsersOnCell,
    // Provide the list of users currently present
    presentUsers: presence.map((p) => getUserInfo(p.userId)),
    // Provide the full registry for other UI uses
    registry: userRegistry,
  };
};
