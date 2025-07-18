import { useCallback, useEffect, useMemo } from "react";
import { useStore, useQuery } from "@livestore/react";
import { queryDb } from "@livestore/livestore";
import { events, tables } from "@runt/schema";

import { useCurrentUser } from "./useCurrentUser.js";
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
  const { store } = useStore();
  const currentUser = useCurrentUser();

  // Fetch all actor profiles and presence data from LiveStore
  const actors = useQuery(actorsQuery);
  const presence = useQuery(presenceQuery);

  // Commit the current user's profile to the actors table when they are authenticated
  useEffect(() => {
    if (currentUser && currentUser.id && !currentUser.isAnonymous) {
      store.commit(
        events.actorProfileSet({
          id: currentUser.id,
          type: "human",
          displayName: currentUser.name || "Anonymous",
          avatar: currentUser.picture,
        })
      );
    }
  }, [currentUser, store]);

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

    // Update lastSeen and cellId from the presence table
    presence.forEach((p) => {
      const existing = registry.get(p.userId);
      if (existing) {
        // Here you could update a timestamp if your schema had one
        // For now, their existence in the presence table means they are "here"
      }
    });

    return registry;
  }, [actors, presence]);

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

  return {
    getUserInfo,
    getDisplayName,
    getUserInitials,
    // Provide the list of users currently present
    presentUsers: presence.map((p) => getUserInfo(p.userId)),
    // Provide the full registry for other UI uses
    registry: userRegistry,
  };
};
