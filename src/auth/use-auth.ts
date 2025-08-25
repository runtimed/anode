/**
 * Simplified auth hook using react-oidc-context directly
 * Eliminates complex transformations and state duplication
 */

import { useAuth as useOidcAuth } from "react-oidc-context";
import {
  getAuthUser,
  toBackendUser,
  isAuthenticated,
  type AuthUser,
  type BackendUser,
} from "./types";

export interface UseAuthReturn {
  // User data
  user: AuthUser | null;
  accessToken: string | null;

  // State
  isAuthenticated: boolean;
  isLoading: boolean;
  error: Error | null;

  // Actions
  signIn: () => void;
  signOut: () => void;

  // Utility
  toBackendUser: () => BackendUser | null;
}

/**
 * Main auth hook - use this throughout the app
 */
export function useAuth(): UseAuthReturn {
  const oidc = useOidcAuth();

  const user = oidc.user ? getAuthUser(oidc.user) : null;
  const accessToken = oidc.user?.access_token || null;

  return {
    user,
    accessToken,
    isAuthenticated: isAuthenticated(user, accessToken),
    isLoading: oidc.isLoading,
    error: oidc.error ? new Error(oidc.error.message) : null,

    signIn: () => oidc.signinRedirect(),
    signOut: () => oidc.removeUser(),

    toBackendUser: () => (user ? toBackendUser(user) : null),
  };
}

/**
 * Hook for components that require authentication
 * Throws if not authenticated - use inside auth guard only
 */
export function useAuthenticatedUser(): {
  user: AuthUser;
  accessToken: string;
  toBackendUser: () => BackendUser;
} {
  const auth = useAuth();

  if (!auth.isAuthenticated || !auth.user || !auth.accessToken) {
    throw new Error("useAuthenticatedUser requires authentication");
  }

  return {
    user: auth.user,
    accessToken: auth.accessToken,
    toBackendUser: () => toBackendUser(auth.user!),
  };
}
