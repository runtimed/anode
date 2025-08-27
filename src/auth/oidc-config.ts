import type { AuthProviderProps } from "react-oidc-context";
import { WebStorageStateStore } from "oidc-client-ts";

/**
 * OIDC Configuration for react-oidc-context
 * Supports both local development and Anaconda production auth
 */
export const createOidcConfig = (): AuthProviderProps => {
  const authUri = import.meta.env.VITE_AUTH_URI;
  const clientId = import.meta.env.VITE_AUTH_CLIENT_ID;
  const redirectUri = import.meta.env.VITE_AUTH_REDIRECT_URI;

  if (!authUri || !clientId || !redirectUri) {
    throw new Error(
      "Missing required auth environment variables: VITE_AUTH_URI, VITE_AUTH_CLIENT_ID, VITE_AUTH_REDIRECT_URI"
    );
  }

  return {
    authority: authUri,
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: "openid profile email offline_access",

    // Automatic token refresh with iframe
    automaticSilentRenew: true,
    silent_redirect_uri: `${window.location.origin}/oidc-silent-refresh.html`,

    // Persist auth state across browser sessions
    userStore: new WebStorageStateStore({ store: window.localStorage }),

    // Manual callback processing: onSigninCallback is handled by /oidc route
    // This provides better control over the authentication flow

    // Additional OIDC settings
    response_type: "code",
    loadUserInfo: false,

    // Silent refresh configuration
    accessTokenExpiringNotificationTimeInSeconds: 60, // Notify 1 minute before expiry
    silentRequestTimeoutInSeconds: 10, // Timeout for silent refresh requests
    includeIdTokenInSilentRenew: true,

    // Timeouts and retries
    revokeTokensOnSignout: true,
  };
};

/**
 * Check if current environment has auth configured
 */
export const isAuthConfigured = (): boolean => {
  return !!(
    import.meta.env.VITE_AUTH_URI &&
    import.meta.env.VITE_AUTH_CLIENT_ID &&
    import.meta.env.VITE_AUTH_REDIRECT_URI
  );
};
