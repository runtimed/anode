import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { getOpenIdManager } from "./openid-manager";

// Placeholder types for auth state and actions
interface AuthUser {
  id: string;
  email: string;
  name?: string;
  picture?: string;
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
  register: () => Promise<void>;
  handleRedirect: (url: URL) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const openidManager = getOpenIdManager();

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [state, setState] = useState<AuthState>({
    isAuthenticated: false,
    user: null,
    token: null,
    isLoading: true,
    error: null,
  });

  // On mount, check for existing session and fetch user info
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setState((prev) => ({ ...prev, isLoading: true }));
      try {
        const token = await openidManager.getAccessToken();
        if (token) {
          const userInfo = await openidManager.getUserInfo();
          if (!cancelled) {
            setState({
              isAuthenticated: true,
              user: {
                id: userInfo.sub || userInfo.id || "unknown",
                email: userInfo.email || "",
                name: userInfo.name,
                picture: userInfo.picture,
              },
              token,
              isLoading: false,
              error: null,
            });
          }
        } else {
          if (!cancelled) setState((prev) => ({ ...prev, isLoading: false }));
        }
      } catch (error: any) {
        if (!cancelled) setState((prev) => ({ ...prev, isLoading: false, error: error.message || String(error) }));
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const signIn = useCallback(async () => {
    try {
      const url = await openidManager.getAuthorizationUrl("login");
      window.location.href = url.toString();
    } catch (error: any) {
      setState((prev) => ({ ...prev, error: error.message || String(error) }));
    }
  }, []);

  const register = useCallback(async () => {
    try {
      const url = await openidManager.getAuthorizationUrl("registration");
      window.location.href = url.toString();
    } catch (error: any) {
      setState((prev) => ({ ...prev, error: error.message || String(error) }));
    }
  }, []);

  const signOut = useCallback(async () => {
    try {
      await openidManager.logout();
      setState({
        isAuthenticated: false,
        user: null,
        token: null,
        isLoading: false,
        error: null,
      });
    } catch (error: any) {
      setState((prev) => ({ ...prev, error: error.message || String(error) }));
    }
  }, []);

  const refreshToken = useCallback(async () => {
    try {
      const token = await openidManager.getAccessToken();
      setState((prev) => ({ ...prev, token }));
    } catch (error: any) {
      setState((prev) => ({ ...prev, error: error.message || String(error) }));
    }
  }, []);

  const handleRedirect = useCallback(async (url: URL) => {
    setState((prev) => ({ ...prev, isLoading: true }));
    try {
      await openidManager.handleRedirectResponse(url);
      const token = await openidManager.getAccessToken();
      const userInfo = await openidManager.getUserInfo();
      setState({
        isAuthenticated: true,
        user: {
          id: userInfo.sub || userInfo.id || "unknown",
          email: userInfo.email || "",
          name: userInfo.name,
          picture: userInfo.picture,
        },
        token,
        isLoading: false,
        error: null,
      });
    } catch (error: any) {
      setState((prev) => ({ ...prev, isLoading: false, error: error.message || String(error) }));
    }
  }, []);

  const value: AuthContextType = {
    ...state,
    signIn,
    signOut,
    refreshToken,
    register,
    handleRedirect,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}; 
