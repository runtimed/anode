/**
 * Simplified auth types that work directly with OIDC user profiles
 * Eliminates unnecessary transformations and double state management
 */

import type { User } from "oidc-client-ts";

/**
 * User profile from OIDC token - matches standard OIDC claims
 * Use this directly instead of custom UserInfo transformations
 */
export interface AuthUser {
  sub: string;
  email: string;
  given_name?: string;
  family_name?: string;
}

/**
 * Backend user format - minimal transformation from OIDC profile
 */
export interface BackendUser {
  id: string;
  email: string;
  name?: string;
}

/**
 * Extract auth user from OIDC user profile
 */
export function getAuthUser(oidcUser: User): AuthUser | null {
  if (!oidcUser?.profile?.sub || !oidcUser.profile.email) {
    return null;
  }

  return {
    sub: oidcUser.profile.sub,
    email: oidcUser.profile.email,
    given_name: oidcUser.profile.given_name,
    family_name: oidcUser.profile.family_name,
  };
}

/**
 * Convert auth user to backend format
 */
export function toBackendUser(user: AuthUser): BackendUser {
  return {
    id: user.sub,
    email: user.email,
    name:
      user.given_name && user.family_name
        ? `${user.given_name} ${user.family_name}`
        : user.given_name || user.family_name,
  };
}

/**
 * Type guard for authenticated state
 */
export function isAuthenticated(
  user: AuthUser | null,
  accessToken: string | null
): user is AuthUser {
  return !!(user && accessToken);
}
