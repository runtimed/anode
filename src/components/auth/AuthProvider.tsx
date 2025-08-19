import React, { createContext, useContext, useEffect, useState } from "react";
import { getOpenIdService, UserInfo } from "../../services/openid";
export type { UserInfo } from "../../services/openid";

type AuthState =
  | { valid: true; token: string; user: UserInfo }
  | { valid: false; loading: boolean; error?: Error };

type AuthContextType = {
  authState: AuthState;
  get user(): UserInfo | null;
  get accessToken(): string | null;
  signOut: () => void;
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
    // OpenID mode - use the service
    const openIdService = getOpenIdService();
    const subscription = openIdService.getUser().subscribe({
      next: (user) => {
        if (user) {
          setAuthState({
            valid: true,
            token: user.accessToken,
            user: user.claims,
          });
        } else {
          setAuthState({ valid: false, loading: false });
        }
      },
      error: (error) => {
        console.error("Error getting access token:", error);
        setAuthState({ valid: false, loading: false, error });
      },
    });

    return () => subscription.unsubscribe();
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
    return authState.valid ? authState.token : null;
  };

  const signOut = () => {
    const openIdService = getOpenIdService();
    openIdService.reset();
  };

  const value: AuthContextType = {
    authState,
    signOut,
    get user() {
      return getUser();
    },
    get accessToken() {
      return getAccessToken();
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
