import React, { createContext, useContext, useEffect, useState } from "react";
import { getOpenIdService, UserInfo } from "../../services/openid";
export type { UserInfo } from "../../services/openid";

type AuthState =
  | { valid: true; token: string; user: UserInfo }
  | { valid: false; loading: boolean; error?: Error };

type AuthContextType = {
  authState: AuthState;
  get user(): UserInfo;
  get accessToken(): string;
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

  const getUser = (): UserInfo => {
    if (!authState.valid) {
      throw new Error("User is not authenticated");
    }
    return authState.user;
  };

  const getAccessToken = (): string => {
    if (!authState.valid) {
      throw new Error("User is not authenticated");
    }
    return authState.token;
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
