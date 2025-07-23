import React, { createContext, useContext, useEffect, useState } from 'react';
import { getOpenIdService } from '../../services/openid';

interface AuthUser {
  id: string;
  email: string;
  name: string;
  picture?: string;
}

type AccessTokenState =
  | { valid: true; token: string; user: AuthUser }
  | { valid: false; loading: boolean; error?: Error };

interface AuthContextType {
  accessToken: AccessTokenState;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [accessTokenState, setAccessTokenState] = useState<AccessTokenState>({
    valid: false,
    loading: true
  });

  useEffect(() => {
    // Check if we're in local mode (no auth client ID)
    const isLocalMode = !import.meta.env.VITE_AUTH_CLIENT_ID;

    if (isLocalMode) {
      // Local development mode - use fallback token
      const dummyUser: AuthUser = {
        id: "local-dev-user",
        email: "local@example.com",
        name: "Local Development User",
        picture: undefined,
      };
      setAccessTokenState({
        valid: true,
        token: "insecure-token-change-me",
        user: dummyUser
      });
      return;
    }

    // OpenID mode - use the service
    const openIdService = getOpenIdService();
    const subscription = openIdService.getAccessToken().subscribe({
      next: (token) => {
        if (token) {
          // TODO: Replace with actual user data from OpenID service
          const dummyUser: AuthUser = {
            id: "local-dev-user",
            email: "local@example.com",
            name: "Local Development User",
            picture: undefined,
          };
          setAccessTokenState({ valid: true, token, user: dummyUser });
        } else {
          setAccessTokenState({ valid: false, loading: false });
        }
      },
      error: (error) => {
        console.error('Error getting access token:', error);
        setAccessTokenState({ valid: false, loading: false, error });
      }
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

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
} 
