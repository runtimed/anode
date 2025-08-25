/**
 * Auth module exports
 */

export { useAuth, useAuthenticatedUser } from "./use-auth";
export { AuthGuard } from "./AuthGuard";
export { createOidcConfig, isAuthConfigured } from "./oidc-config";
export type { AuthUser, BackendUser } from "./types";
export { getAuthUser, toBackendUser, isAuthenticated } from "./types";
