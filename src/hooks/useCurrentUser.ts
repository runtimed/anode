import { useMemo } from "react";
import { useStore } from "@livestore/react";
import { useGoogleAuth } from "../auth/useGoogleAuth.js";
import { googleAuthManager } from "../auth/google-auth.js";

export interface CurrentUser {
  id: string;
  name: string;
  email?: string;
  picture?: string;
  isAnonymous: boolean;
}

export const useCurrentUser = (): CurrentUser => {
  const { user, isAuthenticated } = useGoogleAuth();
  const { store } = useStore();

  return useMemo((): CurrentUser => {
    // If Google Auth is enabled and we have an authenticated user
    if (googleAuthManager.isEnabled() && isAuthenticated && user) {
      return {
        id: user.id,
        name: user.name,
        email: user.email,
        picture: user.picture,
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
