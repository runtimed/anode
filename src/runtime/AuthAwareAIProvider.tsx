/**
 * AuthAwareAIProvider - Connects authentication tokens to the AI provider
 *
 * This component monitors authentication state and automatically updates
 * the AI provider with fresh access tokens. It ensures that AI requests
 * use the user's current authenticated session.
 */

import { useEffect } from "react";
import { useAuth } from "../auth/AuthProvider.js";

interface AuthAwareAIProviderProps {
  children: React.ReactNode;
}

export function AuthAwareAIProvider({ children }: AuthAwareAIProviderProps) {
  const auth = useAuth();

  useEffect(() => {
    // Get the global AI provider instance
    const aiProviderInstance = (globalThis as any).__AI_PROVIDER_INSTANCE__;

    if (!aiProviderInstance) {
      console.warn(
        "⚠️ AI provider instance not found - auth integration skipped"
      );
      return;
    }

    // Set the auth context on the AI provider
    aiProviderInstance.setAuthContext(auth);

    console.log("🔗 AI provider connected to auth system", {
      isAuthenticated: auth.isAuthenticated,
      hasToken: auth.isAuthenticated ? "yes" : "no",
    });
  }, [auth]);

  // Extract complex expression to avoid dependency array warning
  const authToken = auth.authState.valid ? auth.authState.token : null;

  useEffect(() => {
    // Monitor access token changes - only when authenticated
    if (auth.isAuthenticated) {
      const aiProviderInstance = (globalThis as any).__AI_PROVIDER_INSTANCE__;

      if (aiProviderInstance && authToken) {
        console.log("🔄 Auth token updated, refreshing AI provider");
        aiProviderInstance.updateAuthToken(authToken);
      }
    }
  }, [auth.isAuthenticated, authToken]);

  // This component doesn't render anything - it's just for auth integration
  return <>{children}</>;
}
