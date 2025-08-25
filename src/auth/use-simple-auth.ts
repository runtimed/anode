import { useAuth as useOidcAuth } from "react-oidc-context";
import type { User } from "oidc-client-ts";

// Types compatible with existing app interfaces - simplified to match Anaconda profile
export type UserInfo = {
  sub: string;
  email: string;
  given_name?: string;
  family_name?: string;
  name?: string;
  picture?: string;
};

export type SimpleUser = {
  id: string;
  email: string;
  name?: string;
  givenName?: string;
  familyName?: string;
};

type AuthState =
  | { valid: true; user: UserInfo }
  | { valid: false; loading: boolean; error?: Error };

type SimpleAuthContextType = {
  authState: AuthState;
  user: UserInfo | null;
  accessToken: string | null;
  signOut: () => void;
  refreshAuthState: () => void;
};

/**
 * Transform OIDC user to our UserInfo format
 */
const transformOidcUser = (oidcUser: User | null): UserInfo | null => {
  if (!oidcUser?.profile) return null;

  // Construct name from given_name + family_name or use profile name
  let name: string | undefined;
  if (oidcUser.profile.given_name && oidcUser.profile.family_name) {
    name = `${oidcUser.profile.given_name} ${oidcUser.profile.family_name}`;
  } else if (oidcUser.profile.name) {
    name = oidcUser.profile.name;
  }

  return {
    sub: oidcUser.profile.sub,
    email: oidcUser.profile.email || "",
    given_name: oidcUser.profile.given_name,
    family_name: oidcUser.profile.family_name,
    name,
    picture: oidcUser.profile.picture,
  };
};

/**
 * Simplified auth hook that wraps react-oidc-context
 * Provides same interface as the original custom AuthProvider
 */
export function useSimpleAuth(): SimpleAuthContextType {
  const oidcAuth = useOidcAuth();

  // Transform OIDC user to our format
  const user = transformOidcUser(oidcAuth.user ?? null);

  // Create auth state compatible with existing app
  const authState: AuthState =
    oidcAuth.isAuthenticated && user
      ? { valid: true, user }
      : {
          valid: false,
          loading: oidcAuth.isLoading,
          error: oidcAuth.error ? new Error(oidcAuth.error.message) : undefined,
        };

  return {
    authState,
    user,
    accessToken: oidcAuth.user?.access_token || null,
    signOut: () => {
      oidcAuth.removeUser();
    },
    refreshAuthState: () => {
      // react-oidc-context handles state automatically,
      // but we can trigger a silent signin if needed
      if (!oidcAuth.isAuthenticated) {
        oidcAuth.signinSilent().catch(console.error);
      }
    },
  };
}

/**
 * Hook for components that require authenticated user
 * Throws if not authenticated - use inside AuthGuard only
 */
export function useAuthenticatedUser(): {
  user: UserInfo;
  accessToken: string;
} {
  const { user, accessToken } = useSimpleAuth();

  if (!user || !accessToken) {
    throw new Error("useAuthenticatedUser can only be used inside AuthGuard");
  }

  return { user, accessToken };
}

/**
 * Transform UserInfo to backend-compatible format
 */
export function toBackendUser(userInfo: UserInfo): SimpleUser {
  return {
    id: userInfo.sub,
    email: userInfo.email,
    name:
      userInfo.given_name && userInfo.family_name
        ? `${userInfo.given_name} ${userInfo.family_name}`
        : undefined,
    givenName: userInfo.given_name,
    familyName: userInfo.family_name,
  };
}
