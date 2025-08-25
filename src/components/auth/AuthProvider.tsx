import React, { createContext, useContext, useEffect, useState } from "react";
import { getOpenIdService, UserInfo } from "../../services/openid";
export type { UserInfo } from "../../services/openid";

type AuthState =
  | { valid: true; user: UserInfo }
  | { valid: false; loading: boolean; error?: Error };

type AuthContextType = {
  authState: AuthState;
  get user(): UserInfo | null;
  get accessToken(): string | null;
  signOut: () => void;
  refreshAuthState: () => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

export function useAuthenticatedUser(): {
  user: UserInfo;
  accessToken: string;
} {
  const { user, accessToken } = useAuth();
  if (!user || !accessToken) {
    throw new Error("useAuthenticatedUser can only be used inside AuthGuard");
  }
  return { user, accessToken };
}

interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [authState, setAuthState] = useState<AuthState>({
    valid: false,
    loading: true,
  });

  useEffect(() => {
    // Check initial authentication state with error recovery
    const openIdService = getOpenIdService();

    try {
      const tokens = openIdService.getTokens();

      if (tokens && tokens.claims) {
        // Validate token structure before setting auth state
        if (tokens.claims.sub && tokens.claims.email) {
          setAuthState({
            valid: true,
            user: tokens.claims,
          });
        } else {
          console.warn("Invalid token claims detected, clearing auth state");
          openIdService.reset();
          setAuthState({ valid: false, loading: false });
        }
      } else {
        setAuthState({ valid: false, loading: false });
      }
    } catch (error) {
      console.error("Auth state recovery failed, resetting:", error);
      try {
        openIdService.reset();
      } catch (resetError) {
        console.error("Failed to reset auth after error:", resetError);
      }
      setAuthState({
        valid: false,
        loading: false,
        error:
          error instanceof Error ? error : new Error("Auth recovery failed"),
      });
    }

    // Listen only for reset events (login/logout), not token refresh
    const resetSubscription = openIdService.resetSubject$.subscribe(() => {
      setAuthState({ valid: false, loading: false });
    });

    return () => resetSubscription.unsubscribe();
  }, []);

  useEffect(() => {
    const openIdService = getOpenIdService();
    const subscription = openIdService.keepFresh().subscribe({
      error: (error) => {
        console.error("Error keeping access token fresh:", error);
      },
    });
    return () => subscription.unsubscribe();
  }, []);

  // Proactive token refresh - check every 30 seconds and refresh early
  useEffect(() => {
    const proactiveRefreshInterval = setInterval(() => {
      try {
        const openIdService = getOpenIdService();
        const tokens = openIdService.getTokens();

        if (tokens?.accessToken) {
          // Parse token to check expiration
          try {
            const jwtParts = tokens.accessToken.split(".");
            if (jwtParts.length === 3) {
              const payload = JSON.parse(atob(jwtParts[1]));
              const now = Math.floor(Date.now() / 1000);
              const timeUntilExpiry = payload.exp - now;

              // Refresh if token expires within 2 minutes
              if (timeUntilExpiry <= 120 && timeUntilExpiry > 0) {
                console.debug("Proactively refreshing token before expiry");
                openIdService.keepFresh().subscribe({
                  next: () =>
                    console.debug("Proactive token refresh successful"),
                  error: (error) =>
                    console.debug("Proactive token refresh failed:", error),
                });
              }
            }
          } catch (parseError) {
            console.debug(
              "Failed to parse token for proactive refresh:",
              parseError
            );
          }
        }
      } catch (error) {
        console.debug("Proactive token refresh check failed:", error);
      }
    }, 30000); // Check every 30 seconds

    return () => clearInterval(proactiveRefreshInterval);
  }, []);

  const getUser = (): UserInfo | null => {
    return authState.valid ? authState.user : null;
  };

  const getAccessToken = (): string | null => {
    // Get current token directly from storage, not from state
    try {
      const openIdService = getOpenIdService();
      const tokens = openIdService.getTokens();

      // Validate token exists and isn't obviously corrupted
      if (tokens?.accessToken && typeof tokens.accessToken === "string") {
        return tokens.accessToken;
      }

      return null;
    } catch (error) {
      console.warn("Failed to get access token:", error);
      return null;
    }
  };

  const refreshAuthState = () => {
    // Re-check authentication state after login with error handling
    try {
      const openIdService = getOpenIdService();
      const tokens = openIdService.getTokens();

      if (tokens && tokens.claims) {
        // Validate token structure
        if (tokens.claims.sub && tokens.claims.email) {
          setAuthState({
            valid: true,
            user: tokens.claims,
          });
        } else {
          console.warn("Invalid token claims during refresh, clearing");
          openIdService.reset();
          setAuthState({ valid: false, loading: false });
        }
      } else {
        setAuthState({ valid: false, loading: false });
      }
    } catch (error) {
      console.error("Auth state refresh failed:", error);
      setAuthState({
        valid: false,
        loading: false,
        error:
          error instanceof Error ? error : new Error("Auth refresh failed"),
      });
    }
  };

  const signOut = () => {
    try {
      const openIdService = getOpenIdService();
      openIdService.reset();
      // Ensure state is cleared even if reset fails
      setAuthState({ valid: false, loading: false });
    } catch (error) {
      console.error("Sign out failed:", error);
      // Force clear state even if service reset fails
      setAuthState({ valid: false, loading: false });

      // Try to clear localStorage directly as fallback
      try {
        localStorage.removeItem("openid_tokens");
        localStorage.removeItem("openid_request_state");
      } catch (storageError) {
        console.error("Failed to clear localStorage:", storageError);
      }
    }
  };

  const value: AuthContextType = {
    authState,
    signOut,
    refreshAuthState,
    get user() {
      return getUser();
    },
    get accessToken() {
      return getAccessToken();
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
