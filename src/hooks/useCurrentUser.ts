import { useMemo } from "react";
import { useStore } from "@livestore/react";
import { useAuth } from "../auth/AuthProvider";

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

  return useMemo((): CurrentUser => {
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
};

// Helper hook to get just the user ID for event attribution
export const useCurrentUserId = (): string => {
  const currentUser = useCurrentUser();
  return currentUser.id;
};
