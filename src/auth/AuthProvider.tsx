import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";

// Placeholder types for auth state and actions
interface AuthUser {
  id: string;
  email: string;
  name?: string;
}

interface AuthState {
  isAuthenticated: boolean;
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;
}

interface AuthContextType extends AuthState {
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  refreshToken: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  // Initial state
  const [state, setState] = useState<AuthState>({
    isAuthenticated: false,
    user: null,
    token: null,
    isLoading: true,
    error: null,
  });

  // TODO: Replace with openid-client logic and VITE_* config
  useEffect(() => {
    // Placeholder: simulate loading
    setTimeout(() => {
      setState((prev) => ({ ...prev, isLoading: false }));
    }, 500);
  }, []);

  const signIn = useCallback(async () => {
    // TODO: Implement sign-in with openid-client
    setState((prev) => ({
      ...prev,
      isAuthenticated: true,
      user: { id: "demo", email: "demo@example.com", name: "Demo User" },
      token: "demo-token",
      isLoading: false,
      error: null,
    }));
  }, []);

  const signOut = useCallback(async () => {
    // TODO: Implement sign-out with openid-client
    setState({
      isAuthenticated: false,
      user: null,
      token: null,
      isLoading: false,
      error: null,
    });
  }, []);

  const refreshToken = useCallback(async () => {
    // TODO: Implement token refresh with openid-client
    setState((prev) => ({ ...prev, token: "demo-token-refreshed" }));
  }, []);

  const value: AuthContextType = {
    ...state,
    signIn,
    signOut,
    refreshToken,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}; 
