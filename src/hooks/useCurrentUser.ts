import { useMemo, useEffect } from "react";
import { useStore, useQuery } from "@livestore/react";
import { useAuth } from "../auth/AuthProvider";
import { events, tables } from "@runt/schema";
import { queryDb } from "@livestore/livestore";

export interface CurrentUser {
  id: string;
  name: string;
  email?: string;
  picture?: string;
  isAnonymous: boolean;
}

export const useCurrentUser = (): CurrentUser => {
  const { user, isAuthenticated } = useAuth();
  const { store } = useStore();

  const currentUser = useMemo((): CurrentUser => {
    // If authenticated and user exists
    if (isAuthenticated && user) {
      return {
        id: user.id,
        name: user.name || "User",
        email: user.email,
        picture: (user as any).picture, // picture is optional, may not exist
        isAnonymous: false,
      };
    }

    // Fallback to anonymous user with session ID
    const sessionId = store.sessionId;
    return {
      id: sessionId,
      name: `Anonymous User`,
      email: undefined,
      picture: undefined,
      isAnonymous: true,
    };
  }, [user, isAuthenticated, store.sessionId]);

  // Query for specific actor to check if user profile already exists
  const existingActor = useQuery(
    currentUser && !currentUser.isAnonymous
      ? queryDb(tables.actors.select().where({ id: currentUser.id }))
      : queryDb(tables.actors.select().where({ id: "never-match" }))
  );

  // Emit actor profile set event when user is authenticated and not already in actors table
  useEffect(() => {
    if (currentUser && !currentUser.isAnonymous && existingActor.length === 0) {
      store.commit(
        events.actorProfileSet({
          id: currentUser.id,
          type: "human",
          displayName: currentUser.name,
          avatar: currentUser.picture,
        })
      );
    }
  }, [currentUser, existingActor, store]);

  // Emit presence event when user is authenticated
  useEffect(() => {
    if (currentUser && !currentUser.isAnonymous) {
      store.commit(
        events.presenceSet({
          userId: currentUser.id,
          cellId: undefined,
        })
      );
    }
  }, [currentUser, store]);

  return currentUser;
};

// Helper hook to get just the user ID for event attribution
export const useCurrentUserId = (): string => {
  const currentUser = useCurrentUser();
  return currentUser.id;
};
