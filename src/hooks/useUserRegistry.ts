import { useCallback, useMemo } from "react";
import { useQuery } from "@livestore/react";
import { queryDb } from "@runtimed/schema";
import { tables } from "@runtimed/schema";

import { generateInitials, generateColor } from "../util/avatar.js";
import {
  getClientTypeInfo,
  getClientDisplayName,
} from "../services/userTypes.js";

export type UserInfo = {
  id: string;
  name: string;
  email?: string;
  picture?: string;
  isAnonymous: boolean;
  lastSeen: number;
};

// Queries for user presence and profile information from LiveStore
const actorsQuery = queryDb(tables.actors);
const presenceQuery = queryDb(tables.presence);

export const useUserRegistry = () => {
  // Fetch all actor profiles and presence data from LiveStore
  const actors = useQuery(actorsQuery);
  const presence = useQuery(presenceQuery);

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

      // Use centralized client type service for fallback display
      const clientInfo = getClientTypeInfo(userId);
      const name = getClientDisplayName(userId);
      const isAnonymous = clientInfo.type !== "user";

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

  // Memoize presentUsers to prevent reference instability
  const presentUsers = useMemo(
    () => presence.map((p) => getUserInfo(p.userId)),
    [presence, getUserInfo]
  );

  return {
    getUserInfo,
    getDisplayName,
    getUserInitials,
    getUserColor,
    getUsersOnCell,
    // Provide the list of users currently present
    presentUsers,
    // Provide the full registry for other UI uses
    registry: userRegistry,
  };
};
