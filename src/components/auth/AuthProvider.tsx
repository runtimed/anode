import React, { createContext, useContext, useEffect, useState } from "react";
import { getOpenIdService, UserInfo } from "../../services/openid";
export type { UserInfo } from "../../services/openid";

type AccessTokenState =
  | { valid: true; token: string; user: UserInfo }
  | { valid: false; loading: boolean; error?: Error };

interface AuthContextType {
  accessToken: AccessTokenState;
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
  const [accessTokenState, setAccessTokenState] = useState<AccessTokenState>({
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
        setAccessTokenState({
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
      setAccessTokenState({
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
          setAccessTokenState({
            valid: true,
            token: user.accessToken,
            user: user.claims,
          });
        } else {
          setAccessTokenState({ valid: false, loading: false });
        }
      },
      error: (error) => {
        console.error("Error getting access token:", error);
        setAccessTokenState({ valid: false, loading: false, error });
      },
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = () => {
    const openIdService = getOpenIdService();
    openIdService.reset();
  };

  const value: AuthContextType = {
    accessToken: accessTokenState,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
