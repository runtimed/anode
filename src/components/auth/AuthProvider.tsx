import React, { createContext, useContext, useEffect, useState } from "react";
import { getOpenIdService, UserInfo } from "../../services/openid";
export type { UserInfo } from "../../services/openid";

type AuthState =
  | { valid: true; token: string; user: UserInfo }
  | { valid: false; loading: boolean; error?: Error };

interface AuthContextType {
  authState: AuthState;
  getUser: () => UserInfo;
  getAccessToken: () => string;
  signOut: () => void;
}

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
    // Check if we're in local mode (no auth client ID)
    const isLocalMode = !import.meta.env.VITE_AUTH_CLIENT_ID;

    if (isLocalMode) {
      // Local development mode - use VITE variable for token
      const localToken = import.meta.env.VITE_AUTH_TOKEN;
      if (!localToken) {
        console.error("VITE_AUTH_TOKEN is required for local development mode");
        setAuthState({
          valid: false,
          loading: false,
          error: new Error("Missing VITE_AUTH_TOKEN"),
        });
        return;
      }

      const dummyUser: UserInfo = {
        sub: "local-dev-user",
        email: "local@example.com",
        email_verified: true,
        name: "Local Development User",
        picture: undefined,
      };
      setAuthState({
        valid: true,
        token: localToken,
        user: dummyUser,
      });
      return;
    }

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
    getUser,
    getAccessToken,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
