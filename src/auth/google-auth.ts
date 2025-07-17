import Cookies from "js-cookie";

export interface GoogleAuthConfig {
  clientId: string;
  enabled: boolean;
  isLocalhost?: boolean;
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  picture?: string;
}

export interface AuthState {
  isAuthenticated: boolean;
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;
}

declare global {
  interface Window {
    google: {
      accounts: {
        id: {
          initialize: (config: any) => void;
          prompt: () => void;
          renderButton: (parent: HTMLElement, options: any) => void;
          disableAutoSelect: () => void;
        };
      };
    };
  }
}

class GoogleAuthManager {
  private config: GoogleAuthConfig;
  private currentUser: AuthUser | null = null;
  private currentToken: string | null = null;
  private tokenChangeListeners = new Set<(token: string | null) => void>();
  private refreshTimeout: NodeJS.Timeout | null = null;

  constructor(config: GoogleAuthConfig) {
    this.config = config;
  }

  async initialize(): Promise<void> {
    if (!this.config.enabled) {
      return;
    }

    return new Promise((resolve, reject) => {
      // Load Google Identity Services
      if (typeof window !== "undefined" && !window.google) {
        const script = document.createElement("script");
        script.src = "https://accounts.google.com/gsi/client";
        script.onload = () => {
          this.initGoogleIdentity().then(resolve).catch(reject);
        };
        script.onerror = reject;
        document.head.appendChild(script);
      } else if (window.google) {
        this.initGoogleIdentity().then(resolve).catch(reject);
      }
    });
  }

  private async initGoogleIdentity(): Promise<void> {
    window.google.accounts.id.initialize({
      client_id: this.config.clientId,
      callback: this.handleCredentialResponse.bind(this),
      auto_select: false,
      cancel_on_tap_outside: true,
      use_fedcm_for_prompt: false,
    });
  }

  private handleCredentialResponse(response: any): void {
    if (response.credential) {
      // Parse JWT payload to get user info
      const payload = this.parseJWT(response.credential);
      if (payload) {
        this.currentUser = {
          id: payload.sub,
          email: payload.email,
          name: payload.name,
          picture: payload.picture,
        };
        this.currentToken = response.credential;

        // Store the token in a secure cookie with proper security settings
        Cookies.set("google_auth_token", response.credential, {
          secure: location.protocol === "https:",
          sameSite: "strict",
          expires: 30, // 30 days for better UX
        });

        // Send to backend for secure HttpOnly storage only if configured
        if (shouldUseBackendCookies()) {
          fetch("/api/auth/signin", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            credentials: "include",
            body: JSON.stringify({
              authToken: response.credential,
            }),
          }).catch(console.error);
        }

        // Store user info in client-accessible cookie for UI
        Cookies.set("google_auth_user", JSON.stringify(this.currentUser), {
          secure: location.protocol === "https:",
          sameSite: "strict",
          expires: 30,
          httpOnly: false,
        });

        // Schedule token refresh check
        this.scheduleTokenRefresh(payload.exp * 1000);

        // Notify listeners of token change
        this.notifyTokenChange(response.credential);
      }
    }
  }

  private parseJWT(token: string): any {
    try {
      const base64Url = token.split(".")[1];
      const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split("")
          .map(function (c) {
            return "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2);
          })
          .join("")
      );
      return JSON.parse(jsonPayload);
    } catch (error) {
      console.error("Failed to parse JWT:", error);
      return null;
    }
  }

  async signIn(): Promise<AuthUser> {
    if (!this.config.enabled) {
      throw new Error("Google Auth is not enabled");
    }

    if (!window.google) {
      await this.initialize();
    }

    return new Promise((resolve, reject) => {
      // Set up callback for this specific sign-in attempt
      const originalCallback = this.handleCredentialResponse.bind(this);

      window.google.accounts.id.initialize({
        client_id: this.config.clientId,
        callback: (response: any) => {
          originalCallback(response);
          if (this.currentUser) {
            resolve(this.currentUser);
          } else {
            reject(
              new Error(
                "Sign in failed - please check your Google account is authorized"
              )
            );
          }
        },
        auto_select: false,
        cancel_on_tap_outside: false,
      });

      // Trigger the sign-in flow
      window.google.accounts.id.prompt();
    });
  }

  async signOut(): Promise<void> {
    if (!this.config.enabled) {
      return;
    }

    this.clearAuthState();

    if (window.google) {
      window.google.accounts.id.disableAutoSelect();
    }

    // Notify listeners of token change
    this.notifyTokenChange(null);
  }

  async getCurrentUser(): Promise<AuthUser | null> {
    if (!this.config.enabled) {
      return null;
    }

    // Check if we have a cached user
    if (this.currentUser) {
      // Check if cached user's token is still valid
      const token = this.getToken();
      if (token && this.isTokenExpiringSoon(token)) {
        // Try to refresh token silently
        const refreshed = await this.silentRefresh();
        if (!refreshed) {
          // Silent refresh failed - clear auth state
          this.clearAuthState();
          return null;
        }
      }
      return this.currentUser;
    }

    // Try to restore from cookie first (faster than parsing JWT)
    const storedUser = Cookies.get("google_auth_user");
    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        const token = this.getToken();
        if (token && !this.isTokenExpiringSoon(token)) {
          this.currentUser = parsedUser;
          this.currentToken = token;
          return this.currentUser;
        }
      } catch (error) {
        console.error("Failed to parse stored user:", error);
        Cookies.remove("google_auth_user");
      }
    }

    // Check if we have a stored token
    const token = this.getToken();
    if (token) {
      const payload = this.parseJWT(token);
      if (payload && payload.exp > Date.now() / 1000) {
        // Check if token is expiring soon
        if (this.isTokenExpiringSoon(token)) {
          // Try to refresh token silently
          const refreshed = await this.silentRefresh();
          if (!refreshed) {
            // Silent refresh failed - clear auth state
            this.clearAuthState();
            return null;
          }
          // After successful refresh, update token and payload
          const newToken = this.getToken();
          if (newToken) {
            const newPayload = this.parseJWT(newToken);
            if (newPayload) {
              this.currentUser = {
                id: newPayload.sub,
                email: newPayload.email,
                name: newPayload.name,
                picture: newPayload.picture,
              };
              this.currentToken = newToken;
              return this.currentUser;
            }
          }
        }

        this.currentUser = {
          id: payload.sub,
          email: payload.email,
          name: payload.name,
          picture: payload.picture,
        };
        this.currentToken = token;

        // Schedule proactive token refresh
        this.scheduleTokenRefresh(payload.exp * 1000);

        return this.currentUser;
      } else {
        // Token is expired, clean it up
        this.clearAuthState();
      }
    }

    return null;
  }

  getToken(): string | null {
    const token = this.currentToken || Cookies.get("google_auth_token") || null;

    // Check if token is expired or expiring soon
    if (token && this.isTokenExpiringSoon(token)) {
      this.currentToken = null;
      Cookies.remove("google_auth_token");
      Cookies.remove("google_auth_user");

      // Clear backend cookies only if configured
      if (shouldUseBackendCookies()) {
        fetch("/api/auth/signout", {
          method: "POST",
          credentials: "include",
        }).catch(console.error);
      }

      // Notify listeners that token was cleared
      this.notifyTokenChange(null);
      return null;
    }

    return token;
  }

  async refreshToken(): Promise<string | null> {
    if (!this.config.enabled || !window.google) {
      return this.getToken();
    }

    try {
      // Check if current token is still valid
      const currentToken = this.getToken();
      if (currentToken && !this.isTokenExpiringSoon(currentToken)) {
        return currentToken;
      }

      // Attempt silent refresh using Google's existing session
      const refreshed = await this.silentRefresh();
      if (refreshed) {
        return this.getToken();
      }

      // If silent refresh fails, return null to indicate need for manual sign-in
      return null;
    } catch (error) {
      console.error("Token refresh failed:", error);
      return null;
    }
  }

  private isTokenExpiringSoon(token: string): boolean {
    try {
      const payload = this.parseJWT(token);
      if (!payload || !payload.exp) {
        return true; // Treat invalid tokens as expired
      }

      // Check if token expires within 10 minutes (600 seconds) for proactive refresh
      // This gives us more time to refresh before LiveStore connection fails
      const expirationTime = payload.exp * 1000; // Convert to milliseconds
      const tenMinutesFromNow = Date.now() + 10 * 60 * 1000;

      return expirationTime <= tenMinutesFromNow;
    } catch (error) {
      console.error("Error checking token expiration:", error);
      return true; // Treat unparseable tokens as expired
    }
  }

  private scheduleTokenRefresh(expirationTime: number): void {
    // Clear any existing timeout
    if (this.refreshTimeout) {
      clearTimeout(this.refreshTimeout);
    }

    // Schedule refresh 15 minutes before expiration for LiveStore sync
    const refreshTime = expirationTime - Date.now() - 15 * 60 * 1000;

    if (refreshTime > 0) {
      this.refreshTimeout = setTimeout(async () => {
        console.log("Proactive token refresh triggered");
        const refreshed = await this.silentRefresh();
        if (refreshed) {
          console.log("Token refreshed successfully");
          // Notify listeners of token change
          this.notifyTokenChange(this.getToken());
        } else {
          console.warn("Proactive token refresh failed");
        }
      }, refreshTime);
    }
  }

  private async silentRefresh(): Promise<boolean> {
    if (!this.config.enabled || !window.google) {
      return false;
    }

    try {
      // Use a more sophisticated approach to silent refresh
      return new Promise<boolean>((resolve) => {
        const timeoutId = setTimeout(() => {
          resolve(false);
        }, 3000); // 3 second timeout

        // Store original callback
        const originalCallback = this.handleCredentialResponse.bind(this);
        let refreshAttempted = false;

        window.google.accounts.id.initialize({
          client_id: this.config.clientId,
          callback: (response: any) => {
            clearTimeout(timeoutId);
            if (response.credential && !refreshAttempted) {
              refreshAttempted = true;
              originalCallback(response);
              resolve(true);
            } else {
              resolve(false);
            }
          },
          // Key settings for silent refresh
          auto_select: true,
          cancel_on_tap_outside: true,
          itp_support: true,
        });

        // Attempt silent prompt - this should not show UI if user is already signed in
        try {
          window.google.accounts.id.prompt();
        } catch (error) {
          clearTimeout(timeoutId);
          resolve(false);
        }
      });
    } catch (error) {
      console.error("Silent refresh failed:", error);
      return false;
    }
  }

  private clearAuthState(): void {
    this.currentUser = null;
    this.currentToken = null;
    Cookies.remove("google_auth_token");
    Cookies.remove("google_auth_user");

    // Clear backend cookies only if configured
    if (shouldUseBackendCookies()) {
      fetch("/api/auth/signout", {
        method: "POST",
        credentials: "include",
      }).catch(console.error);
    }

    if (this.refreshTimeout) {
      clearTimeout(this.refreshTimeout);
      this.refreshTimeout = null;
    }
  }

  isEnabled(): boolean {
    return this.config.enabled;
  }

  renderSignInButton(element: HTMLElement): void {
    if (!this.config.enabled || !window.google) {
      return;
    }

    window.google.accounts.id.renderButton(element, {
      theme: "outline",
      size: "large",
      type: "standard",
      text: "signin_with",
      shape: "rectangular",
      logo_alignment: "left",
    });
  }

  addTokenChangeListener(callback: (token: string | null) => void): () => void {
    this.tokenChangeListeners.add(callback);
    return () => this.tokenChangeListeners.delete(callback);
  }

  private notifyTokenChange(token: string | null): void {
    this.tokenChangeListeners.forEach((callback) => callback(token));
  }
}

// Get configuration from environment variables
const getAuthConfig = (): GoogleAuthConfig => {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  const enabled = import.meta.env.VITE_GOOGLE_AUTH_ENABLED === "true";

  return {
    clientId: clientId || "",
    enabled: enabled && !!clientId,
  };
};

// Check if we should use backend cookie auth (production) or client-side (development)
const shouldUseBackendCookies = (): boolean => {
  const useCookieAuth = import.meta.env.VITE_USE_COOKIE_AUTH === "true";
  const isProduction = import.meta.env.PROD;

  // Use backend cookies in production or if explicitly enabled
  return isProduction || useCookieAuth;
};

// Create singleton instance
export const googleAuthManager = new GoogleAuthManager(getAuthConfig());

// Helper function to get fallback auth token for local development
export const getFallbackAuthToken = (): string => {
  return import.meta.env.VITE_AUTH_TOKEN || "insecure-token-change-me";
};

// Get the current auth token (Google or fallback)
export const getCurrentAuthToken = (): string => {
  const googleToken = googleAuthManager.getToken();
  if (googleToken && googleAuthManager.isEnabled()) {
    return googleToken;
  }
  return getFallbackAuthToken();
};

// Check if the current auth state is valid
export const isAuthStateValid = async (): Promise<boolean> => {
  if (!googleAuthManager.isEnabled()) {
    return true; // Always valid in fallback mode
  }

  const user = await googleAuthManager.getCurrentUser();
  const token = googleAuthManager.getToken();

  return !!(user && token);
};

// Initialize auth state on app startup
export const initializeAuth = async (): Promise<void> => {
  if (googleAuthManager.isEnabled()) {
    await googleAuthManager.initialize();
    // Try to restore existing session
    await googleAuthManager.getCurrentUser();
  }
};

// Authentication event listeners helper
export const addAuthTokenListener = (
  callback: (token: string | null) => void
): (() => void) => {
  return googleAuthManager.addTokenChangeListener(callback);
};
