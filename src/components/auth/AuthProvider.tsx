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
    // Check initial authentication state - only once, no reactive updates
    const openIdService = getOpenIdService();
    const tokens = openIdService.getTokens();

    if (tokens && tokens.claims) {
      setAuthState({
        valid: true,
        user: tokens.claims,
      });
    } else {
      setAuthState({ valid: false, loading: false });
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

  const getUser = (): UserInfo | null => {
    return authState.valid ? authState.user : null;
  };

  const getAccessToken = (): string | null => {
    // Get current token directly from storage, not from state
    const openIdService = getOpenIdService();
    const tokens = openIdService.getTokens();
    return tokens?.accessToken || null;
  };

  const refreshAuthState = () => {
    // Re-check authentication state after login
    const openIdService = getOpenIdService();
    const tokens = openIdService.getTokens();

    if (tokens && tokens.claims) {
      setAuthState({
        valid: true,
        user: tokens.claims,
      });
    } else {
      setAuthState({ valid: false, loading: false });
    }
  };

  const signOut = () => {
    const openIdService = getOpenIdService();
    openIdService.reset();
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
