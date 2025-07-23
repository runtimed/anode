import { useCallback, useEffect, useState } from "react";
import {
  AuthState,
  getCurrentAuthToken,
  googleAuthManager,
} from "./google-auth.js";

export const useGoogleAuth = (): AuthState & {
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  refreshToken: () => Promise<void>;
} => {
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    user: null,
    token: null,
    isLoading: true,
    error: null,
  });

  // Initialize auth state
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        setAuthState((prev) => ({ ...prev, isLoading: true, error: null }));

        if (googleAuthManager.isEnabled()) {
          await googleAuthManager.initialize();
          const user = await googleAuthManager.getCurrentUser();
          const token = googleAuthManager.getToken();

          setAuthState({
            isAuthenticated: !!user,
            user,
            token,
            isLoading: false,
            error: null,
          });
        } else {
          // TEMPORARY force on while ripping out google auth
          // Local development mode - use fallback token
          // const fallbackToken = getCurrentAuthToken();
          // setAuthState({
          //   isAuthenticated: true,
          //   user: {
          //     id: "local-dev-user",
          //     email: "local@example.com",
          //     name: "Local User",
          //   },
          //   token: fallbackToken,
          //   isLoading: false,
          //   error: null,
          // });
        }
      } catch (error) {
        console.error("Auth initialization failed:", error);
        setAuthState((prev) => ({
          ...prev,
          isLoading: false,
          error:
            error instanceof Error
              ? error.message
              : "Auth initialization failed",
        }));
      }
    };

    initializeAuth();

    // Listen for auth state changes
    // Listen for auth state changes via events instead of polling
    const unsubscribe = googleAuthManager.addTokenChangeListener(
      async (token) => {
        try {
          if (token) {
            // Token updated - refresh auth state
            const user = await googleAuthManager.getCurrentUser();
            if (user) {
              setAuthState({
                isAuthenticated: true,
                user,
                token,
                isLoading: false,
                error: null,
              });
            }
          } else {
            // Token cleared - user signed out
            setAuthState({
              isAuthenticated: false,
              user: null,
              token: null,
              isLoading: false,
              error: null,
            });
          }
        } catch (error) {
          console.error("Error handling auth change:", error);
          setAuthState((prev) => ({
            ...prev,
            error:
              error instanceof Error
                ? error.message
                : "Auth state update failed",
          }));
        }
      }
    );

    return unsubscribe;
  }, []);

  const signIn = useCallback(async () => {
    if (!googleAuthManager.isEnabled()) {
      throw new Error("Google Auth is not enabled");
    }

    try {
      setAuthState((prev) => ({ ...prev, isLoading: true, error: null }));

      const user = await googleAuthManager.signIn();
      const token = googleAuthManager.getToken();

      setAuthState({
        isAuthenticated: true,
        user,
        token,
        isLoading: false,
        error: null,
      });
    } catch (error) {
      console.error("Sign in failed:", error);
      setAuthState((prev) => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : "Sign in failed",
      }));
      throw error;
    }
  }, []);

  const signOut = useCallback(async () => {
    try {
      setAuthState((prev) => ({ ...prev, isLoading: true, error: null }));

      if (googleAuthManager.isEnabled()) {
        await googleAuthManager.signOut();
      }

      setAuthState({
        isAuthenticated: false,
        user: null,
        token: null,
        isLoading: false,
        error: null,
      });
    } catch (error) {
      console.error("Sign out failed:", error);
      setAuthState((prev) => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : "Sign out failed",
      }));
      throw error;
    }
  }, []);

  const refreshToken = useCallback(async () => {
    if (!googleAuthManager.isEnabled()) {
      return;
    }

    try {
      const newToken = await googleAuthManager.refreshToken();
      if (newToken) {
        setAuthState((prev) => ({ ...prev, token: newToken }));
      }
    } catch (error) {
      console.error("Token refresh failed:", error);
      // Don't throw here - token refresh failures shouldn't crash the app
      setAuthState((prev) => ({
        ...prev,
        error: error instanceof Error ? error.message : "Token refresh failed",
      }));
    }
  }, []);

  return {
    ...authState,
    signIn,
    signOut,
    refreshToken,
  };
};
