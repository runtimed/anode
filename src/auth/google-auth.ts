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
    const isLocalhost =
      window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1";

    if (isLocalhost) {
      console.warn(
        "Google OAuth on localhost may have restrictions. Consider using production URL for testing."
      );
    }

    window.google.accounts.id.initialize({
      client_id: this.config.clientId,
      callback: this.handleCredentialResponse.bind(this),
      auto_select: false,
      cancel_on_tap_outside: true,
      // Prevent automatic popups that cause mobile omnibar issues
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

        // Store the token in a secure cookie with longer expiration
        Cookies.set("google_auth_token", response.credential, {
          secure: location.protocol === "https:",
          sameSite: "strict",
          expires: 30, // 30 days for better UX
        });

        // Store user info in localStorage for faster access
        localStorage.setItem(
          "google_auth_user",
          JSON.stringify(this.currentUser)
        );

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

      // Add error handling for common localhost issues
      const isLocalhost =
        window.location.hostname === "localhost" ||
        window.location.hostname === "127.0.0.1";

      if (isLocalhost) {
        console.warn(
          "Running on localhost - Google OAuth may have domain restrictions"
        );
      }

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
        // For localhost, be more lenient - don't try to refresh
        const isLocalhost =
          window.location.hostname === "localhost" ||
          window.location.hostname === "127.0.0.1";

        if (isLocalhost) {
          console.log(
            "Token expiring on localhost, but allowing continued use"
          );
          return this.currentUser;
        }

        // Try to refresh token before giving up (production only)
        const refreshed = await this.silentRefresh();
        if (!refreshed) {
          this.clearAuthState();
          return null;
        }
      }
      return this.currentUser;
    }

    // Try to restore from localStorage first (faster than parsing JWT)
    const storedUser = localStorage.getItem("google_auth_user");
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
        localStorage.removeItem("google_auth_user");
      }
    }

    // Check if we have a stored token
    const token = this.getToken();
    if (token) {
      const payload = this.parseJWT(token);
      if (payload && payload.exp > Date.now() / 1000) {
        // Check if token is expiring soon
        if (this.isTokenExpiringSoon(token)) {
          // Try to refresh token
          const refreshed = await this.silentRefresh();
          if (!refreshed) {
            this.clearAuthState();
            return null;
          }
          // After refresh, get the updated token payload
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

        // Schedule token refresh
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

      // Notify listeners that token was cleared
      this.notifyTokenChange(null);
      return null;
    }

    return token;
  }

  async refreshToken(): Promise<string | null> {
    // Check if we're on localhost - if so, just return current token
    const isLocalhost =
      window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1";

    if (isLocalhost && this.currentToken) {
      console.log("Skipping token refresh on localhost");
      return this.currentToken;
    }

    // Attempt silent refresh for production
    const refreshed = await this.silentRefresh();
    return refreshed ? this.getToken() : null;
  }

  private isTokenExpiringSoon(token: string): boolean {
    try {
      const payload = this.parseJWT(token);
      if (!payload || !payload.exp) {
        return true; // Treat invalid tokens as expired
      }

      // Check if token expires within 5 minutes (300 seconds) for proactive refresh
      const expirationTime = payload.exp * 1000; // Convert to milliseconds
      const fiveMinutesFromNow = Date.now() + 5 * 60 * 1000;

      const isExpiring = expirationTime <= fiveMinutesFromNow;

      // For localhost development, be more lenient with expiration
      const isLocalhost =
        window.location.hostname === "localhost" ||
        window.location.hostname === "127.0.0.1";

      if (isLocalhost && !isExpiring) {
        // On localhost, only treat as expiring if actually expired (not just soon)
        const isActuallyExpired = expirationTime <= Date.now();
        return isActuallyExpired;
      }

      return isExpiring;
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

    // Schedule refresh 10 minutes before expiration
    const refreshTime = expirationTime - Date.now() - 10 * 60 * 1000;

    if (refreshTime > 0) {
      this.refreshTimeout = setTimeout(() => {
        this.silentRefresh().catch(console.error);
      }, refreshTime);
    }
  }

  private async silentRefresh(): Promise<boolean> {
    if (!this.config.enabled || !window.google) {
      return false;
    }

    try {
      // Check if we're in localhost development mode
      const isLocalhost =
        window.location.hostname === "localhost" ||
        window.location.hostname === "127.0.0.1";

      // For localhost, skip the refresh popup entirely
      if (isLocalhost) {
        console.log(
          "Skipping silent refresh on localhost - using existing token"
        );
        // Just return true if we have any token, don't check expiration strictly
        return !!this.currentToken;
      }

      // For production, check if current token is still valid before attempting refresh
      if (this.currentToken && !this.isTokenExpiringSoon(this.currentToken)) {
        console.log("Current token is still valid, skipping refresh");
        return true;
      }

      // Only attempt silent refresh if token is actually expiring
      console.log("Attempting silent token refresh...");

      // Don't use Google's prompt mechanism as it causes popups
      // Instead, just validate the current token is still usable
      const payload = this.currentToken
        ? this.parseJWT(this.currentToken)
        : null;
      if (payload && payload.exp > Date.now() / 1000) {
        return true;
      }

      return false;
    } catch (error) {
      console.error("Silent refresh failed:", error);
      return false;
    }
  }

  private clearAuthState(): void {
    this.currentUser = null;
    this.currentToken = null;
    Cookies.remove("google_auth_token");
    localStorage.removeItem("google_auth_user");

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

  // For localhost development, be more permissive
  const isLocalhost =
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1";

  return {
    clientId: clientId || "",
    enabled: enabled && !!clientId,
    isLocalhost,
  };
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

  // For localhost development, provide a warning about using fallback
  const isLocalhost =
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1";

  if (isLocalhost) {
    console.warn(
      "Using fallback auth token for localhost development. For production testing, configure Google OAuth properly."
    );
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

  // For localhost, be more lenient with validation
  const isLocalhost =
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1";

  if (isLocalhost && !user) {
    console.warn(
      "Google auth failed on localhost - this is common due to domain restrictions. Consider using production URL for testing."
    );
    // Return true to allow fallback to continue working
    return true;
  }

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
