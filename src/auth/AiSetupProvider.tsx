import React, { useEffect } from "react";
import { useAuth } from "./index.js";
import { useAiApiKey } from "../hooks/useAiApiKey.js";
import { setupEarlyAiClients } from "./AiClientSetup.js";

interface AiSetupProviderProps {
  children: React.ReactNode;
}

/**
 * AI Setup Provider
 *
 * Manages AI client setup after authentication is established.
 * This component should wrap the app after AuthProvider to ensure
 * authentication is available when setting up AI clients.
 */
export function AiSetupProvider({ children }: AiSetupProviderProps) {
  const { isAuthenticated } = useAuth();
  const { apiKey, isReady: isApiKeyReady, error: apiKeyError } = useAiApiKey();

  useEffect(() => {
    if (isAuthenticated && isApiKeyReady && apiKey) {
      try {
        console.log("🚀 Setting up AI clients with dedicated API key...");
        setupEarlyAiClients({
          accessToken: apiKey,
          enableLogging: true,
        });
      } catch (error) {
        console.warn("Early AI client setup failed:", error);
      }
    }
  }, [isAuthenticated, isApiKeyReady, apiKey]);

  // Log API key errors for debugging
  useEffect(() => {
    if (apiKeyError) {
      console.warn("AI API key error:", apiKeyError);
    }
  }, [apiKeyError]);

  return <>{children}</>;
}
